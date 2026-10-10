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
if (-not (Has 'winget')) { Fail 'winget is missing: install "App Installer" from the Microsoft Store, then run SETUP.bat again.' }
$tools = @(
  @{ cmd = 'node'; id = 'OpenJS.NodeJS.LTS' },
  @{ cmd = 'py'; id = 'Python.Python.3.12' },
  @{ cmd = 'ffmpeg'; id = 'Gyan.FFmpeg' },
  @{ cmd = 'git'; id = 'Git.Git' }
)
foreach ($t in $tools) {
  if (Has $t.cmd) { Say ($t.cmd + ': already installed'); continue }
  Say ('installing ' + $t.id + ' (say yes if Windows asks for permission)')
  $null = Run 'winget' @('install', '--id', $t.id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements')
  RefreshPath
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
