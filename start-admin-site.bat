@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

title YvanLouise Admin Site Launcher

call :check_node || exit /b 1
call :ensure_env "backend\.env" "backend\.env.example"
call :ensure_env "admin-site\.env" "admin-site\.env.example"
call :ensure_deps || exit /b 1

echo [4/6] Checking backend...
call :check_url "http://localhost:4000/api/health"
if errorlevel 1 (
  start "YvanLouise API" cmd /k "cd /d ""%ROOT%"" && npm.cmd run dev:backend"
) else (
  echo Backend already running.
)

echo [5/6] Checking admin site...
call :check_admin_site
if errorlevel 1 (
  start "YvanLouise Admin Site" cmd /k "cd /d ""%ROOT%"" && npm.cmd run dev:admin-site"
) else (
  echo Admin site already running.
)

echo [6/6] Opening browser...
timeout /t 4 /nobreak >nul
start "" "http://localhost:5174/login"

echo Admin site:  http://localhost:5174
echo Backend API: http://localhost:4000
echo If you want mobile preview inside admin, also run start-public-site.bat.
exit /b 0

:check_node
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  pause
  exit /b 1
)
exit /b 0

:ensure_env
if not exist %~1 (
  copy /y %~2 %~1 >nul
  echo Created %~1 from template.
)
exit /b 0

:ensure_deps
if not exist "node_modules" (
  echo [3/6] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [3/6] Dependencies already installed.
)
exit /b 0

:check_url
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%

:check_admin_site
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5174/src/main.tsx' -UseBasicParsing -TimeoutSec 2; if ($r.Content -match 'admin-site/src/main.tsx') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%