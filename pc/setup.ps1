# DeatAnimation render PC: one-time setup (Windows 10/11, run through SETUP.bat). Safe to run again: it skips what is
# already done. Installs Node.js, Python, ffmpeg and Git (winget), the renderer (npm + Chromium), the Python packages,
# downloads the 3D people, finds Google Drive and renders one test frame on the graphics card.
# ASCII only (Windows PowerShell 5.1 reads scripts without a BOM as ANSI).
$pc = $PSScriptRoot
$repo = Split-Path -Parent $pc
$studio = Join-Path $repo 'studio'
. (Join-Path $pc 'common.ps1')
Start-Log (Join-Path $pc 'setup_log.txt') 'DeatAnimation setup'
function Fail([string]$t) {
  Say ('SETUP STOPPED: ' + $t)
  Say 'Send a photo of this window (or the file pc\setup_log.txt) in the chat.'
  exit 1
}

Say '== 1/6 Tools: Node.js, Python, ffmpeg, Git'
if (-not (Has 'winget')) {                                    # App Installer present but not registered for this user
  try { Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction Stop } catch { }
  RefreshPath
}
# without winget: direct downloads (Node.js and ffmpeg unzipped next to the project, Python installed for this user)
$toolsDir = Join-Path (Split-Path -Parent $repo) 'tools'
function Add-UserPath([string]$dir) {
  $u = [Environment]::GetEnvironmentVariable('Path', 'User'); if (-not $u) { $u = '' }
  if (($u -split ';') -notcontains $dir) { [Environment]::SetEnvironmentVariable('Path', ($dir + ';' + $u).TrimEnd(';'), 'User') }
  RefreshPath
}
function Get-File([string]$url, [string]$out) {
  Say ('downloading ' + $url)
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $out
  return (Test-Path -LiteralPath $out)
}
function Install-Direct([string]$cmd) {
  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  if ($cmd -eq 'node') {
    $zip = Join-Path $toolsDir 'node.zip'
    if (Get-File 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-win-x64.zip' $zip) {
      Expand-Archive -Force -LiteralPath $zip -DestinationPath $toolsDir; Remove-Item -Force -LiteralPath $zip
      Add-UserPath (Join-Path $toolsDir 'node-v22.11.0-win-x64')
    }
  } elseif ($cmd -eq 'ffmpeg') {
    $zip = Join-Path $toolsDir 'ffmpeg.zip'
    if (Get-File 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' $zip) {
      $dst = Join-Path $toolsDir 'ffmpeg'
      Expand-Archive -Force -LiteralPath $zip -DestinationPath $dst; Remove-Item -Force -LiteralPath $zip
      $exe = Get-ChildItem -LiteralPath $dst -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1
      if ($exe) { Add-UserPath $exe.DirectoryName }
    }
  } elseif ($cmd -eq 'py') {
    $exe = Join-Path $toolsDir 'python-setup.exe'
    if (Get-File 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe' $exe) {
      Say 'installing Python 3.12 for this user (a minute or two)'
      Start-Process -Wait -FilePath $exe -ArgumentList '/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_launcher=1', 'InstallLauncherAllUsers=0', 'Include_test=0'
      Remove-Item -Force -LiteralPath $exe
      RefreshPath
    }
  } elseif ($cmd -eq 'git') {
    $exe = Join-Path $toolsDir 'git-setup.exe'
    if (Get-File 'https://github.com/git-for-windows/git/releases/download/v2.47.0.windows.2/Git-2.47.0.2-64-bit.exe' $exe) {
      Say 'installing Git (say yes if Windows asks for permission)'
      Start-Process -Wait -FilePath $exe -ArgumentList '/VERYSILENT', '/NORESTART'
      Remove-Item -Force -LiteralPath $exe
      RefreshPath
    }
  }
}
$tools = @(
  @{ cmd = 'node'; id = 'OpenJS.NodeJS.LTS' },
  @{ cmd = 'py'; id = 'Python.Python.3.12' },
  @{ cmd = 'ffmpeg'; id = 'Gyan.FFmpeg' },
  @{ cmd = 'git'; id = 'Git.Git' }
)
foreach ($t in $tools) {
  if (Has $t.cmd) { Say ($t.cmd + ': already installed'); continue }
  if (Has 'winget') {
    Say ('installing ' + $t.id + ' (say yes if Windows asks for permission)')
    $null = Run 'winget' @('install', '--id', $t.id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements')
    RefreshPath
  }
  if (-not (Has $t.cmd)) { Install-Direct $t.cmd }
}
RefreshPath
foreach ($c in 'node', 'npm', 'npx', 'py', 'ffmpeg', 'ffprobe', 'git') {
  if (-not (Has $c)) { Fail ($c + ' is still not found. Close this window and double-click SETUP.bat again (a new window sees newly installed tools).') }
}
if (-not (Test-Path -LiteralPath $bash)) { Fail ('Git Bash not found at ' + $bash) }

Say '== 2/6 Renderer: three.js, Playwright and its Chromium'
Set-Location $studio
if ((Run 'npm' @('install', '--no-audit', '--no-fund')) -ne 0) { Fail 'npm install failed' }
if ((Run 'npx' @('playwright', 'install', 'chromium')) -ne 0) { Fail 'the Chromium download failed' }

Say '== 3/6 Python packages'
if ((Run 'py' @('-3', '-m', 'pip', 'install', '--upgrade', '--disable-pip-version-check', 'numpy', 'scipy', 'opencv-python', 'pillow')) -ne 0) { Fail 'pip install failed' }

Say '== 4/6 3D people'
if ((Ensure-Models $studio $pc) -ne 0) { Fail 'the 3D people download failed' }

Say '== 5/6 Google Drive'
$drive = Find-GoogleDrive
if ($drive) {
  $dest = Join-Path $drive 'DeatAnimation'
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Say ('videos will go to ' + $dest)
} else {
  Say 'Google Drive folder not found: open Google Drive for desktop, sign in, then run SETUP.bat again. Until then videos stay in the videos folder.'
}

Say '== 6/6 Graphics card test (one frame of post 4)'
Set-Location $studio
$test = Join-Path $studio 'out\gputest'
$code = Run 'node' @('render.mjs', '--ep', 'ep10', '--gpu', '--stills', '30', '--out', $test)
if ($code -eq 3) {
  Say 'the hidden browser did not get the graphics card: trying with a visible window'
  $code = Run 'node' @('render.mjs', '--ep', 'ep10', '--gpu', '--headed', '--stills', '30', '--out', $test)
}
if ($code -ne 0) { Fail 'the test frame did not render' }
Say 'SETUP DONE. To make a video, double-click RENDER.bat.'
exit 0
