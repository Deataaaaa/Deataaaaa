@echo off
rem DeatAnimation Render Engine v3: renders the current video (pc\job.json) on the graphics card and leaves it in the videos
rem folder. The whole script is one parenthesized block: cmd reads it once, so the update (git reset) cannot change it while it
rem runs. The update comes first, before PowerShell starts, so a new engine (render.ps1, ui.ps1, encode.sh) runs this time.
setlocal EnableDelayedExpansion
(
  cd /d "%~dp0"
  chcp 65001 >nul
  title DeatAnimation Render Engine v3
  set "DA_UPDATE=fail"
  echo   updating the engine...
  where git >nul 2>nul && (
    git -C "%~dp0.." fetch -q origin claude/whatif-reels && git -C "%~dp0.." reset -q --hard origin/claude/whatif-reels && set "DA_UPDATE=ok"
  )
  cls
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0render.ps1"
  echo.
  pause
  exit /b
)
