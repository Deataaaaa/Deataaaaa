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
$script:Quiet = $false                                      # render.ps1: program output goes to the log only
function Log([string]$t) { if ($script:LogFile) { Add-Content -LiteralPath $script:LogFile -Value $t -Encoding UTF8 } }
function Say([string]$t) {
  if (-not $script:Quiet) { Write-Host $t -ForegroundColor Cyan }
  Log $t
}
# runs a program, shows its output (unless Quiet) and keeps it in the log; returns its exit code. Its output is also
# kept in $script:LastOut (render.ps1 reads the results from it).
function Run([string]$exe, [string[]]$argv) {
  $script:LastOut = New-Object System.Collections.ArrayList
  & $exe @argv 2>&1 | ForEach-Object {
    $l = "$_"; [void]$script:LastOut.Add($l)
    if (-not $script:Quiet) { Write-Host $l }
    Log $l
  }
  return $LASTEXITCODE
}
function RefreshPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Has([string]$cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

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
