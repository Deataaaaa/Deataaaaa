@echo off
rem DeatAnimation: renders the current video (pc\job.json) on the graphics card, puts it in Google Drive, shuts down.
rem The whole script is one parenthesized block: cmd reads it once, so the self-update (git pull) cannot change it
rem while it runs.
setlocal EnableDelayedExpansion
(
  cd /d "%~dp0"
  chcp 65001 >nul
  echo DeatAnimation render: the video will be in Google Drive, folder DeatAnimation.
  choice /C YN /T 20 /D Y /M "Shut the PC down when it is finished? (yes in 20 s)"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0render.ps1" -Choice !ERRORLEVEL!
  echo.
  pause
  exit /b
)
