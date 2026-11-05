# DeatAnimation Render Engine v3.1: a menu (render, resume, cover, look, settings, GPU test, log), then renders the video(s)
# named in pc\job.json on the graphics card, checks and encodes them, leaves them in the videos folder with their cover and
# (if asked) shuts the PC down. Run through RENDER.bat, which updates the engine first.
# Program output goes to studio\out\pc_render_log.txt; the window shows the stages, a live progress bar and the
# GPU/CPU usage. ASCII only (Windows PowerShell 5.1): the block characters are made at run time.
# v3.1 (owner, 5 Nov 2026: "fait faire la couverture au rendu, optimise tout de A a Z et fait un menu complet"):
# - the cover is rendered by the last worker at the end of the render (its page is already loaded: one frame);
# - the soundtrack is made while the render runs, the frame check and the contact sheet while the encode runs;
# - the worker pool grows faster (renderall.mjs), Chromium no longer paces frames at 60 Hz nor throttles hidden windows,
#   and frames are written to disk while the next one renders (render.mjs);
# - a menu with an auto-start countdown; the settings changed there are kept in pc\user.json (not in git).
$pc = $PSScriptRoot
$repo = Split-Path -Parent $pc
$studio = Join-Path $repo 'studio'
. (Join-Path $pc 'common.ps1')
. (Join-Path $pc 'ui.ps1')
$userFile = Join-Path $pc 'user.json'
Load-Theme (Join-Path $pc 'theme.json'); Load-Theme $userFile
$script:Quiet = $true
Remove-Item Env:\NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue   # set on this PC by another program: node warned about it
$VERSION = '3.1'
try { $Host.UI.RawUI.WindowTitle = 'DeatAnimation Render Engine v' + $VERSION } catch {}
# a click in the window (QuickEdit) froze the whole render until a key was pressed (owner, 31 Oct 2026): switch QuickEdit off
try {
  Add-Type -Namespace DA -Name Con -MemberDefinition '[DllImport("kernel32.dll")] public static extern System.IntPtr GetStdHandle(int h); [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(System.IntPtr h, out uint m); [DllImport("kernel32.dll")] public static extern bool SetConsoleMode(System.IntPtr h, uint m);'
  $hIn = [DA.Con]::GetStdHandle(-10); $cm = [uint32]0
  if ([DA.Con]::GetConsoleMode($hIn, [ref]$cm)) { $null = [DA.Con]::SetConsoleMode($hIn, (($cm -band (-bnot [uint32]0x0040)) -bor [uint32]0x0080)) }
} catch {}
RefreshPath
$BLK = [string][char]0x2588; $SHD = [string][char]0x2591            # full block, light shade (PowerShell names ignore case: no $f/$e)
$out = Join-Path $studio 'out'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$log = Join-Path $out 'pc_render_log.txt'

