@echo off
rem DeatAnimation Render Engine (beta): renders the current video (pc\job.json) on the graphics card and leaves it in
rem the videos folder. The whole script is one parenthesized block: cmd reads it once, so the self-update (git reset)
rem cannot change it while it runs.
setlocal EnableDelayedExpansion
(
  cd /d "%~dp0"
  chcp 65001 >nul
  title DeatAnimation Render Engine (beta)
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0render.ps1"
  echo.
  pause
  exit /b
)
