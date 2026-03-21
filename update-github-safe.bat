@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%"

title YvanLouise GitHub Updater (Safe)

call :check_git || exit /b 1
call :check_repo || exit /b 1
call :check_origin || exit /b 1
call :get_branch || exit /b 1
call :count_changes || exit /b 1
call :count_ahead

echo Repository: %ROOT%
echo Remote:     origin
echo Branch:     %CURRENT_BRANCH%
echo.
echo Current changes:
git status --short
echo.
echo Pending local file changes: %CHANGE_COUNT%
echo Local commits waiting to push: %AHEAD_COUNT%
echo.

if "%CHANGE_COUNT%"=="0" if "%AHEAD_COUNT%"=="0" (
  echo Nothing to update. Your local branch is already in sync.
  call :hold
  exit /b 0
)

choice /M "Continue with GitHub update"
if errorlevel 2 (
  echo Cancelled.
  call :hold
  exit /b 0
)

if not "%CHANGE_COUNT%"=="0" (
  echo.
  echo Staging all changes...
  git add -A
  if errorlevel 1 (
    echo git add failed.
    call :hold
    exit /b 1
  )

  git diff --cached --quiet
  if errorlevel 1 (
    set "COMMIT_MESSAGE="
    set /p COMMIT_MESSAGE=Commit message - leave blank to use timestamp: 
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
      call :hold
      exit /b 1
    )
  ) else (
    echo No staged changes were produced after git add. Skipping commit.
  )
) else (
  echo No uncommitted file changes detected. Skipping commit.
)

call :count_ahead
if "%AHEAD_COUNT%"=="0" (
  echo.
  echo No local commits are waiting to be pushed.
  call :hold
  exit /b 0
)

echo.
echo Pushing %AHEAD_COUNT% local commit(s) to origin/%CURRENT_BRANCH%...
git push origin %CURRENT_BRANCH%
if errorlevel 1 (
  echo git push failed.
  echo Your local commits are still safe on this computer.
  echo If this is a network issue, try again later or switch networks.
  call :hold
  exit /b 1
)

echo.
echo GitHub update completed successfully.
call :hold
exit /b 0

:check_git
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed or not available in PATH.
  call :hold
  exit /b 1
)
exit /b 0

:check_repo
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo This folder is not a Git repository.
  call :hold
  exit /b 1
)
exit /b 0

:check_origin
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo Remote "origin" was not found.
  call :hold
  exit /b 1
)
exit /b 0

:get_branch
for /f "usebackq delims=" %%i in (`git branch --show-current`) do set "CURRENT_BRANCH=%%i"
if not defined CURRENT_BRANCH (
  echo Could not determine the current Git branch.
  echo Please switch to a normal branch before pushing.
  call :hold
  exit /b 1
)
exit /b 0

:count_changes
set "CHANGE_COUNT=0"
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set "CHANGE_COUNT=%%i"
exit /b 0

:count_ahead
set "AHEAD_COUNT=0"
for /f %%i in ('git rev-list --count "origin/%CURRENT_BRANCH%..%CURRENT_BRANCH%" 2^>nul') do set "AHEAD_COUNT=%%i"
if not defined AHEAD_COUNT set "AHEAD_COUNT=0"
exit /b 0

:hold
echo.
choice /C X /N /M "Press X to close this window..."
echo.
exit /b 0
