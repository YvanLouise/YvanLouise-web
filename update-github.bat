@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%"

title YvanLouise GitHub Updater

call :check_git || exit /b 1
call :check_repo || exit /b 1
call :check_origin || exit /b 1
call :get_branch || exit /b 1

echo Repository: %ROOT%
echo Remote:     origin
echo Branch:     %CURRENT_BRANCH%
echo.
echo Current changes:
git status --short
echo.

choice /M "Continue with git add, commit, and push"
if errorlevel 2 (
  echo Cancelled.
  pause
  exit /b 0
)

echo.
echo Staging all changes...
git add -A
if errorlevel 1 (
  echo git add failed.
  pause
  exit /b 1
)

git diff --cached --quiet
if not errorlevel 1 (
  echo No staged changes found. Nothing to push.
  pause
  exit /b 0
)

set "COMMIT_MESSAGE="
set /p COMMIT_MESSAGE=Commit message (leave blank to use timestamp): 
if not defined COMMIT_MESSAGE (
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'Update site yyyy-MM-dd HH:mm:ss'"`) do set "COMMIT_MESSAGE=%%i"
)

echo.
echo Committing with message:
echo %COMMIT_MESSAGE%
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
  echo git commit failed.
  echo Check whether your Git username and email are configured.
  pause
  exit /b 1
)

echo.
echo Pushing to origin/%CURRENT_BRANCH%...
git push origin %CURRENT_BRANCH%
if errorlevel 1 (
  echo git push failed.
  pause
  exit /b 1
)

echo.
echo GitHub update completed successfully.
pause
exit /b 0

:check_git
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed or not available in PATH.
  pause
  exit /b 1
)
exit /b 0

:check_repo
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo This folder is not a Git repository.
  pause
  exit /b 1
)
exit /b 0

:check_origin
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo Remote "origin" was not found.
  pause
  exit /b 1
)
exit /b 0

:get_branch
for /f "usebackq delims=" %%i in (`git branch --show-current`) do set "CURRENT_BRANCH=%%i"
if not defined CURRENT_BRANCH (
  echo Could not determine the current Git branch.
  echo Please switch to a normal branch before pushing.
  pause
  exit /b 1
)
exit /b 0