# ---------- console helpers ----------
function W([string]$t, [string]$c = 'Gray') { Write-Host $t -NoNewline -ForegroundColor $c }
function WL([string]$t = '', [string]$c = 'Gray') { Write-Host $t -ForegroundColor $c }
function Bar([double]$f, [int]$w) { $f = [Math]::Max(0.0, [Math]::Min(1.0, $f)); $n = [int][Math]::Round($f * $w); return ($BLK * $n) + ($SHD * ($w - $n)) }
function Stage([string]$num, [string]$name) { $script:SN = $num; $script:SNm = $name; $script:ST0 = Get-Date; Stage-Head $num $name; Log ('[' + $num + '] ' + $name) }
function Done([string]$state, [string]$detail) { Stage-Line $script:SN $script:SNm $state $detail ((Get-Date) - $script:ST0).TotalSeconds; Log ('  ' + $state + ' ' + $detail) }
function Line([string]$num, [string]$name, [string]$state, [string]$detail, [double]$secs) { Stage-Line $num $name $state $detail $secs; Log ('[' + $num + '] ' + $name + ': ' + $state + ' ' + $detail) }
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
function Wait-Back([string]$what) {
  WL; Out-Raw ('  ' + (C ([string][char]0x25B6 + ' press a key for ' + $what) $script:T.dim))
  while (-not (Key-Available)) { Start-Sleep -Milliseconds 80 }
  $null = Read-Key; [Console]::WriteLine()
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

# ---------- the machine (read once) and the header ----------
$gpuName = 'unknown graphics card'
try { $vc = @(Get-CimInstance Win32_VideoController); $best = @($vc | Where-Object { $_.Name -match 'AMD|Radeon|NVIDIA|GeForce|Arc' }); if ($best.Count) { $gpuName = $best[0].Name } elseif ($vc.Count) { $gpuName = $vc[0].Name } } catch {}
$cpuName = 'unknown'; try { $cpuName = (@(Get-CimInstance Win32_Processor)[0].Name).Trim() } catch {}
$ramTxt = ''; $osName = 'Windows'; try { $o = Get-CimInstance Win32_OperatingSystem; $ramTxt = ('{0:0} GB' -f ($o.TotalVisibleMemorySize / 1MB)); $osName = $o.Caption } catch {}
$hasAmf = $false; try { $hasAmf = ((& ffmpeg -hide_banner -encoders 2>$null | Out-String) -match 'h264_amf') } catch {}
$nodeV = ''; try { $nodeV = (& node --version 2>$null | Select-Object -First 1) } catch {}
function Header([bool]$anim) {
  $a = $script:CFG.animate; if (-not $anim) { $script:CFG.animate = $false }
  Show-Banner 'DEAT' ('A N I M A T I O N   //   render engine v' + $VERSION) 'V3.1'
  $enc = 'x264 (processor)'; if ($hasAmf) { $enc = 'h264_amf (graphics card) + parallel segments' }
  if ($script:CFG.encoder -eq 'x264') { $enc = 'x264 (processor, set in Settings)' }
  $upd = 'not updated (no git or no network)'; if ($env:DA_UPDATE -eq 'ok') { $upd = ((& git -C $repo log -1 --format='%h  %cr' 2>$null) | Select-Object -First 1) }
  $pairs = @(@('user', ($env:USERNAME + '@' + $env:COMPUTERNAME)), @('-', ''), @('os', $osName), @('cpu', ($cpuName + '  (' + [Environment]::ProcessorCount + ' threads)')), @('gpu', $gpuName), @('ram', $ramTxt),
    @('encoder', $enc), @('node', $nodeV), @('engine', $upd), @('theme', ([string]$script:CFG.theme + '  (menu: Look)')))
  if ($script:CFG.sysinfo) { Show-Panel $pairs } else { WL ('   gpu  ' + $gpuName) 'Gray'; WL }
  $script:CFG.animate = $a
}
function Read-Jobs {
  $job = Get-Content -Raw (Join-Path $pc 'job.json') | ConvertFrom-Json
  if ($job.queue) { return @($job.queue) }; return @($job)
}
# the cover goes where the job says (videos/<series>_cover.jpg), else next to the video
function Cover-Rel($j) { if ($j.cover) { return ([string]$j.cover) }; return ('videos/' + $j.name + '_cover.jpg') }
function Frames-Of([string]$ep) { $d = Join-Path $out ('frames_' + $ep); $n = 0; if (Test-Path -LiteralPath $d) { $n = [IO.Directory]::GetFiles($d, 'f_*.jpg').Length }; return $n }

# ---------- renderer packages and 3D people (the render, the cover and the GPU test all need them) ----------
function Ensure-Assets([string]$num) {
  Stage $num 'Assets'
  $lockA = Join-Path $studio 'package-lock.json'; $lockB = Join-Path $studio 'node_modules\.package-lock.json'
  if (-not (Test-Path -LiteralPath $lockB) -or (Get-Item -LiteralPath $lockA).LastWriteTime -gt (Get-Item -LiteralPath $lockB).LastWriteTime) {
    Set-Location $studio; $null = Run 'npm' @('install', '--no-audit', '--no-fund'); Set-Location $repo
  }
  if ((Ensure-Models $studio $pc) -ne 0) { Set-Location $repo; Done 'FAIL' 'the 3D people download failed'; Tail 12; return $false }
  Set-Location $repo
  Done 'OK' ('3D people ready (' + @(Get-ChildItem -Directory (Join-Path $studio 'engine\models\rocketbox') -ErrorAction SilentlyContinue).Count + ')')
  return $true
}

# ---------- the pipeline: render (everything), resume (keeps the frames on disk), cover (only the covers) ----------
function Invoke-Job([string]$mode) {
  Start-Log $log ('DeatAnimation Render Engine ' + $VERSION + ' (' + $mode + ')')
  $t0 = Get-Date
  $ok = $false; $shut = $false; $warn = @(); $ready = New-Object System.Collections.ArrayList; $jobs = @()
  try {
    $jobs = Read-Jobs
    foreach ($j in $jobs) { W '   job      ' 'DarkGray'; WL ($j.name + ' (' + $j.ep + ')  ' + $j.note) 'Gray' }
    WL
    if ($mode -ne 'cover') {
      $sd = [string]$script:CFG.shutdown
      if ($sd -eq 'yes') { $shut = $true; WL '  The PC shuts down when the video is ready (Settings).' 'White' }
      elseif ($sd -eq 'ask') { $shut = Ask-YesNo 'Shut the PC down when the video is ready?' $true 20 }
      WL
    }
    $NS = '7'
    if ($mode -eq 'cover') { $NS = '3' }

    # 1. the engine: RENDER.bat updated it before anything else
    Stage ('1/' + $NS) 'Update'
    $head = ((& git log -1 --format='%h %s') | Select-Object -First 1)
    if ($env:DA_UPDATE -eq 'ok') { Done 'OK' $head } else { Done 'WARN' ('not updated: rendering the version already here (' + $head + ')'); $warn += 'not updated' }

    # 2. clean up: last runs' videos (the covers are kept: they are part of the project), frames, soundtracks, sheets
    if ($mode -ne 'cover') {
      Stage ('2/' + $NS) 'Clean up'
      $freed = 0.0; $nDel = 0; $kept = 0
      foreach ($f in @(Get-ChildItem -LiteralPath (Join-Path $repo 'videos') -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -eq '.mp4' -or $_.Extension -eq '.txt' -or $_.Extension -eq '.mov' })) {
        $freed += $f.Length; $nDel++; Remove-Item -Force -LiteralPath $f.FullName -ErrorAction SilentlyContinue
      }
      foreach ($d in @(Get-ChildItem -LiteralPath $out -ErrorAction SilentlyContinue)) {
        if ($d.FullName -eq $log) { continue }
        if ($mode -eq 'resume' -and $d.PSIsContainer -and $d.Name -like 'frames_*') { $kept += [IO.Directory]::GetFiles($d.FullName, 'f_*.jpg').Length; continue }
        if ($d.PSIsContainer) { $m = (Get-ChildItem -LiteralPath $d.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($m) { $freed += $m } } else { $freed += $d.Length }
        Remove-Item -Recurse -Force -LiteralPath $d.FullName -ErrorAction SilentlyContinue; $nDel++
      }
      $kd = ''; if ($mode -eq 'resume') { $kd = ', kept ' + $kept + ' frames' }
      Done 'OK' ('freed ' + (Size $freed) + ' (' + $nDel + ' old files and folders)' + $kd)
    }

    # 3. renderer packages and 3D people
    $an = '3/' + $NS; if ($mode -eq 'cover') { $an = '2/3' }
    if (-not (Ensure-Assets $an)) { throw 'assets' }

    $k = 0
    foreach ($j in $jobs) {
      $k++; $ep = $j.ep; $name = $j.name
      if ($jobs.Count -gt 1) { WL; WL ('  VIDEO ' + $k + '/' + $jobs.Count + ': ' + $name + ' (' + $ep + ')') 'White'; Log ('VIDEO ' + $k + '/' + $jobs.Count + ': ' + $name) }
      $coverRel = Cover-Rel $j; $coverAbs = Join-Path $repo ($coverRel.Replace('/', '\'))
      $wantCover = ($null -ne $j.coverT) -and [bool]$script:CFG.cover
      try {
        if ($mode -eq 'cover') {
          Stage '3/3' 'Cover'
          if ($null -eq $j.coverT) { Done 'SKIP' 'no cover time in job.json (coverT)'; continue }
          $cv = @('studio/render.mjs', '--ep', $ep, '--cover', [string]$j.coverT, '--coverOut', $coverRel, '--gpu')
          $c = RunStage 'node' $cv
          if ($c -eq 3) { $c = RunStage 'node' ($cv + @('--headed')) }
          if ($c -eq 0 -and (Test-Path -LiteralPath $coverAbs)) { Done 'OK' ($coverRel.Replace('/', '\') + '  (' + $j.coverT + ' s)'); [void]$ready.Add($coverAbs) } else { Done 'FAIL' 'no cover'; Tail 8; $warn += 'cover' }
          continue
        }

        # 4. soundtrack: made in the background while the render starts
        $wav = 'studio/out/' + $ep + '_phone.wav'
        $bgA = Start-Bg 'py' @('-3', ('studio/audio/' + $ep + '.py'), $wav) $repo
        Line '4/7' 'Soundtrack' 'RUN' 'in the background, while the render runs' -1

        # 5. render: the workers run in the background (their output in a log), the window shows the progress
        Stage '5/7' 'Render'
        $workers = [int]$j.workers; if ([int]$script:CFG.workers -gt 0) { $workers = [int]$script:CFG.workers }
        if ($workers -lt 1) { $workers = 3 }
        $mx = ''; if ([int]$script:CFG.maxWorkers -gt 0) { $mx = ', at most ' + [int]$script:CFG.maxWorkers }
        WL (' ' + $workers + ' workers to start, more while the graphics card has room (up to 100%' + $mx + ')') 'DarkGray'
        $frames = Join-Path $out ('frames_' + $ep)
        $wlog = Join-Path $out 'render_workers_log.txt'; $werr = Join-Path $out 'render_workers_err.txt'
        $tr = Get-Date; $n0 = Frames-Of $ep
        $ra = @('studio/tools/renderall.mjs', '--ep', $ep, '--out', ('studio/out/frames_' + $ep), '--workers', [string]$workers, '--gpu')
        if ([int]$script:CFG.maxWorkers -gt 0) { $ra += @('--max', [string][int]$script:CFG.maxWorkers) }
        if ($wantCover) { $ra += @('--cover', [string]$j.coverT, '--coverOut', $coverRel) }
        $p = Start-Process -FilePath 'node' -ArgumentList $ra -WorkingDirectory $repo -NoNewWindow -PassThru -RedirectStandardOutput $wlog -RedirectStandardError $werr
        $null = $p.Handle                                   # keeps the exit code readable after the process ends
        $row = [Console]::CursorTop; $live = $true
        try { [Console]::SetCursorPosition(0, $row) } catch { $live = $false }
        $hist = New-Object System.Collections.ArrayList; $fpsH = New-Object System.Collections.ArrayList; $gpuH = New-Object System.Collections.ArrayList; $cpuH = New-Object System.Collections.ArrayList
        $u = Get-Usage; $lastU = Get-Date; $tick = 0; $lastPct = -10; $renderer = ''; $nf = 0; $nw = 0
        while (-not $p.HasExited) {
          $n = Frames-Of $ep
          $now = Get-Date; [void]$hist.Add(@($now, $n)); while ($hist.Count -gt 2 -and ($now - $hist[0][0]).TotalSeconds -gt 15) { $hist.RemoveAt(0) }
          $span = ($now - $hist[0][0]).TotalSeconds; $fps = 0.0; if ($span -gt 0.5) { $fps = ($n - $hist[0][1]) / $span }
          if (($now - $lastU).TotalSeconds -ge 3) {
            $u = Get-Usage; $lastU = Get-Date
            if (Test-Path -LiteralPath $wlog) {
              $tl = @(Get-Content -LiteralPath $wlog -Tail 60 -ErrorAction SilentlyContinue)
              if ($nf -le 0) { $r = Select-String -LiteralPath $wlog -Pattern '\[ctl\] (\d+) frames' -List -ErrorAction SilentlyContinue; if ($r) { $nf = [int]$r.Matches[0].Groups[1].Value } }
              if (-not $renderer) { $r = Select-String -LiteralPath $wlog -Pattern 'renderer: (.*)$' -List -ErrorAction SilentlyContinue; if ($r) { $renderer = $r.Matches[0].Groups[1].Value } }
              for ($q = $tl.Count - 1; $q -ge 0; $q--) { if ($tl[$q] -match '\[ctl\] workers (\d+)') { $nw = [int]$Matches[1]; break } }
            }
          }
          $eta = -1.0; if ($fps -gt 0.05 -and $nf -gt 0) { $eta = ($nf - $n) / $fps }
          $f = 0.0; if ($nf -gt 0) { $f = $n / $nf }
          if ($live) {
            [Console]::SetCursorPosition(0, $row)
            if ($n -eq $n0 -or $nf -le 0) { Out-Raw ('        ' + (C $script:SPIN[$tick % $script:SPIN.Count] $script:T.b) + (C ('  starting the workers (loading the scene, people and shaders)...  ' + (Mmss ($now - $tr).TotalSeconds)).PadRight(80) $script:T.dim)); [Console]::WriteLine() }
            else {
              [void]$fpsH.Add($fps); [void]$gpuH.Add([Math]::Max(0, $u.gpu)); [void]$cpuH.Add([Math]::Max(0, $u.cpu))
              Out-Raw ('        ' + (UiBar $f ([int]$script:CFG.width)) + (C ('  {0,5:0.0}%' -f ($f * 100)) $script:T.text) + (C ('   {0,4}/{1}   ETA {2}' -f $n, $nf, (Mmss $eta)).PadRight(30) $script:T.dim)); [Console]::WriteLine()
            }
            $vr = 'n/a'; if ($u.vram -ge 0) { $vr = ('{0:0.0} GB' -f $u.vram) }
            $rm = 'n/a'; if ($u.ram -ge 0) { $rm = ('{0:0.0}/{1:0} GB' -f $u.ram, $u.ramT) }
            $wk = ''; if ($nw -gt 0) { $wk = '   workers ' + $nw }
            Out-Raw ('        ' + (C 'fps ' $script:T.dim) + (Sparkline $fpsH 16 0) + (C (' {0,5:0.0}' -f $fps) $script:T.text) + (C '   gpu ' $script:T.dim) + (Sparkline $gpuH 12 100) + (C (Pct $u.gpu) $script:T.text) + (C '   cpu ' $script:T.dim) + (Sparkline $cpuH 12 100) + (C (Pct $u.cpu) $script:T.text) + (C ('   vram ' + $vr + '  ram ' + $rm + $wk).PadRight(46) $script:T.dim)); [Console]::WriteLine()
          } elseif ([int]($f * 10) -gt $lastPct) { $lastPct = [int]($f * 10); WL ('        ' + (Bar $f 30) + ('  {0,3:0}%  ETA {1}' -f ($f * 100), (Mmss $eta))) 'Gray' }
          $tick++; Start-Sleep -Milliseconds 500
        }
        $p.WaitForExit(); $code = $p.ExitCode
        if ($live) { [Console]::SetCursorPosition(0, $row + 2) }
        $wl = @(Get-Content -LiteralPath $wlog -ErrorAction SilentlyContinue)
        foreach ($l in $wl + @(Get-Content -LiteralPath $werr -ErrorAction SilentlyContinue)) { Log $l }
        if ($nf -le 0) { foreach ($l in $wl) { if ($l -match '\[ctl\] (\d+) frames') { $nf = [int]$Matches[1]; break } } }
        $rmin = ((Get-Date) - $tr).TotalMinutes
        $n = Frames-Of $ep
        Out-Raw ('        ' + (UiBar ($n / [Math]::Max(1, $nf)) ([int]$script:CFG.width)) + (C ('  ' + ($n - $n0) + ' frames in ' + (Mmss ($rmin * 60)) + (' ({0:0.0} fps)' -f (($n - $n0) / [Math]::Max(1, $rmin * 60)))) $script:T.text)); [Console]::WriteLine()
        $pk = @($wl | Where-Object { $_ -match '^RENDER (OK|FAILED)' }) | Select-Object -First 1
        if ($renderer) { WL ('        ' + $renderer) 'DarkGray' }
        if ($pk -match 'up to (\d+) workers') { WL ('        up to ' + $Matches[1] + ' workers') 'DarkGray' }
        if ($code -ne 0 -or $nf -le 0 -or $n -lt $nf) {
          WL '        RENDER FAILED. Last lines of the workers:' 'Red'
          Get-Content -LiteralPath $wlog -Tail 14 -ErrorAction SilentlyContinue | ForEach-Object { WL ('        ' + $_) 'DarkRed' }
          $null = Wait-Bg $bgA
          WL '        The frames already made are kept: Resume (menu 2) renders only the missing ones.' 'Yellow'
          throw 'render'
        }

        # the soundtrack (made during the render) and the cover (made by the last worker)
        $ca = Wait-Bg $bgA
        if ($ca -ne 0) { Line '4/7' 'Soundtrack' 'FAIL' 'the soundtrack failed' $bgA.secs; $bgA.out | Select-Object -Last 10 | ForEach-Object { WL ('        ' + $_) 'DarkRed' }; throw 'soundtrack' }
        $dur = [double]((& ffprobe -v error -show_entries format=duration -of csv=p=0 $wav) | Select-Object -First 1)
        $sd = ''; if ([Math]::Abs([Math]::Round($dur * 30) - $nf) -gt 2) { $sd = '  (video ' + $nf + ' frames)' }
        Line '4/7' 'Soundtrack' 'OK' (('{0:0.0} s, made during the render' -f $dur) + $sd) $bgA.secs
        if ($wantCover) {
          if (@($wl | Where-Object { $_ -match '^COVER OK' }).Count -and (Test-Path -LiteralPath $coverAbs)) { Line '   ' 'Cover' 'OK' ($coverRel.Replace('/', '\') + '  (frame at ' + $j.coverT + ' s, made by the last worker)') -1 }
          else { Line '   ' 'Cover' 'WARN' 'no cover (menu 3 makes it again)'; $warn += 'cover' }
        }

        # 6. encode (HQ + phone), sound check and flicker check; the frame check and the contact sheet run alongside
        Stage '6/7' 'Encode'
        $sheet = Join-Path $out ($name + '_sheet.jpg')
        $bgC = Start-Bg 'py' @('-3', 'studio/tools/checkframes.py', ('studio/out/frames_' + $ep), [string]$nf) $repo
        $bgS = Start-Bg 'py' @('-3', 'studio/tools/sheet1fps.py', ('studio/out/frames_' + $ep), ('studio/out/' + $name + '_sheet.jpg')) $repo
        if ($script:CFG.encoder -eq 'x264') { $env:ENCODER = 'x264' } else { Remove-Item Env:\ENCODER -ErrorAction SilentlyContinue }
        $c7 = RunStage $bash @('studio/encode.sh', ('studio/out/frames_' + $ep), $wav, ('videos/' + $name))
        $enc = $script:LastOut
        $phone = Join-Path $repo ('videos\' + $name + '_phone.mp4')
        if (-not (Test-Path -LiteralPath $phone)) { Done 'FAIL' 'the encoding failed'; Tail 12; $null = Wait-Bg $bgC; $null = Wait-Bg $bgS; throw 'encode' }
        $lufs = ''; $pl = @($enc | Where-Object { $_ -match '^OK .*_phone\.mp4' }) | Select-Object -First 1
        if ($pl -match '(-?[\d.]+) LUFS') { $lufs = '  ' + $Matches[1] + ' LUFS' }
        $encd = @($enc | Where-Object { $_ -match '^ENCODER ' }) | Select-Object -First 1; $how = ''; if ($encd -match 'ENCODER amf\s+(.*)$') { $how = '  (graphics card, ' + $Matches[1] + ')' } elseif ($encd -match 'ENCODER x264\s+(.*)$') { $how = '  (processor, ' + $Matches[1] + ')' }
        if ($c7 -ne 0) { Done 'WARN' ('sound check: ' + (@($enc) | Select-Object -Last 1)); $warn += 'sound' }
        else { Done 'OK' ($name + '_phone.mp4  ' + (Size (Get-Item -LiteralPath $phone).Length) + $lufs + $how) }
        if ($j.post -and (Test-Path -LiteralPath (Join-Path $repo $j.post))) { Copy-Item -LiteralPath (Join-Path $repo $j.post) -Destination (Join-Path $repo ('videos\' + $name + '_post.txt')) -Force }   # captions + times next to the video
        $fl = @($enc | Where-Object { $_ -match 'FLICKER CHECK' }) | Select-Object -First 1
        $secs = @(Get-Content -LiteralPath (Join-Path $repo ('videos\' + $name + '_flicker.txt')) -ErrorAction SilentlyContinue | Where-Object { $_ -match '<--' } | ForEach-Object { Log $_; ($_.Trim() -split '\s+')[0] + ' s' })
        if (-not $fl) { Line '   ' 'Flicker check' 'SKIP' 'no result' -1 } elseif ($fl -match 'OK') { Line '   ' 'Flicker check' 'OK' 'no flicker' -1 } else { Line '   ' 'Flicker check' 'WARN' ('at ' + ($secs -join ', ') + ': send me the log') -1; $warn += 'flicker' }
        # every frame exists, decodes, and has no black hole (a NaN blurred by the bloom)
        $c6 = Wait-Bg $bgC
        $black = @($bgC.out | Where-Object { $_ -match '^BLACK AREAS' })
        if ($c6 -ne 0) { Line '   ' 'Frame check' 'FAIL' 'some frames are missing or broken: send me the log' $bgC.secs; $warn += 'frames' }
        elseif ($black.Count) { Line '   ' 'Frame check' 'WARN' $black[0] $bgC.secs; $warn += 'black areas' } else { Line '   ' 'Frame check' 'OK' ($nf.ToString() + ' frames, no black areas') $bgC.secs }

        # 7. contact sheet (1 frame per second, for the review), then the frames go (about 1 GB) unless kept in Settings
        Stage '7/7' 'Sheet + tidy'
        $null = Wait-Bg $bgS
        $fsz = (Get-ChildItem -LiteralPath $frames -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $fd = 'frames kept (Settings): ' + (Size $fsz)
        if (-not $script:CFG.keepFrames) { Remove-Item -Recurse -Force -LiteralPath $frames -ErrorAction SilentlyContinue; $fd = 'frames deleted: ' + (Size $fsz) }
        if (Test-Path -LiteralPath $sheet) { Done 'OK' ('studio\out\' + $name + '_sheet.jpg  (' + $fd + ')') } else { Done 'WARN' ('no sheet  (' + $fd + ')') }
        [void]$ready.Add($phone)
      } catch {
        Log ('STOPPED ' + $name + ': ' + $_); WL ('        ' + $name + ' stopped (' + $_ + ')') 'Red'; $warn += ($name + ' failed')
      }
    }
    $ok = $ready.Count -gt 0
  } catch {
    Log ('STOPPED: ' + $_); WL ('  stopped: ' + $_) 'Red'
  } finally {
    Set-Location $repo
    $tm = Mmss ((Get-Date) - $t0).TotalSeconds
    WL
    WL ('  ' + ('=' * 76)) 'DarkGray'
    if ($ok) { Show-Outro 'READY' $true } else { Show-Outro 'FAIL' $false }
    $what = 'VIDEO READY'; if ($mode -eq 'cover') { $what = 'COVER READY' }
    if ($ok) {
      W ('  ' + $what) 'Green'; WL ('   ' + $ready.Count + ' of ' + @($jobs).Count + '   (total ' + $tm + ')') 'White'
      foreach ($ph in $ready) { WL ('  ' + $ph) 'Gray' }
      if ($warn.Count) { WL ('  warnings: ' + ($warn -join ', ') + '. Send me the log: studio\out\pc_render_log.txt') 'Yellow' }
      if ($mode -ne 'cover') { WL '  Play it from Photos with the volume up.' 'DarkGray' }
    } else {
      W '  NOTHING MADE' 'Red'; WL ('   (after ' + $tm + ')  Send me the log: studio\out\pc_render_log.txt') 'White'
    }
    WL ('  ' + ('=' * 76)) 'DarkGray'
    Log ('total ' + $tm + '. ' + $(if ($ok) { $what } else { 'NOTHING MADE' }))
  }
  if ($shut) {
    $cancel = $false; $end = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $end) {
      W ("`r  Shutting down in " + [int][Math]::Ceiling(($end - (Get-Date)).TotalSeconds) + ' s  (press any key to cancel)  ') 'Yellow'
      if (Key-Available) { $null = Read-Key; $cancel = $true; break }
      Start-Sleep -Milliseconds 100
    }
    WL
    if ($cancel) { WL '  shutdown cancelled' 'Gray' } else { & shutdown.exe /s /t 5 /c 'DeatAnimation: the video is ready in the videos folder.'; $script:ShutNow = $true; return }
  }
  if ($ok -and $ready.Count) { Start-Process explorer.exe -ArgumentList ('/select,"' + $ready[$ready.Count - 1] + '"') }   # the folder, with the file selected
}

# ---------- GPU test: one frame of the job on the graphics card, the renderer's name and the time ----------
function Invoke-GpuTest {
  Start-Log $log ('DeatAnimation Render Engine ' + $VERSION + ' (GPU test)')
  try {
    $j = @(Read-Jobs)[0]; $t = 5.0; if ($null -ne $j.coverT) { $t = [double]$j.coverT }
    # v3.1: the test used to start without the new 3D people of the job (their avatar.json was not there yet): assets first
    if (-not (Ensure-Assets '1/3')) { return }
    Stage '2/3' '3D render (GPU)'
    $argv = @('studio/render.mjs', '--ep', $j.ep, '--stills', $t.ToString([Globalization.CultureInfo]::InvariantCulture), '--gpu', '--out', 'studio/out/gputest')
    $c = RunStage 'node' $argv; $hd = ''
    if ($c -eq 3) { $c = RunStage 'node' ($argv + @('--headed')); $hd = '  (browser window: headless had no graphics card)' }
    $rn = ''; $ms = -1.0
    foreach ($l in $script:LastOut) { if ($l -match 'renderer: (.*)$') { $rn = $Matches[1] }; if ($l -match '^still \S+ (.*) (\d+) ms$') { $ms = [double]$Matches[2] } }
    if ($c -eq 0 -and $ms -ge 0) {
      $soft = $rn -match 'swiftshader|llvmpipe|software|basic render'
      $st = 'OK'; if ($soft) { $st = 'WARN' }
      Done $st ('1 frame in ' + $ms + ' ms, page ' + ('{0:0} s' -f ($script:LastSecs - $ms / 1000)) + $hd)
      WL ('        ' + $rn) 'DarkGray'
      if ($soft) { WL '        that is a software renderer, not the graphics card: send me the log' 'Yellow' } else { WL ('        about ' + ('{0:0.0}' -f (1000.0 / [Math]::Max(1, $ms))) + ' frames per second per worker on this shot') 'DarkGray' }
    } else { Done 'FAIL' 'no frame: send me the log'; Tail 10 }
    Stage '3/3' 'Video encoder'
    $c = RunStage $bash @('studio/tools/enctest.sh')
    $v = @($script:LastOut | Where-Object { $_ -match '^ENCTEST ' }) | Select-Object -First 1
    if ($v -match '^ENCTEST amf (.*)$') { Done 'OK' ('graphics card (h264_amf): ' + $Matches[1]) }
    elseif ($v -match '^ENCTEST x264 (.*)$') { Done 'WARN' ('processor only (x264): ' + $Matches[1]) }
    else { Done 'FAIL' 'no result: send me the log'; Tail 8 }
  } catch { WL ('  stopped: ' + $_) 'Red' }
}

# ---------- the menus ----------
function OnOff($v) { if ($v) { return 'on' }; return 'off' }
function Look-Items {
  $bar = UiBar 0.62 20; $bl = 20; if ($script:CFG.bar -eq 'ascii') { $bl = 22 }
  return @(
    @{ key = '1'; label = 'Theme'; cfg = 'theme'; opts = @('inferno', 'matrix', 'synth', 'ice', 'mono', 'custom'); info = ('< ' + $script:CFG.theme + ' >') },
    @{ key = '2'; label = 'Banner'; cfg = 'banner'; opts = @('block', 'shade', 'slant', 'double'); info = ('< ' + $script:CFG.banner + ' >') },
    @{ key = '3'; label = 'Progress bar'; cfg = 'bar'; opts = @('smooth', 'blocks', 'dots', 'ascii'); info = ('< ' + $script:CFG.bar + ' >'); raw = ((C ($script:CFG.bar + '  ').PadRight(8) $script:T.dim) + $bar); rawLen = (8 + $bl) },
    @{ key = '4'; label = 'Logo'; cfg = 'logo'; opts = @('cat', 'clap', 'none'); info = ('< ' + $script:CFG.logo + ' >') },
    @{ key = '5'; label = 'Animation speed'; cfg = 'speed'; opts = @(0.5, 1.0, 1.5, 2.0, 3.0); info = ('< x' + $script:CFG.speed + ' >') },
    @{ key = '6'; label = 'Animations'; cfg = 'animate'; opts = @($true, $false); info = ('< ' + (OnOff $script:CFG.animate) + ' >') },
    @{ key = '7'; label = 'Mouse trail'; cfg = 'trail'; opts = @($true, $false); info = ('< ' + (OnOff $script:CFG.trail) + ' >  characters fall from the pointer') },
    @{ key = '8'; label = 'System panel'; cfg = 'sysinfo'; opts = @($true, $false); info = ('< ' + (OnOff $script:CFG.sysinfo) + ' >') },
    @{ key = '9'; label = 'Outro'; cfg = 'outro'; opts = @($true, $false); info = ('< ' + (OnOff $script:CFG.outro) + ' >  the big READY at the end') },
    @{ sep = $true },
    @{ key = 'p'; label = 'Preview'; act = 'preview'; info = 'banner, bars and the end, with this look' },
    @{ key = '0'; label = 'Back'; act = 'back'; info = 'saved in pc\user.json (updates keep it)' }
  )
}
function Settings-Items($jobs) {
  $jw = 3; try { $jw = [int]@($jobs)[0].workers } catch {}
  $w = 'auto (job: ' + $jw + ')'; if ([int]$script:CFG.workers -gt 0) { $w = [string][int]$script:CFG.workers }
  $mw = 'auto'; if ([int]$script:CFG.maxWorkers -gt 0) { $mw = [string][int]$script:CFG.maxWorkers }
  $as = 'off'; if ([int]$script:CFG.autostart -gt 0) { $as = [string][int]$script:CFG.autostart + ' s' }
  $en = 'auto (graphics card if it can)'; if ($script:CFG.encoder -eq 'x264') { $en = 'x264 (processor)' }
  return @(
    @{ key = '1'; label = 'Workers at start'; cfg = 'workers'; opts = @(0, 1, 2, 3, 4, 5, 6, 8); info = ('< ' + $w + ' >') },
    @{ key = '2'; label = 'Max workers'; cfg = 'maxWorkers'; opts = @(0, 2, 4, 6, 8, 10, 12, 16); info = ('< ' + $mw + ' >  the pool grows while the GPU has room') },
    @{ key = '3'; label = 'Encoder'; cfg = 'encoder'; opts = @('auto', 'x264'); info = ('< ' + $en + ' >') },
    @{ key = '4'; label = 'Shut down after'; cfg = 'shutdown'; opts = @('ask', 'yes', 'no'); info = ('< ' + $script:CFG.shutdown + ' >') },
    @{ key = '5'; label = 'Auto-start'; cfg = 'autostart'; opts = @(0, 5, 10, 20, 30, 60); info = ('< ' + $as + ' >  Render starts by itself') },
    @{ key = '6'; label = 'Cover'; cfg = 'cover'; opts = @($true, $false); info = ('< ' + (OnOff $script:CFG.cover) + ' >  made by the render') },
    @{ key = '7'; label = 'Keep frames'; cfg = 'keepFrames'; opts = @($false, $true); info = ('< ' + (OnOff $script:CFG.keepFrames) + ' >  about 1 GB per video') },
    @{ sep = $true },
    @{ key = '0'; label = 'Back'; act = 'back'; info = 'saved in pc\user.json (updates keep it)' }
  )
}
function Edit-Menu([string]$title, [string]$which) {
  $sel = 0; $note = ''
  while ($true) {
    $jj = @(); try { $jj = Read-Jobs } catch {}
    if ($which -eq 'look') { $items = Look-Items } else { $items = Settings-Items $jj }
    $r = Select-Menu $title $items $sel 0 '' $note
    $sel = $r.i; $it = $items[$sel]; $note = ''
    if ($r.how -eq 'esc' -or $it.act -eq 'back') { return }
    if ($it.act -eq 'preview') {
      Menu-Clear; Clear-Host
      Show-Banner 'DEAT' ('A N I M A T I O N   //   render engine v' + $VERSION) 'V3.1'
      Stage-Head '5/7' 'Render'; [Console]::WriteLine()
      $fh = New-Object System.Collections.ArrayList
      for ($i = 0; $i -le 40; $i++) { $f = $i / 40.0; [void]$fh.Add(8 + 6 * [Math]::Sin($i / 4.0)); Out-Raw ("`r        " + (UiBar $f ([int]$script:CFG.width)) + (C ('  {0,5:0.0}%' -f ($f * 100)) $script:T.text) + '   ' + (Sparkline $fh 16 0)); Start-Sleep -Milliseconds ([int](50 / $script:SPD)) }
      [Console]::WriteLine(); Stage-Line '6/7' 'Encode' 'OK' 'demo_phone.mp4  27 MB  (graphics card, 12 segments)' 41
      Show-Outro 'READY' $true
      Wait-Back 'the menu'
      Clear-Host; Header $false; $script:MenuTop = -1
      continue
    }
    if ($it.opts) {
      $dir = 1; if ($r.how -eq 'left') { $dir = -1 }
      $script:CFG[$it.cfg] = Cycle $script:CFG[$it.cfg] $it.opts $dir
      Apply-Cfg
      if ($it.cfg -eq 'trail') { if ($script:CFG.trail) { Start-Trail $pc } else { Stop-Trail } }
      if (Save-User $userFile) { $note = 'saved' } else { $note = 'could not save pc\user.json' }
    }
  }
}
function Main-Items($jobs) {
  $names = (@($jobs) | ForEach-Object { $_.name }) -join ', '
  $nf = 0; foreach ($j in @($jobs)) { $nf += Frames-Of $j.ep }
  $res = @{ key = '2'; label = 'Resume'; act = 'resume'; info = 'no frames left from a stopped render'; dis = $true }
  if ($nf -gt 0) { $res = @{ key = '2'; label = 'Resume'; act = 'resume'; info = ('keeps the ' + $nf + ' frames on disk, renders the rest') } }
  $ct = @(@($jobs) | Where-Object { $null -ne $_.coverT })
  $cov = @{ key = '3'; label = 'Cover only'; act = 'cover'; info = 'no cover time (coverT) in job.json'; dis = $true }
  if ($ct.Count) { $cov = @{ key = '3'; label = 'Cover only'; act = 'cover'; info = ((Cover-Rel $ct[0]) + '  (' + $ct[0].coverT + ' s)') } }
  $lk = [string]$script:CFG.theme + ', ' + $script:CFG.banner + ', bar ' + $script:CFG.bar + ', trail ' + (OnOff $script:CFG.trail)
  $sw = 'auto'; if ([int]$script:CFG.workers -gt 0) { $sw = [string][int]$script:CFG.workers }
  $st = 'workers ' + $sw + ', encoder ' + $script:CFG.encoder + ', shutdown ' + $script:CFG.shutdown
  return @(
    @{ key = '1'; label = 'Render'; act = 'render'; info = $names },
    $res, $cov,
    @{ sep = $true },
    @{ key = '4'; label = 'Look'; act = 'look'; info = $lk },
    @{ key = '5'; label = 'Settings'; act = 'settings'; info = $st },
    @{ key = '6'; label = 'GPU test'; act = 'gpu'; info = 'a frame and the video encoder on the card' },
    @{ sep = $true },
    @{ key = '7'; label = 'Videos folder'; act = 'folder'; info = 'open it in Explorer' },
    @{ key = '8'; label = 'Last log'; act = 'log'; info = 'the end of studio\out\pc_render_log.txt' },
    @{ key = '0'; label = 'Quit'; act = 'quit'; info = '' }
  )
}

# ---------- main ----------
Start-Trail $pc
Header $true
Set-Location $repo
$first = $true; $sel = 0; $quit = $false; $script:ShutNow = $false
while (-not $quit) {
  $jobs = @(); $jerr = ''
  try { $jobs = Read-Jobs } catch { $jerr = 'pc\job.json cannot be read: ' + $_ }
  $items = Main-Items $jobs
  if ($jerr) { $items[0].dis = $true; $items[0].info = $jerr }
  $auto = 0; if ($first -and -not $jerr -and [int]$script:CFG.autostart -gt 0) { $auto = [int]$script:CFG.autostart }
  $r = Select-Menu ('MENU  ' + [char]0x00B7 + '  ' + @($jobs).Count + ' video(s) in pc\job.json') $items $sel $auto 'Render' ''
  $first = $false; $sel = $r.i; $act = $items[$sel].act
  if ($r.how -eq 'esc') { $act = 'quit' }
  if ($r.how -eq 'left' -or $r.how -eq 'right') { continue }
  $back = $true
  if ($act -eq 'look') { Edit-Menu ('LOOK  ' + [char]0x00B7 + '  changes show at once') 'look'; $back = $false }
  elseif ($act -eq 'settings') { Edit-Menu ('SETTINGS') 'settings'; $back = $false }
  elseif ($act -eq 'quit') { $quit = $true; $back = $false }
  elseif ($act -eq 'folder') { Start-Process explorer.exe -ArgumentList (Join-Path $repo 'videos'); $back = $false }
  else {
    Menu-Clear
    if ($act -eq 'render' -or $act -eq 'resume' -or $act -eq 'cover') { $null = Invoke-Job $act; if ($script:ShutNow) { $quit = $true; $back = $false } }
    elseif ($act -eq 'gpu') { $null = Invoke-GpuTest }
    elseif ($act -eq 'log') {
      WL ('  ' + $log) 'DarkGray'
      if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log -Tail 30 | ForEach-Object { WL ('  ' + $_) 'Gray' } } else { WL '  no log yet' 'Gray' }
    }
  }
  if ($back) { Wait-Back 'the menu'; Clear-Host; Header $false; $script:MenuTop = -1 }
}
Menu-Clear
Stop-Trail
exit 0
