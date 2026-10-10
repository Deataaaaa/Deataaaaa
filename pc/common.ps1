# DeatAnimation render PC: helpers shared by setup.ps1 and render.ps1.
# Windows PowerShell 5.1: keep this file ASCII only, no && or ?: operators.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'                     # Invoke-WebRequest is very slow with a progress bar
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [Text.Encoding]::UTF8           # read node/python output as UTF-8
$env:PYTHONUTF8 = '1'
$env:PYTHON = 'py -3'                                       # used by encode.sh and fetch_rocketbox.sh (Git Bash)
$script:LogFile = $null
$bash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'      # Git Bash (not C:\Windows\System32\bash.exe, which is WSL)
if (-not (Test-Path -LiteralPath $bash)) {                  # Git installed for this user only
  $alt = Join-Path $env:LOCALAPPDATA 'Programs\Git\bin\bash.exe'
  if (Test-Path -LiteralPath $alt) { $bash = $alt }
}

function Start-Log([string]$path, [string]$title) {
  $script:LogFile = $path
  Set-Content -LiteralPath $path -Value ($title + ' ' + (Get-Date -Format s)) -Encoding UTF8
}
function Say([string]$t) {
  Write-Host $t -ForegroundColor Cyan
  if ($script:LogFile) { Add-Content -LiteralPath $script:LogFile -Value $t -Encoding UTF8 }
}
# runs a program, shows its output and keeps it in the log; returns its exit code
function Run([string]$exe, [string[]]$argv) {
  & $exe @argv 2>&1 | ForEach-Object {
    $l = "$_"; Write-Host $l
    if ($script:LogFile) { Add-Content -LiteralPath $script:LogFile -Value $l -Encoding UTF8 }
  }
  return $LASTEXITCODE
}
function RefreshPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Has([string]$cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# Google Drive for desktop shows "My Drive" on its own drive letter (G: by default; "Mon Drive" in French)
function Find-GoogleDrive {
  $names = @('My Drive', 'Mon Drive', 'Mi unidad', 'Meine Ablage', 'Il mio Drive', 'Meu Drive', 'Mijn Drive')
  foreach ($d in Get-PSDrive -PSProvider FileSystem) {
    foreach ($n in $names) { $p = Join-Path $d.Root $n; if (Test-Path -LiteralPath $p) { return $p } }
  }
  $old = Join-Path $env:USERPROFILE 'Google Drive'
  if (Test-Path -LiteralPath $old) { return $old }
  return $null
}

# the 3D people listed in pc\avatars.txt (Rocketbox, MIT) and the two Mixamo rigs from the three.js examples
function Ensure-Models([string]$studio, [string]$pc) {
  $models = Join-Path $studio 'engine\models'
  New-Item -ItemType Directory -Force -Path $models | Out-Null
  foreach ($m in 'Xbot', 'Michelle') {
    $f = Join-Path $models ($m + '.glb')
    if (-not (Test-Path -LiteralPath $f)) {
      Say "downloading $m.glb"
      Invoke-WebRequest -UseBasicParsing -Uri ('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/' + $m + '.glb') -OutFile $f
    }
  }
  $want = @(Get-Content (Join-Path $pc 'avatars.txt') | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\w+$' })
  $missing = @($want | Where-Object { -not (Test-Path -LiteralPath (Join-Path $models ('rocketbox\' + $_ + '\avatar.json'))) })
  if ($missing.Count -eq 0) { Say ('3D people: all ' + $want.Count + ' already here'); return 0 }
  Say ('downloading ' + $missing.Count + ' 3D people (the first time: about 2 GB, 10-20 min): ' + ($missing -join ' '))
  $env:ROCKETBOX_REPO = ((Join-Path (Split-Path -Parent (Split-Path -Parent $studio)) 'rocketbox-src') -replace '\\', '/')
  Push-Location $studio
  $code = Run $bash (@('tools/fetch_rocketbox.sh') + $missing)
  Pop-Location
  return $code
}
