# DeatAnimation render PC: renders the video named in pc\job.json on the graphics card, checks and encodes it, copies it
# to Google Drive, then (by default) shuts the PC down. Run through RENDER.bat. ASCII only (Windows PowerShell 5.1).
param([int]$Choice = 1)      # 1 = shut down when finished (RENDER.bat asks; yes after 20 s), 2 = stay on
$pc = $PSScriptRoot
$repo = Split-Path -Parent $pc
$studio = Join-Path $repo 'studio'
. (Join-Path $pc 'common.ps1')
New-Item -ItemType Directory -Force -Path (Join-Path $studio 'out') | Out-Null
$log = Join-Path $studio 'out\pc_render_log.txt'
Start-Log $log 'DeatAnimation render'
RefreshPath
$t0 = Get-Date
$ok = $false; $name = 'render'; $cover = $null

try {
  Set-Location $repo
  Say '== 1/6 Latest version from GitHub'
  if ((Run 'git' @('pull', '--ff-only')) -ne 0) { Say 'WARNING: could not update, rendering the version already on this PC' }
  Say ('version ' + ((& git log -1 --format='%h %s') | Select-Object -First 1))
  $job = Get-Content -Raw (Join-Path $pc 'job.json') | ConvertFrom-Json
  $ep = $job.ep; $name = $job.name; $cover = $job.cover; $workers = [int]$job.workers
  Say ('video: ' + $name + ' (' + $ep + '), ' + $workers + ' workers. ' + $job.note)
  Set-Location $studio
  $null = Run 'npm' @('install', '--no-audit', '--no-fund')
  if ((Ensure-Models $studio $pc) -ne 0) { throw 'the 3D people download failed' }

  Set-Location $repo
  Say '== 2/6 Soundtrack'
  $wav = 'studio/out/' + $ep + '_phone.wav'
  if ((Run 'py' @('-3', ('studio/audio/' + $ep + '.py'), $wav)) -ne 0) { throw 'the soundtrack failed' }
  $dur = [double]((& ffprobe -v error -show_entries format=duration -of csv=p=0 $wav) | Select-Object -First 1)
  $nf = [int][Math]::Round($dur * 30)

  Say ('== 3/6 Rendering ' + $nf + ' frames on the graphics card')
  $frames = 'studio/out/frames_' + $ep
  if (Test-Path -LiteralPath $frames) { Remove-Item -Recurse -Force -LiteralPath $frames }
  $tr = Get-Date
  if ((Run 'node' @('studio/tools/renderall.mjs', '--ep', $ep, '--out', $frames, '--workers', [string]$workers, '--gpu')) -ne 0) { throw 'the render failed' }
  $rmin = ((Get-Date) - $tr).TotalMinutes
  Say ('render: ' + [Math]::Round($rmin, 1) + ' min, ' + [Math]::Round($rmin * 60 / $nf, 2) + ' s per frame')

  Say '== 4/6 Checking every frame'
  if ((Run 'py' @('-3', 'studio/tools/checkframes.py', $frames, [string]$nf)) -ne 0) { throw 'some frames are missing or broken' }

  Say '== 5/6 Encoding (HQ + phone), sound check, flicker check'
  $null = Run $bash @('studio/encode.sh', $frames, $wav, ('videos/' + $name))
  if (-not (Test-Path -LiteralPath ('videos/' + $name + '_phone.mp4'))) { throw 'the encoding failed' }

  Say '== 6/6 Contact sheet (1 frame per second, for the review)'
  $null = Run 'py' @('-3', 'studio/tools/sheet1fps.py', $frames, ('studio/out/' + $name + '_sheet.jpg'))
  $ok = $true
} catch {
  Say ('RENDER STOPPED: ' + $_)
} finally {
  Set-Location $repo
  Say ('total ' + [Math]::Round(((Get-Date) - $t0).TotalMinutes, 1) + ' min. ' + $(if ($ok) { 'VIDEO READY' } else { 'NO VIDEO: send the log in the chat' }))
  $drive = Find-GoogleDrive
  if ($drive) {
    $dest = Join-Path $drive 'DeatAnimation'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $mb = 0
    foreach ($f in @(('videos/' + $name + '_phone.mp4'), $cover, ('studio/out/' + $name + '_sheet.jpg'), ('videos/' + $name + '_flicker.txt'))) {
      if ($f -and (Test-Path -LiteralPath $f)) { Copy-Item -Force -LiteralPath $f -Destination $dest; $mb += (Get-Item -LiteralPath $f).Length / 1MB; Say ('copied to Google Drive: ' + $f) }
    }
    Copy-Item -Force -LiteralPath $log -Destination (Join-Path $dest ($name + '_log.txt'))
    $wait = [int](60 + 3 * $mb)                 # Google Drive needs the PC on until the upload is done
    Say ('waiting ' + $wait + ' s for Google Drive to upload')
    Start-Sleep -Seconds $wait
  } else {
    Say 'Google Drive not found: the video is in the videos folder of the project'
  }
  if ($Choice -eq 1) {
    Say 'shutting down in 60 s (to cancel: open a terminal and type  shutdown /a)'
    & shutdown.exe /s /t 60 /c 'DeatAnimation: the video is in Google Drive. Shutting down in 60 s (cancel: shutdown /a).'
  }
}
