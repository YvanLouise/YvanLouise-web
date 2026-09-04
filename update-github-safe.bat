@echo off
setlocal
chcp 65001 >nul
title YvanLouise GitHub Uploader (Safe)
cd /d "%~dp0"

where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 20 or later is required. Install Node.js and try again.
  pause
  exit /b 1
)

node.exe "%~dp0scripts\github-uploader.cjs" %*
set "UPLOAD_RESULT=%ERRORLEVEL%"
echo.
if not "%UPLOAD_RESULT%"=="0" echo Upload did not complete. Your local files and commits are still available.
pause
exit /b %UPLOAD_RESULT%
