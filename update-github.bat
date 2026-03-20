@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%"

title YvanLouise GitHub Updater

call :check_git
if errorlevel 1 exit /b 1
call :check_repo
if errorlevel 1 exit /b 1
call :check_origin
if errorlevel 1 exit /b 1
call :get_branch
if errorlevel 1 exit /b 1
call :get_ahead_count
if errorlevel 1 exit /b 1

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
if errorlevel 1 goto commit_changes

if not "%AHEAD_COUNT%"=="0" (
  echo No new file changes to commit.
  echo Found %AHEAD_COUNT% local commit(s) waiting to be pushed.
  goto push_branch
)

echo No staged changes found and no local commits are waiting to push.
pause
exit /b 0

:commit_changes
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

:push_branch
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

:get_ahead_count
set "AHEAD_COUNT=0"
for /f "usebackq delims=" %%i in (`git rev-list --count origin/%CURRENT_BRANCH%..HEAD 2^>nul`) do set "AHEAD_COUNT=%%i"
if not defined AHEAD_COUNT set "AHEAD_COUNT=0"
exit /b 0
