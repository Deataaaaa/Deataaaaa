@echo off
rem DeatAnimation: one-time setup of this PC as the render machine. Double-click it once (safe to run again).
cd /d "%~dp0"
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
echo.
pause
