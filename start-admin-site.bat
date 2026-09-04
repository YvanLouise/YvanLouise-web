@echo off
setlocal
title YvanLouise Local Admin
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 20 or later is required. Install Node.js and try again.
  pause
  exit /b 1
)
node.exe "%~dp0scripts\admin-launcher.cjs" %*
set "LAUNCH_RESULT=%ERRORLEVEL%"
if not "%LAUNCH_RESULT%"=="0" (
  echo.
  echo [ERROR] Startup failed. Review the message and log path above.
  pause
)
exit /b %LAUNCH_RESULT%
