@echo off
rem Preview of the Render Engine v3 look: edit pc\theme.json, then double-click this again.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0themedemo.ps1"