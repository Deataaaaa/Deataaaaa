# DeatAnimation Render Engine v3: renders the video(s) named in pc\job.json on the graphics card, checks and encodes them,
# leaves it in the videos folder and (if asked) shuts the PC down. Run through RENDER.bat.
# Program output goes to studio\out\pc_render_log.txt; the window shows the stages, a live progress bar and the
# GPU/CPU usage. ASCII only (Windows PowerShell 5.1): the block characters are made at run time.
$pc = $PSScriptRoot
$repo = Split-Path -Parent $pc
$studio = Join-Path $repo 'studio'
. (Join-Path $pc 'common.ps1')
. (Join-Path $pc 'ui.ps1')
Load-Theme (Join-Path $pc 'theme.json')
$script:Quiet = $true
Remove-Item Env:\NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue   # set on this PC by another program: node warned about it
try { $Host.UI.RawUI.WindowTitle = 'DeatAnimation Render Engine v3' } catch {}
# a click in the window (QuickEdit) froze the whole render until a key was pressed (owner, 31 Oct 2026): switch QuickEdit off
try {
  Add-Type -Namespace DA -Name Con -MemberDefinition '[DllImport("kernel32.dll")] public static extern System.IntPtr GetStdHandle(int h); [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(System.IntPtr h, out uint m); [DllImport("kernel32.dll")] public static extern bool SetConsoleMode(System.IntPtr h, uint m);'
  $hIn = [DA.Con]::GetStdHandle(-10); $cm = [uint32]0
  if ([DA.Con]::GetConsoleMode($hIn, [ref]$cm)) { $null = [DA.Con]::SetConsoleMode($hIn, (($cm -band (-bnot [uint32]0x0040)) -bor [uint32]0x0080)) }
} catch {}
RefreshPath
$VERSION = '3.0'
$BLK = [string][char]0x2588; $SHD = [string][char]0x2591            # full block, light shade (PowerShell names ignore case: no $f/$e)
$out = Join-Path $studio 'out'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$log = Join-Path $out 'pc_render_log.txt'
Start-Log $log ('DeatAnimation Render Engine ' + $VERSION)

