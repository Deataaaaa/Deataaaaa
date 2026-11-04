# Preview of the Render Engine v3 look (pc\theme.json), run by THEME.bat: banner, system panel, stages, a render bar, the end.
$pc = $PSScriptRoot
function Log([string]$t) {}
function Mmss([double]$s) { $s = [int][Math]::Round($s); return ('{0}:{1:00}' -f [int][Math]::Floor($s / 60), ($s % 60)) }
function Pct([double]$v) { return ('{0,3:0}%' -f $v) }
. (Join-Path $pc 'ui.ps1')
Load-Theme (Join-Path $pc 'theme.json')
Show-Banner 'DEAT' 'A N I M A T I O N   //   render engine v3.0' 'V3'
Show-Panel @(@('user', ($env:USERNAME + '@' + $env:COMPUTERNAME)), @('-', ''), @('theme', [string]$script:CFG.theme), @('banner', [string]$script:CFG.banner), @('bar', [string]$script:CFG.bar), @('logo', [string]$script:CFG.logo))
Stage-Head '1/8' 'Update'; Start-Sleep -Milliseconds 300; Stage-Line '1/8' 'Update' 'OK' 'a1b2c3d S2 P3' 1.2
Stage-Head '4/8' 'Soundtrack'; Start-Sleep -Milliseconds 300; Stage-Line '4/8' 'Soundtrack' 'OK' '88.2 s, 2646 frames' 14
Stage-Head '5/8' 'Render'; [Console]::WriteLine()
$fh = New-Object System.Collections.ArrayList; $gh = New-Object System.Collections.ArrayList
for ($i = 0; $i -le 40; $i++) {
  $f = $i / 40.0; [void]$fh.Add(8 + 6 * [Math]::Sin($i / 4.0)); [void]$gh.Add(60 + 30 * [Math]::Sin($i / 6.0))
  Out-Raw ("`r        " + (UiBar $f ([int]$script:CFG.width)) + (C ('  {0,5:0.0}%' -f ($f * 100)) $script:T.text) + '   ' + (Sparkline $fh 16 0) + '  ' + (Sparkline $gh 12 100))
  Start-Sleep -Milliseconds ([int](60 / $script:SPD))
}
[Console]::WriteLine()
Stage-Line '7/8' 'Encode' 'OK' 'demo_phone.mp4  27 MB  (graphics card, 12 segments)' 41
Stage-Line '   ' 'Flicker check' 'WARN' 'at 18 s: send me the log' 9
Show-Outro 'READY' $true
[Console]::WriteLine()
if ($Host.Name -eq 'ConsoleHost' -and -not $env:DA_FORCE_VT) { Write-Host '  press a key'; $null = [Console]::ReadKey($true) }
