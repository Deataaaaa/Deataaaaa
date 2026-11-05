# DeatAnimation Render Engine v3: the console look (owner, 4 Nov 2026: "keep it in a cmd, it looks badass, make dope text
# animations and make it customizable"). 24-bit colour through VT escape codes (Windows 10+ console), an animated banner,
# a neofetch-style system panel, smooth gradient bars with sparklines, spinners on every stage. Everything is set in
# pc\theme.json (theme, banner, speed, bar style, panels); a console without VT falls back to the 16 classic colours.
# Windows PowerShell 5.1: ASCII only in this file (the block and box characters are made at run time).
$script:ESC = [string][char]27
$script:VT = $false
try {
  Add-Type -Namespace DA -Name Vt -MemberDefinition '[DllImport("kernel32.dll")] public static extern System.IntPtr GetStdHandle(int h); [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(System.IntPtr h, out uint m); [DllImport("kernel32.dll")] public static extern bool SetConsoleMode(System.IntPtr h, uint m);' -ErrorAction Stop
  $hOut = [DA.Vt]::GetStdHandle(-11); $om = [uint32]0
  if ([DA.Vt]::GetConsoleMode($hOut, [ref]$om)) { $script:VT = [DA.Vt]::SetConsoleMode($hOut, ($om -bor [uint32]0x0004)) }
} catch {}
if ($env:DA_FORCE_VT -eq '1') { $script:VT = $true }
try { Add-Type -Namespace DA -Name Cp -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool SetConsoleOutputCP(uint cp); [DllImport("kernel32.dll")] public static extern bool SetConsoleCP(uint cp);' -ErrorAction Stop } catch {}
# programs run from the engine (npm above all) can leave the console in another code page, without VT colours and with
# their own window title: put all three back after each one (owner's v3.1 run: the title stayed "npm install")
$script:Title = ''
function Fix-Console {
  try { $null = [DA.Cp]::SetConsoleOutputCP(65001); $null = [DA.Cp]::SetConsoleCP(65001) } catch {}
  try { if ([Console]::OutputEncoding.CodePage -ne 65001) { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } } catch {}
  try { $h = [DA.Vt]::GetStdHandle(-11); $m = [uint32]0; if ([DA.Vt]::GetConsoleMode($h, [ref]$m) -and -not ($m -band 4)) { $null = [DA.Vt]::SetConsoleMode($h, ($m -bor [uint32]0x0004)) } } catch {}
  if ($script:Title) { try { if ($Host.UI.RawUI.WindowTitle -ne $script:Title) { $Host.UI.RawUI.WindowTitle = $script:Title } } catch {} }
}

# ---------- the theme ----------
$script:THEMES = @{
  inferno = @{ a = @(255, 46, 46); b = @(255, 196, 0); dim = @(110, 110, 120); text = @(235, 235, 240); ok = @(90, 230, 120); warn = @(255, 200, 60); fail = @(255, 70, 70) }
  matrix  = @{ a = @(0, 255, 110); b = @(0, 120, 40); dim = @(60, 120, 80); text = @(200, 255, 210); ok = @(120, 255, 160); warn = @(220, 255, 90); fail = @(255, 80, 80) }
  synth   = @{ a = @(255, 60, 200); b = @(60, 200, 255); dim = @(120, 100, 150); text = @(240, 230, 255); ok = @(90, 255, 200); warn = @(255, 210, 90); fail = @(255, 80, 120) }
  ice     = @{ a = @(120, 220, 255); b = @(255, 255, 255); dim = @(100, 130, 150); text = @(225, 240, 250); ok = @(120, 255, 200); warn = @(255, 220, 120); fail = @(255, 100, 110) }
  mono    = @{ a = @(240, 240, 240); b = @(120, 120, 120); dim = @(100, 100, 100); text = @(230, 230, 230); ok = @(230, 230, 230); warn = @(200, 200, 200); fail = @(255, 255, 255) }
}
$script:CFG = @{ theme = 'inferno'; banner = 'block'; animate = $true; speed = 1.0; bar = 'smooth'; sysinfo = $true; logo = 'cat'; width = 34; outro = $true; trail = $true; trailGravity = 38.0; trailDensity = 2.2; trailLife = 2.6; trailGlyphs = ''
  workers = 0; maxWorkers = 0; encoder = 'auto'; shutdown = 'ask'; autostart = 10; keepFrames = $false; cover = $true; glyphs = 'auto' }
function Load-Theme([string]$path) {
  if (Test-Path -LiteralPath $path) {
    try {
      $j = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
      foreach ($p in $j.PSObject.Properties) { if ($p.Name -ne 'custom' -and -not $p.Name.StartsWith('_')) { $script:CFG[$p.Name] = $p.Value } }
      if ($j.custom) { $c = @{}; foreach ($p in $j.custom.PSObject.Properties) { $c[$p.Name] = @($p.Value) }; $script:THEMES['custom'] = $c }
    } catch { }
  }
  Apply-Cfg
}
function Apply-Cfg {
  if (-not $script:THEMES.ContainsKey([string]$script:CFG.theme)) { $script:CFG.theme = 'inferno' }
  $script:T = $script:THEMES[[string]$script:CFG.theme]
  $script:SPD = [Math]::Max(0.05, [double]$script:CFG.speed)
  if (-not $script:VT) { $script:CFG.animate = $false }
  Set-Glyphs ([string]$script:CFG.glyphs)
}

# ---------- colour and characters ----------
function Rgb($c) { if (-not $script:VT) { return '' }; return ($script:ESC + '[38;2;' + $c[0] + ';' + $c[1] + ';' + $c[2] + 'm') }
function Reset { if ($script:VT) { return ($script:ESC + '[0m') }; return '' }
function Mix($a, $b, [double]$k) { $k = [Math]::Max(0.0, [Math]::Min(1.0, $k)); return @([int]($a[0] + ($b[0] - $a[0]) * $k), [int]($a[1] + ($b[1] - $a[1]) * $k), [int]($a[2] + ($b[2] - $a[2]) * $k)) }
$script:FULL = [string][char]0x2588; $script:LIGHT = [string][char]0x2591; $script:MED = [string][char]0x2592
# v3.1: two glyph sets. The Windows 10 console (conhost, Consolas) only draws the WGL4 characters: the braille spinner, the
# eighth blocks, the check mark, the play triangle and the rounded corners came out as '?' there (owner, 5 Nov 2026). 'safe' keeps
# to WGL4 (shades, square corners, the cp437 pointer); 'full' is for Windows Terminal; 'auto' picks full only inside it.
function Set-Glyphs([string]$mode) {
  $ch = { param([int[]]$c) return @($c | ForEach-Object { [string][char]$_ }) }
  if ($mode -ne 'full' -and $mode -ne 'safe') { if ($env:WT_SESSION -or $env:TERM_PROGRAM) { $mode = 'full' } else { $mode = 'safe' } }
  $script:GLYPHS = $mode
  if ($mode -eq 'full') {
    $script:EIGHTHS = @('') + (& $ch @(0x258F, 0x258E, 0x258D, 0x258C, 0x258B, 0x258A, 0x2589))
    $script:SPARK = & $ch @(0x2581, 0x2582, 0x2583, 0x2584, 0x2585, 0x2586, 0x2587, 0x2588)
    $script:SPIN = & $ch @(0x280B, 0x2819, 0x2839, 0x2838, 0x283C, 0x2834, 0x2826, 0x2827, 0x2807, 0x280F)
    $script:BOX = @{ h = [string][char]0x2500; v = [string][char]0x2502; tl = [string][char]0x256D; tr = [string][char]0x256E; bl = [string][char]0x2570; br = [string][char]0x256F }
    $script:GL = @{ ok = [string][char]0x2714; fail = [string][char]0x2716; run = [string][char]0x25B6; ptr = [string][char]0x25B6; dot = [string][char]0x25CF }
  } else {
    # 8 levels from WGL4 shades (the bar's partial cell and the sparklines), a shade spinner, square corners
    $script:EIGHTHS = @('') + (& $ch @(0x2591, 0x2591, 0x2592, 0x2592, 0x2593, 0x2593, 0x2593))
    $script:SPARK = & $ch @(0x005F, 0x2591, 0x2591, 0x2592, 0x2592, 0x2593, 0x2593, 0x2588)
    $script:SPIN = & $ch @(0x2591, 0x2592, 0x2593, 0x2588, 0x2593, 0x2592)
    $script:BOX = @{ h = [string][char]0x2500; v = [string][char]0x2502; tl = [string][char]0x250C; tr = [string][char]0x2510; bl = [string][char]0x2514; br = [string][char]0x2518 }
    $script:GL = @{ ok = [string][char]0x221A; fail = [string][char]0x00D7; run = [string][char]0x25BA; ptr = [string][char]0x25BA; dot = [string][char]0x2022 }
  }
}
Set-Glyphs 'auto'
function Out-Raw([string]$s) { [Console]::Write($s) }
function Sleep-Ms([int]$ms) { if ($script:CFG.animate) { Start-Sleep -Milliseconds ([int]([Math]::Max(1, $ms / $script:SPD))) } }
# a line in a gradient from the theme's a to b colour (16-colour consoles: plain theme colour)
function Grad([string]$s, $a, $b) {
  if (-not $script:VT) { return $s }
  $o = New-Object System.Text.StringBuilder; $n = [Math]::Max(1, $s.Length - 1)
  for ($i = 0; $i -lt $s.Length; $i++) { $ch = $s[$i]; if ($ch -ne ' ') { [void]$o.Append((Rgb (Mix $a $b ($i / $n)))) }; [void]$o.Append($ch) }
  [void]$o.Append((Reset)); return $o.ToString()
}
function C([string]$s, $c) { if ($script:VT) { return ((Rgb $c) + $s + (Reset)) }; return $s }

# a bar: smooth (eighths, gradient), blocks, dots or ascii; f in 0..1
function UiBar([double]$f, [int]$w) {
  $f = [Math]::Max(0.0, [Math]::Min(1.0, $f)); $style = [string]$script:CFG.bar
  if ($style -eq 'ascii') { $n = [int][Math]::Round($f * $w); return ('[' + ('=' * $n) + ('-' * ($w - $n)) + ']') }
  $cells = $f * $w; $full = [int][Math]::Floor($cells); $part = [int][Math]::Floor(($cells - $full) * 8)
  $o = New-Object System.Text.StringBuilder
  for ($i = 0; $i -lt $w; $i++) {
    $col = Mix $script:T.a $script:T.b ($i / [Math]::Max(1, $w - 1))
    if ($i -lt $full) { $ch = $script:FULL; if ($style -eq 'dots') { $ch = $script:GL.dot } }
    elseif ($i -eq $full -and $part -gt 0 -and $style -eq 'smooth') { $ch = $script:EIGHTHS[$part] }
    else { $ch = $script:LIGHT; if ($style -eq 'dots') { $ch = [string][char]0x00B7 }; $col = $script:T.dim }
    [void]$o.Append((C $ch $col))
  }
  return $o.ToString()
}
function Sparkline($vals, [int]$w, [double]$max) {
  $v = @($vals | Select-Object -Last $w); if ($v.Count -eq 0) { return (' ' * $w) }
  if ($max -le 0) { $max = [double](($v | Measure-Object -Maximum).Maximum); if ($max -le 0) { $max = 1 } }
  $o = ''; foreach ($x in $v) { $o += $script:SPARK[[int][Math]::Min(7, [Math]::Max(0, [Math]::Floor(([double]$x / $max) * 7.99)))] }
  return ((C $o $script:T.b) + (' ' * ($w - $v.Count)))
}

# ---------- the banner: big letters drawn from a 5-row font, revealed with a colour sweep and a glitch ----------
$script:FONT = @{
  'D' = @('####.', '#...#', '#...#', '#...#', '####.'); 'E' = @('#####', '#....', '####.', '#....', '#####'); 'A' = @('.###.', '#...#', '#####', '#...#', '#...#')
  'T' = @('#####', '..#..', '..#..', '..#..', '..#..'); 'N' = @('#...#', '##..#', '#.#.#', '#..##', '#...#'); 'I' = @('#####', '..#..', '..#..', '..#..', '#####')
  'M' = @('#...#', '##.##', '#.#.#', '#...#', '#...#'); 'O' = @('.###.', '#...#', '#...#', '#...#', '.###.'); 'R' = @('####.', '#...#', '####.', '#..#.', '#...#')
  'V' = @('#...#', '#...#', '#...#', '.#.#.', '..#..'); '3' = @('####.', '....#', '.###.', '....#', '####.'); 'Y' = @('#...#', '.#.#.', '..#..', '..#..', '..#..')
  'S' = @('.####', '#....', '.###.', '....#', '####.'); 'K' = @('#...#', '#..#.', '###..', '#..#.', '#...#'); 'L' = @('#....', '#....', '#....', '#....', '#####')
  'F' = @('#####', '#....', '####.', '#....', '#....'); ' ' = @('..', '..', '..', '..', '..'); '!' = @('#', '#', '#', '.', '#')
}
function Big-Rows([string]$word, [string]$style) {
  $rows = @('', '', '', '', '')
  foreach ($ch in $word.ToUpper().ToCharArray()) {
    $g = $script:FONT[[string]$ch]; if (-not $g) { $g = $script:FONT[' '] }
    for ($r = 0; $r -lt 5; $r++) { $rows[$r] += $g[$r] + '.' }
  }
  $on = $script:FULL; $off = ' '
  if ($style -eq 'shade') { $off = $script:LIGHT }
  for ($r = 0; $r -lt 5; $r++) {
    $s = $rows[$r]
    if ($style -eq 'slant') { $s = (' ' * (4 - $r)) + $s }
    if ($style -eq 'double') { $s = ($s.ToCharArray() | ForEach-Object { [string]$_ + [string]$_ }) -join '' }
    $rows[$r] = $s.Replace('#', $on).Replace('.', $off)
  }
  return $rows
}
function Show-Banner([string]$word, [string]$sub, [string]$tag) {
  $style = [string]$script:CFG.banner; if ($style -eq 'small') { $style = 'block' }
  $rows = Big-Rows $word $style
  [Console]::WriteLine()
  $anim = $script:CFG.animate; try { $null = [Console]::CursorTop; [Console]::SetCursorPosition(0, [Console]::CursorTop) } catch { $anim = $false }
  if ($anim) {
    # a sweep: each column lights up left to right in the hot colour, then cools to the gradient
    $w = ($rows | Measure-Object -Property Length -Maximum).Maximum; $top = [Console]::CursorTop
    for ($r = 0; $r -lt 5; $r++) { [Console]::WriteLine() }
    $top = [Console]::CursorTop - 5
    if ($top -lt 0) { $top = 0 }
    try {
    for ($x = 0; $x -le $w + 6; $x += 2) {
      for ($r = 0; $r -lt 5; $r++) {
        $s = $rows[$r]; $o = New-Object System.Text.StringBuilder
        for ($i = 0; $i -lt [Math]::Min($x, $s.Length); $i++) {
          $d = $x - $i; $col = Mix $script:T.a $script:T.b ($i / [Math]::Max(1, $w))
          if ($d -lt 3) { $col = Mix @(255, 255, 255) $col ($d / 3.0) }
          [void]$o.Append((Rgb $col)); [void]$o.Append($s[$i])
        }
        [Console]::SetCursorPosition(3, $top + $r); Out-Raw ($o.ToString() + (Reset))
      }
      Sleep-Ms 12
    }
    [Console]::SetCursorPosition(0, $top + 5)
    } catch { [Console]::WriteLine(); foreach ($s in $rows) { [Console]::WriteLine('   ' + (Grad $s $script:T.a $script:T.b)) } }
  } else {
    foreach ($s in $rows) { [Console]::WriteLine('   ' + (Grad $s $script:T.a $script:T.b)) }
  }
  # the subtitle types itself, with a block cursor
  Out-Raw '   '
  foreach ($ch in $sub.ToCharArray()) { Out-Raw (C ([string]$ch) $script:T.text); Sleep-Ms 18 }
  if ($tag) { Out-Raw '  '; if ($script:VT) { Out-Raw ($script:ESC + '[48;2;' + $script:T.a[0] + ';' + $script:T.a[1] + ';' + $script:T.a[2] + 'm' + (Rgb @(0, 0, 0)) + ' ' + $tag + ' ' + (Reset)) } else { Write-Host (' ' + $tag + ' ') -NoNewline -ForegroundColor White -BackgroundColor Red } }
  [Console]::WriteLine(); [Console]::WriteLine()
}

# ---------- the neofetch-style panel: a logo on the left, the machine on the right ----------
$script:LOGOS = @{
  cat = @('   /\_/\     ', '  ( o.o )    ', '   > ^ <     ', '  /|   |\    ', ' (_|   |_)   ', '   apple     ')
  clap = @(' _________   ', '|\_\_\_\_\|  ', '|  ACTION |  ', '| SCENE 26|  ', '|_________|  ', '             ')
  none = @()
}
function Show-Panel($pairs) {
  $logo = $script:LOGOS[[string]$script:CFG.logo]; if (-not $logo) { $logo = @() }
  $n = [Math]::Max($logo.Count, $pairs.Count + 2)
  for ($i = 0; $i -lt $n; $i++) {
    $l = ''; if ($i -lt $logo.Count) { $l = $logo[$i] } else { $l = ' ' * 13 }
    if ($logo.Count) { Out-Raw ('   ' + (Grad $l $script:T.a $script:T.b) + '  ') } else { Out-Raw '   ' }
    if ($i -lt $pairs.Count) {
      $k = [string]$pairs[$i][0]; $v = [string]$pairs[$i][1]
      if ($k -eq '-') { Out-Raw (C ($script:BOX.h * 46) $script:T.dim) }
      else { Out-Raw ((C ($k.PadRight(9)) $script:T.a) + (C $v $script:T.text)) }
    } elseif ($i -eq $pairs.Count + 1 -and $script:VT) {
      # the palette row, like neofetch
      $pal = ''; for ($q = 0; $q -lt 8; $q++) { $c = Mix $script:T.a $script:T.b ($q / 7.0); $pal += $script:ESC + '[48;2;' + $c[0] + ';' + $c[1] + ';' + $c[2] + 'm   ' }
      Out-Raw ($pal + (Reset))
    }
    [Console]::WriteLine(); Sleep-Ms 25
  }
  [Console]::WriteLine()
}

# ---------- stages: number, name, a spinner while it runs, the result and the time it took ----------
function Stage-Head([string]$num, [string]$name) {
  Out-Raw ('  ' + (C ('[' + $num + ']') $script:T.a) + ' ' + (C ($name + ' ').PadRight(26, '.') $script:T.text))
}
function Stage-Line([string]$num, [string]$name, [string]$state, [string]$detail, [double]$secs) {
  $c = $script:T.ok; if ($state -eq 'WARN') { $c = $script:T.warn } elseif ($state -eq 'FAIL') { $c = $script:T.fail } elseif ($state -eq 'SKIP') { $c = $script:T.dim } elseif ($state -eq 'RUN') { $c = $script:T.b }
  $t = ''; if ($secs -ge 0) { $t = (' {0,6}' -f (Mmss $secs)) }
  $mark = $script:GL.ok; if ($state -eq 'FAIL') { $mark = $script:GL.fail } elseif ($state -eq 'WARN') { $mark = '!' } elseif ($state -eq 'SKIP') { $mark = '-' } elseif ($state -eq 'RUN') { $mark = $script:GL.run }
  if (-not $script:VT) { $mark = '' }
  Out-Raw ("`r  " + (C ('[' + $num + ']') $script:T.a) + ' ' + (C ($name + ' ').PadRight(26, '.') $script:T.text) + ' ' + (C ($mark + ' ' + $state).PadRight(7) $c) + (C $t $script:T.dim) + '  ' + (C $detail $script:T.dim))
  [Console]::WriteLine()
}
# runs a program in the background and animates the stage line until it ends; output to the log and $script:LastOut
function Quote-Arg([string]$a) { if ($a -match '[\s"]') { return ('"' + $a.Replace('"', '\"') + '"') }; return $a }
function Run-Live([string]$exe, [string[]]$argv, [string]$num, [string]$name, [string]$cwd) {
  $o = [IO.Path]::GetTempFileName(); $e = [IO.Path]::GetTempFileName()
  $al = ($argv | ForEach-Object { Quote-Arg $_ }) -join ' '
  if (-not $cwd) { $cwd = (Get-Location).Path }
  $p = Start-Process -FilePath $exe -ArgumentList $al -WorkingDirectory $cwd -NoNewWindow -PassThru -RedirectStandardOutput $o -RedirectStandardError $e
  $null = $p.Handle; $t0 = Get-Date; $k = 0
  while (-not $p.HasExited) {
    $s = ((Get-Date) - $t0).TotalSeconds
    $last = ''; try { $tl = @(Get-Content -LiteralPath $o -Tail 1 -ErrorAction SilentlyContinue); if ($tl.Count) { $last = [string]$tl[0] } } catch {}
    if ($last.Length -gt 40) { $last = $last.Substring(0, 40) }
    Out-Raw ("`r  " + (C ('[' + $num + ']') $script:T.a) + ' ' + (C ($name + ' ').PadRight(26, '.') $script:T.text) + ' ' + (C $script:SPIN[$k % $script:SPIN.Count] $script:T.b) + (C (' {0,6}  ' -f (Mmss $s)) $script:T.dim) + (C $last.PadRight(42) $script:T.dim))
    $k++; Start-Sleep -Milliseconds 120
  }
  $p.WaitForExit()
  $script:LastOut = New-Object System.Collections.ArrayList
  foreach ($l in @(Get-Content -LiteralPath $o -ErrorAction SilentlyContinue) + @(Get-Content -LiteralPath $e -ErrorAction SilentlyContinue)) { [void]$script:LastOut.Add([string]$l); Log ([string]$l) }
  Remove-Item -LiteralPath $o, $e -ErrorAction SilentlyContinue
  $script:LastSecs = ((Get-Date) - $t0).TotalSeconds
  Fix-Console
  Out-Raw ("`r" + (' ' * 110) + "`r")
  return $p.ExitCode
}

# ---------- the end: a big word that flashes in, then settles ----------
function Show-Outro([string]$word, [bool]$good) {
  $rows = Big-Rows $word 'block'
  $a = $script:T.ok; $b = $script:T.b; if (-not $good) { $a = $script:T.fail; $b = $script:T.dim }
  $anim = $script:CFG.animate -and $script:CFG.outro; try { [Console]::SetCursorPosition(0, [Console]::CursorTop) } catch { $anim = $false }
  if ($anim) {
    $top = [Console]::CursorTop; foreach ($r in $rows) { [Console]::WriteLine() }; $top = [Console]::CursorTop - 5
    if ($top -lt 0) { $top = 0 }
    try {
    foreach ($k in @(1.0, 0.0, 1.0, 0.6, 0.3, 0.0)) {
      for ($r = 0; $r -lt 5; $r++) { [Console]::SetCursorPosition(3, $top + $r); Out-Raw (Grad $rows[$r] (Mix $a @(255, 255, 255) $k) (Mix $b @(255, 255, 255) $k)) }
      Sleep-Ms 70
    }
    [Console]::SetCursorPosition(0, $top + 5)
    } catch { [Console]::WriteLine(); foreach ($r in $rows) { [Console]::WriteLine('   ' + (Grad $r $a $b)) } }
  } else { foreach ($r in $rows) { [Console]::WriteLine('   ' + (Grad $r $a $b)) } }
}

# ---------- the mouse trail (pc\trail.cs): characters fall from the pointer under gravity, in rainbow colours ----------
$script:TRAIL = $false
function Start-Trail([string]$pc) {
  if (-not $script:CFG.trail -or -not $script:VT) { return }
  try {
    Add-Type -TypeDefinition (Get-Content -Raw -LiteralPath (Join-Path $pc 'trail.cs')) -ErrorAction Stop
    [DA.Trail]::Gravity = [double]$script:CFG.trailGravity; [DA.Trail]::Density = [double]$script:CFG.trailDensity; [DA.Trail]::Life = [double]$script:CFG.trailLife
    if ([string]$script:CFG.trailGlyphs) { [DA.Trail]::Glyphs = [string]$script:CFG.trailGlyphs }
    $script:TRAIL = [DA.Trail]::Start()
  } catch { $script:TRAIL = $false }
}
function Stop-Trail { if ($script:TRAIL) { try { [DA.Trail]::Stop() } catch {}; $script:TRAIL = $false } }
# keys go through the trail's queue while it reads the console's input (it takes every input record)
function Key-Available { if ($script:TRAIL) { return [DA.Trail]::KeyAvailable() }; return [Console]::KeyAvailable }
function Read-Key { if ($script:TRAIL) { return [DA.Trail]::ReadKey() }; return [Console]::ReadKey($true) }

# a program in the background while something else runs (the soundtrack during the render, the frame check and the
# contact sheet during the encode): Start-Bg, then Wait-Bg gives its exit code; its output goes to .out and the log
function Start-Bg([string]$exe, [string[]]$argv, [string]$cwd) {
  $o = [IO.Path]::GetTempFileName(); $e = [IO.Path]::GetTempFileName()
  $al = ($argv | ForEach-Object { Quote-Arg $_ }) -join ' '
  if (-not $cwd) { $cwd = (Get-Location).Path }
  $p = Start-Process -FilePath $exe -ArgumentList $al -WorkingDirectory $cwd -NoNewWindow -PassThru -RedirectStandardOutput $o -RedirectStandardError $e
  $null = $p.Handle
  return @{ p = $p; o = $o; e = $e; t0 = (Get-Date); out = @(); code = -1; secs = 0.0 }
}
function Wait-Bg($bg) {
  $bg.p.WaitForExit()
  $lines = New-Object System.Collections.ArrayList
  foreach ($l in @(Get-Content -LiteralPath $bg.o -ErrorAction SilentlyContinue) + @(Get-Content -LiteralPath $bg.e -ErrorAction SilentlyContinue)) { [void]$lines.Add([string]$l); Log ([string]$l) }
  Remove-Item -LiteralPath $bg.o, $bg.e -ErrorAction SilentlyContinue
  $bg.out = $lines; $bg.code = $bg.p.ExitCode; $bg.secs = ((Get-Date) - $bg.t0).TotalSeconds
  Fix-Console
  return $bg.code
}

# ---------- v3.1: the settings people change in the menu live in pc\user.json (not in git: updates never reset it) ----------
$script:USERKEYS = @('theme', 'banner', 'bar', 'logo', 'speed', 'animate', 'sysinfo', 'outro', 'trail', 'width', 'glyphs', 'workers', 'maxWorkers', 'encoder', 'shutdown', 'autostart', 'keepFrames', 'cover')
function Save-User([string]$path) {
  $o = [ordered]@{ _help = 'Saved by the RENDER.bat menu (Look, Settings). Not in git, so updates keep it. Delete this file to go back to pc\theme.json.' }
  foreach ($k in $script:USERKEYS) { if ($script:CFG.ContainsKey($k)) { $o[$k] = $script:CFG[$k] } }
  try { Set-Content -LiteralPath $path -Value ($o | ConvertTo-Json -Depth 4) -Encoding UTF8; return $true } catch { return $false }
}
function Same($a, $b) {
  if ($a -is [bool] -or $b -is [bool]) { return ([bool]$a -eq [bool]$b) }
  try { return ([double]$a -eq [double]$b) } catch { return ([string]$a -eq [string]$b) }
}
function Cycle($cur, $opts, [int]$dir) {
  $i = -1; for ($q = 0; $q -lt $opts.Count; $q++) { if (Same $opts[$q] $cur) { $i = $q; break } }
  if ($i -lt 0) { return $opts[0] }
  return $opts[(($i + $dir) % $opts.Count + $opts.Count) % $opts.Count]
}

# ---------- the menu: a rounded box, the chosen row lit with the theme's gradient (it shimmers), arrows or numbers ----------
$script:MW = 66; $script:MenuTop = -1
function Pad-Vis([string]$s, [int]$w) { if ($s.Length -gt $w) { return ($s.Substring(0, [Math]::Max(0, $w - 1)) + [char]0x2026) }; return $s.PadRight($w) }
function Menu-Row($it, [bool]$hi, [double]$ph) {
  $w = $script:MW; $v = $script:BOX.v
  if ($it.sep) { return ('   ' + (C $v $script:T.dim) + (' ' * $w) + (C $v $script:T.dim)) }
  $key = ([string]$it.key).PadRight(2); $lab = Pad-Vis ([string]$it.label) 16
  $iw = $w - 23; $inf = Pad-Vis ([string]$it.info) $iw
  if ($hi -and $script:VT) {
    $row = ' ' + $script:GL.ptr + ' ' + $key + ' ' + $lab + ' ' + $inf + ' '
    $o = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $row.Length; $i++) {
      # the gradient drifts along the row (phase ph): a slow shimmer while the menu waits
      $k = ($i / [double]($w - 1)) + 0.35 * [Math]::Sin($ph + $i / 9.0)
      $bg = Mix $script:T.a $script:T.b $k
      $fg = @(18, 18, 22); if ($i -ge 23) { $fg = @(45, 40, 40) }
      [void]$o.Append($script:ESC + '[48;2;' + $bg[0] + ';' + $bg[1] + ';' + $bg[2] + 'm' + (Rgb $fg) + $row[$i])
    }
    return ('   ' + (C $v $script:T.dim) + $o.ToString() + (Reset) + (C $v $script:T.dim))
  }
  $mk = ' '; if ($hi) { $mk = '>' }
  $kc = $script:T.a; $lc = $script:T.text; if ($it.dis) { $kc = $script:T.dim; $lc = $script:T.dim }
  $infS = C $inf $script:T.dim
  if ($it.raw) { $infS = $it.raw + (' ' * [Math]::Max(0, $iw - [int]$it.rawLen)) }
  return ('   ' + (C $v $script:T.dim) + ' ' + $mk + ' ' + (C $key $kc) + ' ' + (C $lab $lc) + ' ' + $infS + ' ' + (C $v $script:T.dim))
}
function Menu-Lines([string]$title, $items, [int]$sel, [string]$hint, [string]$note, [double]$ph) {
  $w = $script:MW; $B = $script:BOX
  $L = New-Object System.Collections.ArrayList
  $t = $B.h + ' ' + $title + ' '
  [void]$L.Add('   ' + (C ($B.tl + $t) $script:T.a) + (C ($B.h * ($w - $t.Length) + $B.tr) $script:T.dim))
  for ($i = 0; $i -lt $items.Count; $i++) { [void]$L.Add((Menu-Row $items[$i] ($i -eq $sel) $ph)) }
  [void]$L.Add('   ' + (C ($B.bl + ($B.h * $w) + $B.br) $script:T.dim))
  [void]$L.Add('   ' + (C $hint $script:T.dim))
  if ($note) { [void]$L.Add('   ' + (C $note $script:T.b)) } else { [void]$L.Add('') }
  return $L
}
function Menu-Paint($lines, [bool]$reveal) {
  if ($script:MenuTop -lt 0) { $script:MenuTop = [Console]::CursorTop }
  $ok = $true; try { [Console]::SetCursorPosition(0, $script:MenuTop) } catch { $ok = $false }
  $el = ''; if ($script:VT) { $el = $script:ESC + '[K' }
  foreach ($l in $lines) { Out-Raw ($l + $el); [Console]::WriteLine(); if ($reveal) { Sleep-Ms 14 } }
  if ($script:VT -and $ok) { Out-Raw ($script:ESC + '[J') }
  return $ok
}
function Menu-Clear {
  try { [Console]::SetCursorPosition(0, [Math]::Max(0, $script:MenuTop)); if ($script:VT) { Out-Raw ($script:ESC + '[J') } } catch { [Console]::WriteLine() }
  try { [Console]::CursorVisible = $true } catch {}
}
function Next-Sel($items, [int]$sel, [int]$dir) {
  for ($q = 1; $q -le $items.Count; $q++) { $i = (($sel + $dir * $q) % $items.Count + $items.Count) % $items.Count; if (-not $items[$i].sep -and -not $items[$i].dis) { return $i } }
  return $sel
}
# waits for a choice: returns @{ i = row; how = enter | left | right | esc | auto }. With auto > 0 a countdown runs on the
# first row that is not disabled, and any key stops it (the owner double-clicks RENDER.bat and walks away)
function Select-Menu([string]$title, $items, [int]$sel, [int]$auto, [string]$autoWhat, [string]$note) {
  $a = [char]0x2191; $z = [char]0x2193; $l = [char]0x2190; $r = [char]0x2192
  $hint = ([string]$a + [string]$z + ' move   Enter choose   number jump   Esc back')
  if (@($items | Where-Object { $_.opts }).Count) { $hint = ([string]$a + [string]$z + ' move   ' + [string]$l + [string]$r + ' / Enter change   Esc back') }
  if ($items[$sel].sep -or $items[$sel].dis) { $sel = Next-Sel $items $sel 1 }
  try { [Console]::CursorVisible = $false } catch {}
  $t0 = Get-Date; $live = $auto -gt 0; $last = ''; $first = $true; $ph = 0.0; $lastPh = 0.0; $tick = 0
  while ($true) {
    $nt = $note
    if ($live) {
      $left = $auto - ((Get-Date) - $t0).TotalSeconds
      if ($left -le 0) { try { [Console]::CursorVisible = $true } catch {}; return @{ i = $sel; how = 'auto' } }
      $nt = ($script:GL.ptr + ' ' + $autoWhat + ' starts in ' + [int][Math]::Ceiling($left) + ' s   (any key stops it)')
    }
    if ($script:CFG.animate) { $ph = $tick * 0.16 }
    $sig = [string]$sel + '|' + $nt
    if ($sig -ne $last) { $null = Menu-Paint (Menu-Lines $title $items $sel $hint $nt $ph) $first; $first = $false; $last = $sig; $lastPh = $ph }
    elseif ($script:CFG.animate -and $script:VT -and ($ph - $lastPh) -ge 0.15) {
      # the shimmer: only the lit row is redrawn
      try { [Console]::SetCursorPosition(0, $script:MenuTop + 1 + $sel); Out-Raw (Menu-Row $items[$sel] $true $ph) } catch {}
      $lastPh = $ph
    }
    if (Key-Available) {
      $k = Read-Key; $live = $false
      $kn = [string]$k.Key; $ch = [string]$k.KeyChar
      if ($kn -eq 'UpArrow') { $sel = Next-Sel $items $sel -1 }
      elseif ($kn -eq 'DownArrow' -or $kn -eq 'Tab') { $sel = Next-Sel $items $sel 1 }
      elseif ($kn -eq 'Home') { $sel = Next-Sel $items -1 1 }
      elseif ($kn -eq 'End') { $sel = Next-Sel $items $items.Count -1 }
      elseif ($kn -eq 'Enter' -or $kn -eq 'Spacebar') { try { [Console]::CursorVisible = $true } catch {}; return @{ i = $sel; how = 'enter' } }
      elseif ($kn -eq 'RightArrow') { return @{ i = $sel; how = 'right' } }
      elseif ($kn -eq 'LeftArrow') { return @{ i = $sel; how = 'left' } }
      elseif ($kn -eq 'Escape' -or $kn -eq 'Backspace' -or $ch -eq 'q' -or $ch -eq 'Q') { try { [Console]::CursorVisible = $true } catch {}; return @{ i = $sel; how = 'esc' } }
      else {
        for ($i = 0; $i -lt $items.Count; $i++) { if (-not $items[$i].sep -and -not $items[$i].dis -and [string]$items[$i].key -eq $ch) { $sel = $i; $null = Menu-Paint (Menu-Lines $title $items $sel $hint $note $ph) $false; try { [Console]::CursorVisible = $true } catch {}; return @{ i = $sel; how = 'enter' } } }
      }
      continue
    }
    $tick++; Start-Sleep -Milliseconds 70
  }
}