# ---------- console helpers ----------
function W([string]$t, [string]$c = 'Gray') { Write-Host $t -NoNewline -ForegroundColor $c }
function WL([string]$t = '', [string]$c = 'Gray') { Write-Host $t -ForegroundColor $c }
function Bar([double]$f, [int]$w) { $f = [Math]::Max(0.0, [Math]::Min(1.0, $f)); $n = [int][Math]::Round($f * $w); return ($BLK * $n) + ($SHD * ($w - $n)) }
function Stage([string]$num, [string]$name) { $script:SN = $num; $script:SNm = $name; $script:ST0 = Get-Date; Stage-Head $num $name; Log ('[' + $num + '] ' + $name) }
function Done([string]$state, [string]$detail) { Stage-Line $script:SN $script:SNm $state $detail ((Get-Date) - $script:ST0).TotalSeconds; Log ('  ' + $state + ' ' + $detail) }
# a stage whose program runs in the background with a spinner (instead of Run): same exit code and $script:LastOut
function RunStage([string]$exe, [string[]]$argv) { Out-Raw "`r"; return (Run-Live $exe $argv $script:SN $script:SNm $repo) }
function Tail([int]$n) { if ($script:LastOut) { $script:LastOut | Select-Object -Last $n | ForEach-Object { WL ('        ' + $_) 'DarkRed' } } }
function Mmss([double]$s) { if ($s -lt 0 -or [double]::IsNaN($s) -or [double]::IsInfinity($s)) { return '--:--' }; $s = [int][Math]::Round($s); return ('{0}:{1:00}' -f [int][Math]::Floor($s / 60), ($s % 60)) }
function Size([double]$b) { if ($b -ge 1GB) { return ('{0:0.0} GB' -f ($b / 1GB)) }; return ('{0:0} MB' -f ($b / 1MB)) }
function Ask-YesNo([string]$q, [bool]$default, [int]$secs) {
  $end = (Get-Date).AddSeconds($secs); $ans = $default
  $dt = 'no'; if ($default) { $dt = 'yes' }
  while ((Get-Date) -lt $end) {
    $left = [int][Math]::Ceiling(($end - (Get-Date)).TotalSeconds)
    W ("`r  " + $q + ' [Y/N]  (' + $dt + ' in ' + $left + ' s)  ') 'White'
    if (Key-Available) { $k = Read-Key; if ($k.Key -eq 'Y') { $ans = $true; break }; if ($k.Key -eq 'N') { $ans = $false; break } }
    Start-Sleep -Milliseconds 100
  }
  $at = 'NO'; if ($ans) { $at = 'YES' }
  WL ("`r  " + $q + ' ' + $at + (' ' * 26)) 'White'
  return $ans
}
# GPU 3D-engine use (like Task Manager), CPU, VRAM and RAM, from WMI classes whose names are not translated
function Get-Usage {
  $u = @{ gpu = -1.0; cpu = -1.0; vram = -1.0; ram = -1.0; ramT = -1.0 }
  try { $s = 0.0; foreach ($e in @(Get-CimInstance -ClassName Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -Filter "Name LIKE '%engtype_3D%'" -ErrorAction Stop)) { $s += [double]$e.UtilizationPercentage }; $u.gpu = [Math]::Min(100.0, $s) } catch {}
  try { $s = 0.0; foreach ($e in @(Get-CimInstance -ClassName Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory -ErrorAction Stop)) { $s += [double]$e.DedicatedUsage }; $u.vram = $s / 1GB } catch {}
  try { $c = Get-CimInstance -ClassName Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -ErrorAction Stop; $u.cpu = [double]$c.PercentProcessorTime } catch {}
  try { $o = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop; $u.ramT = $o.TotalVisibleMemorySize / 1MB; $u.ram = ($o.TotalVisibleMemorySize - $o.FreePhysicalMemory) / 1MB } catch {}
  return $u
}
function Pct([double]$v) { if ($v -lt 0) { return ' n/a' }; return ('{0,3:0}%' -f $v) }
function Banner([string]$gpu) {
  Show-Banner 'DEAT' ('A N I M A T I O N   //   render engine v' + $VERSION) 'V3'
  $cpu = 'unknown'; try { $cpu = (@(Get-CimInstance Win32_Processor)[0].Name).Trim() } catch {}
  $ram = ''; try { $o = Get-CimInstance Win32_OperatingSystem; $ram = ('{0:0} GB' -f ($o.TotalVisibleMemorySize / 1MB)); $os = $o.Caption } catch { $os = 'Windows' }
  $enc = 'x264 (processor)'; try { if ((& ffmpeg -hide_banner -encoders 2>$null | Out-String) -match 'h264_amf') { $enc = 'h264_amf (graphics card) + parallel segments' } } catch {}
  $nv = ''; try { $nv = (& node --version 2>$null | Select-Object -First 1) } catch {}
  $cores = [Environment]::ProcessorCount
  $pairs = @(@('user', ($env:USERNAME + '@' + $env:COMPUTERNAME)), @('-', ''), @('os', $os), @('cpu', ($cpu + '  (' + $cores + ' threads)')), @('gpu', $gpu), @('ram', $ram),
    @('encoder', $enc), @('node', $nv), @('theme', ([string]$script:CFG.theme + '  (pc\theme.json)')))
  if ($script:CFG.sysinfo) { Show-Panel $pairs } else { WL ('   gpu  ' + $gpu) 'Gray' }
}

$t0 = Get-Date
$ok = $false; $shut = $false; $name = 'render'; $phone = $null; $warn = @()
try {
  $gpuName = 'unknown graphics card'
  try { $vc = @(Get-CimInstance Win32_VideoController); $best = @($vc | Where-Object { $_.Name -match 'AMD|Radeon|NVIDIA|GeForce|Arc' }); if ($best.Count) { $gpuName = $best[0].Name } elseif ($vc.Count) { $gpuName = $vc[0].Name } } catch {}
  Start-Trail $pc
  Banner $gpuName
  Set-Location $repo
  $job = Get-Content -Raw (Join-Path $pc 'job.json') | ConvertFrom-Json
  $jobs = @($job); if ($job.queue) { $jobs = @($job.queue) }                  # job.json: one video, or { "queue": [ ... ] }
  foreach ($j in $jobs) { W '   job      ' 'DarkGray'; WL ($j.name + ' (' + $j.ep + ')  ' + $j.note) 'Gray' }
  WL
  $shut = Ask-YesNo 'Shut the PC down when the video is ready?' $true 20
  WL

  # 1. latest version (always: whatever files are lying around)
  # RENDER.bat already pulled the latest version before this script started (so a new engine runs at once): just report it
  Stage '1/8' 'Update'
  $head = ((& git log -1 --format='%h %s') | Select-Object -First 1)
  if ($env:DA_UPDATE -eq 'ok') { Done 'OK' $head }
  else {
    $null = RunStage 'git' @('fetch', 'origin', 'claude/whatif-reels')
    if ((Run 'git' @('reset', '--hard', 'origin/claude/whatif-reels')) -ne 0) { Done 'WARN' 'could not update: rendering the version already here'; $warn += 'not updated' }
    else { Done 'OK' (((& git log -1 --format='%h %s') | Select-Object -First 1) + '  (engine updates take effect next run)') }
  }
  $job = Get-Content -Raw (Join-Path $pc 'job.json') | ConvertFrom-Json     # the job may have changed with the update
  $jobs = @($job); if ($job.queue) { $jobs = @($job.queue) }

  # 2. clean up: last runs' videos (the covers are kept: they are part of the project), frames, soundtracks, sheets
  Stage '2/8' 'Clean up'
  $freed = 0.0; $nDel = 0
  foreach ($f in @(Get-ChildItem -LiteralPath (Join-Path $repo 'videos') -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -eq '.mp4' -or $_.Extension -eq '.txt' -or $_.Extension -eq '.mov' })) {
    $freed += $f.Length; $nDel++; Remove-Item -Force -LiteralPath $f.FullName -ErrorAction SilentlyContinue
  }
  foreach ($d in @(Get-ChildItem -LiteralPath $out -ErrorAction SilentlyContinue)) {
    if ($d.FullName -eq $log) { continue }
    if ($d.PSIsContainer) { $m = (Get-ChildItem -LiteralPath $d.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($m) { $freed += $m } } else { $freed += $d.Length }
    Remove-Item -Recurse -Force -LiteralPath $d.FullName -ErrorAction SilentlyContinue; $nDel++
  }
  Done 'OK' ('freed ' + (Size $freed) + ' (' + $nDel + ' old files and folders)')

  # 3. renderer packages and 3D people
  Stage '3/8' 'Assets'
  $lockA = Join-Path $studio 'package-lock.json'; $lockB = Join-Path $studio 'node_modules\.package-lock.json'
  if (-not (Test-Path -LiteralPath $lockB) -or (Get-Item -LiteralPath $lockA).LastWriteTime -gt (Get-Item -LiteralPath $lockB).LastWriteTime) {
    Set-Location $studio; $null = Run 'npm' @('install', '--no-audit', '--no-fund'); Set-Location $repo
  }
  if ((Ensure-Models $studio $pc) -ne 0) { Done 'FAIL' 'the 3D people download failed'; Tail 12; throw 'assets' }
  Set-Location $repo
  Done 'OK' ('3D people ready (' + @(Get-ChildItem -Directory (Join-Path $studio 'engine\models\rocketbox') -ErrorAction SilentlyContinue).Count + ')')

  $ready = New-Object System.Collections.ArrayList; $k = 0
  foreach ($j in $jobs) {
    $k++; $ep = $j.ep; $name = $j.name; $workers = [int]$j.workers
    if ($jobs.Count -gt 1) { WL; WL ('  VIDEO ' + $k + '/' + $jobs.Count + ': ' + $name + ' (' + $ep + ')') 'White'; Log ('VIDEO ' + $k + '/' + $jobs.Count + ': ' + $name) }
    try {
      # 4. soundtrack
      Stage '4/8' 'Soundtrack'
      $wav = 'studio/out/' + $ep + '_phone.wav'
      if ((RunStage 'py' @('-3', ('studio/audio/' + $ep + '.py'), $wav)) -ne 0) { Done 'FAIL' 'the soundtrack failed'; Tail 12; throw 'soundtrack' }
      $dur = [double]((& ffprobe -v error -show_entries format=duration -of csv=p=0 $wav) | Select-Object -First 1)
      $nf = [int][Math]::Round($dur * 30)
      Done 'OK' (('{0:0.0} s, ' -f $dur) + $nf + ' frames')

      # 5. render: the workers run in the background (their output in a log), the window shows the progress
      Stage '5/8' 'Render'
      WL (' ' + $workers + ' workers to start, more while the graphics card has room (up to 100%)') 'DarkGray'
      $frames = Join-Path $out ('frames_' + $ep)
      $wlog = Join-Path $out 'render_workers_log.txt'; $werr = Join-Path $out 'render_workers_err.txt'
      $tr = Get-Date
      $p = Start-Process -FilePath 'node' -ArgumentList @('studio/tools/renderall.mjs', '--ep', $ep, '--out', ('studio/out/frames_' + $ep), '--workers', [string]$workers, '--gpu') -WorkingDirectory $repo -NoNewWindow -PassThru -RedirectStandardOutput $wlog -RedirectStandardError $werr
      $null = $p.Handle                                   # keeps the exit code readable after the process ends
      $row = [Console]::CursorTop; $live = $true
      try { [Console]::SetCursorPosition(0, $row) } catch { $live = $false }
      $hist = New-Object System.Collections.ArrayList; $fpsH = New-Object System.Collections.ArrayList; $gpuH = New-Object System.Collections.ArrayList; $cpuH = New-Object System.Collections.ArrayList; $u = Get-Usage; $lastU = Get-Date; $spin = '|/-\'; $tick = 0; $lastPct = -10; $renderer = ''
      while (-not $p.HasExited) {
        $n = 0; if (Test-Path -LiteralPath $frames) { $n = [IO.Directory]::GetFiles($frames, 'f_*.jpg').Length }
        $now = Get-Date; [void]$hist.Add(@($now, $n)); while ($hist.Count -gt 2 -and ($now - $hist[0][0]).TotalSeconds -gt 15) { $hist.RemoveAt(0) }
        $span = ($now - $hist[0][0]).TotalSeconds; $fps = 0.0; if ($span -gt 0.5) { $fps = ($n - $hist[0][1]) / $span }
        $eta = -1.0; if ($fps -gt 0.05) { $eta = ($nf - $n) / $fps }
        if (($now - $lastU).TotalSeconds -ge 3) { $u = Get-Usage; $lastU = Get-Date }
        if (-not $renderer -and (Test-Path -LiteralPath $wlog)) { $r = Select-String -LiteralPath $wlog -Pattern 'renderer: (.*)$' -List -ErrorAction SilentlyContinue; if ($r) { $renderer = $r.Matches[0].Groups[1].Value } }
        $f = 0.0; if ($nf -gt 0) { $f = $n / $nf }
        if ($live) {
          [Console]::SetCursorPosition(0, $row)
          if ($n -eq 0) { Out-Raw ('        ' + (C $script:SPIN[$tick % $script:SPIN.Count] $script:T.b) + (C '  starting the workers (loading the scene, people and shaders)...'.PadRight(80) $script:T.dim)); [Console]::WriteLine() }
          else {
            [void]$fpsH.Add($fps); [void]$gpuH.Add([Math]::Max(0, $u.gpu)); [void]$cpuH.Add([Math]::Max(0, $u.cpu))
            Out-Raw ('        ' + (UiBar $f ([int]$script:CFG.width)) + (C ('  {0,5:0.0}%' -f ($f * 100)) $script:T.text) + (C ('   {0,4}/{1}   ETA {2}' -f $n, $nf, (Mmss $eta)).PadRight(30) $script:T.dim)); [Console]::WriteLine()
          }
          $vr = 'n/a'; if ($u.vram -ge 0) { $vr = ('{0:0.0} GB' -f $u.vram) }
          $rm = 'n/a'; if ($u.ram -ge 0) { $rm = ('{0:0.0}/{1:0} GB' -f $u.ram, $u.ramT) }
          Out-Raw ('        ' + (C 'fps ' $script:T.dim) + (Sparkline $fpsH 16 0) + (C (' {0,5:0.0}' -f $fps) $script:T.text) + (C '   gpu ' $script:T.dim) + (Sparkline $gpuH 12 100) + (C (Pct $u.gpu) $script:T.text) + (C '   cpu ' $script:T.dim) + (Sparkline $cpuH 12 100) + (C (Pct $u.cpu) $script:T.text) + (C ('   vram ' + $vr + '  ram ' + $rm).PadRight(34) $script:T.dim)); [Console]::WriteLine()
        } elseif ([int]($f * 10) -gt $lastPct) { $lastPct = [int]($f * 10); WL ('        ' + (Bar $f 30) + ('  {0,3:0}%  ETA {1}' -f ($f * 100), (Mmss $eta))) 'Gray' }
        $tick++; Start-Sleep -Milliseconds 500
      }
      $p.WaitForExit(); $code = $p.ExitCode
      if ($live) { [Console]::SetCursorPosition(0, $row + 2) }
      foreach ($l in @(Get-Content -LiteralPath $wlog -ErrorAction SilentlyContinue) + @(Get-Content -LiteralPath $werr -ErrorAction SilentlyContinue)) { Log $l }
      $rmin = ((Get-Date) - $tr).TotalMinutes
      $n = 0; if (Test-Path -LiteralPath $frames) { $n = [IO.Directory]::GetFiles($frames, 'f_*.jpg').Length }
      Out-Raw ('        ' + (UiBar ($n / [Math]::Max(1, $nf)) ([int]$script:CFG.width)) + (C ('  ' + $n + ' frames in ' + (Mmss ($rmin * 60)) + (' ({0:0.0} fps)' -f ($n / [Math]::Max(1, $rmin * 60)))) $script:T.text)); [Console]::WriteLine()
      if ($renderer) { WL ('        ' + $renderer) 'DarkGray' }
      if ($code -ne 0 -or $n -lt $nf) {
        WL '        RENDER FAILED. Last lines of the workers:' 'Red'
        Get-Content -LiteralPath $wlog -Tail 14 -ErrorAction SilentlyContinue | ForEach-Object { WL ('        ' + $_) 'DarkRed' }
        throw 'render'
      }

      # 6. every frame exists, decodes, and has no black hole (a NaN blurred by the bloom)
      Stage '6/8' 'Check frames'
      $c6 = RunStage 'py' @('-3', 'studio/tools/checkframes.py', ('studio/out/frames_' + $ep), [string]$nf)
      $black = @($script:LastOut | Where-Object { $_ -match '^BLACK AREAS' })
      if ($c6 -ne 0) { Done 'FAIL' 'some frames are missing or broken'; Tail 6; throw 'frames' }
      if ($black.Count) { Done 'WARN' $black[0]; $warn += 'black areas' } else { Done 'OK' ($nf.ToString() + ' frames, no black areas') }

      # 7. encode (HQ + phone), sound check, flicker check
      Stage '7/8' 'Encode'
      $c7 = RunStage $bash @('studio/encode.sh', ('studio/out/frames_' + $ep), $wav, ('videos/' + $name))
      $phone = Join-Path $repo ('videos\' + $name + '_phone.mp4')
      if (-not (Test-Path -LiteralPath $phone)) { Done 'FAIL' 'the encoding failed'; Tail 12; throw 'encode' }
      $lufs = ''; $pl = @($script:LastOut | Where-Object { $_ -match '^OK .*_phone\.mp4' }) | Select-Object -First 1
      if ($pl -match '(-?[\d.]+) LUFS') { $lufs = '  ' + $Matches[1] + ' LUFS' }
      $encd = @($script:LastOut | Where-Object { $_ -match '^ENCODER ' }) | Select-Object -First 1; $how = ''; if ($encd -match 'ENCODER amf\s+(.*)$') { $how = '  (graphics card, ' + $Matches[1] + ')' } elseif ($encd -match 'ENCODER x264\s+(.*)$') { $how = '  (processor, ' + $Matches[1] + ')' }
      if ($c7 -ne 0) { Done 'WARN' ('sound check: ' + (@($script:LastOut) | Select-Object -Last 1)); $warn += 'sound' }
      else { Done 'OK' ($name + '_phone.mp4  ' + (Size (Get-Item -LiteralPath $phone).Length) + $lufs + $how) }
      if ($j.post -and (Test-Path -LiteralPath (Join-Path $repo $j.post))) { Copy-Item -LiteralPath (Join-Path $repo $j.post) -Destination (Join-Path $repo ('videos\' + $name + '_post.txt')) -Force }   # captions + times next to the video
      $fl = @($script:LastOut | Where-Object { $_ -match 'FLICKER CHECK' }) | Select-Object -First 1
      Stage '   ' 'Flicker check'
      $secs = @(Get-Content -LiteralPath (Join-Path $repo ('videos\' + $name + '_flicker.txt')) -ErrorAction SilentlyContinue | Where-Object { $_ -match '<--' } | ForEach-Object { Log $_; ($_.Trim() -split '\s+')[0] + ' s' })
      if (-not $fl) { Done 'SKIP' 'no result' } elseif ($fl -match 'OK') { Done 'OK' 'no flicker' } else { Done 'WARN' ('at ' + ($secs -join ', ') + ': send me the log'); $warn += 'flicker' }

      # 8. contact sheet (1 frame per second, for the review), then the frames go (about 1 GB)
      Stage '8/8' 'Contact sheet'
      $sheet = Join-Path $out ($name + '_sheet.jpg')
      $null = RunStage 'py' @('-3', 'studio/tools/sheet1fps.py', ('studio/out/frames_' + $ep), ('studio/out/' + $name + '_sheet.jpg'))
      $fsz = (Get-ChildItem -LiteralPath $frames -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
      Remove-Item -Recurse -Force -LiteralPath $frames -ErrorAction SilentlyContinue
      if (Test-Path -LiteralPath $sheet) { Done 'OK' ('studio\out\' + $name + '_sheet.jpg  (frames deleted: ' + (Size $fsz) + ')') } else { Done 'WARN' 'no sheet' }
      [void]$ready.Add($phone)
    } catch {
      Log ('STOPPED ' + $name + ': ' + $_); WL ('        ' + $name + ' stopped (' + $_ + '); the next video still runs') 'Red'; $warn += ($name + ' failed')
    }
  }
  $ok = $ready.Count -gt 0
} catch {
  Log ('STOPPED: ' + $_)
} finally {
  Set-Location $repo
  $tm = Mmss ((Get-Date) - $t0).TotalSeconds
  WL
  WL ('  ' + ('=' * 76)) 'DarkGray'
  if ($ok) { Show-Outro 'READY' $true } else { Show-Outro 'FAIL' $false }
  if ($ok) {
    W '  VIDEO READY' 'Green'; WL ('   ' + $ready.Count + ' of ' + @($jobs).Count + ' videos   (total ' + $tm + ')') 'White'
    foreach ($ph in $ready) { WL ('  ' + $ph) 'Gray' }
    $phone = $ready[$ready.Count - 1]
    if ($warn.Count) { WL ('  warnings: ' + ($warn -join ', ') + '. Send me the log: studio\out\pc_render_log.txt') 'Yellow' }
    WL '  Play it from Photos with the volume up.' 'DarkGray'
  } else {
    W '  NO VIDEO' 'Red'; WL ('   (after ' + $tm + ')  Send me the log: studio\out\pc_render_log.txt') 'White'
  }
  WL ('  ' + ('=' * 76)) 'DarkGray'
  Log ('total ' + $tm + '. ' + $(if ($ok) { 'VIDEO READY' } else { 'NO VIDEO' }))
  if ($shut) {
    $cancel = $false; $end = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $end) {
      W ("`r  Shutting down in " + [int][Math]::Ceiling(($end - (Get-Date)).TotalSeconds) + ' s  (press any key to cancel)  ') 'Yellow'
      if (Key-Available) { $null = Read-Key; $cancel = $true; break }
      Start-Sleep -Milliseconds 100
    }
    WL
    if ($cancel) { WL '  shutdown cancelled' 'Gray' } else { & shutdown.exe /s /t 5 /c 'DeatAnimation: the video is ready in the videos folder.' }
  } elseif ($ok) {
    Start-Process explorer.exe -ArgumentList ('/select,"' + $phone + '"')          # the folder, with the video selected
  }
}
