@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :missing_node
where npm >nul 2>nul
if errorlevel 1 goto :missing_npm

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 goto :old_node

if not exist "node_modules\ws\package.json" (
  echo Installing OpenChat dependencies...
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto :failed
)

echo Starting OpenChat at http://localhost:3000
echo Keep this window open while using OpenChat. Press Ctrl+C to stop.
call npm start
if errorlevel 1 goto :failed
exit /b 0

:missing_node
echo Node.js 22 or later is required. Install it from https://nodejs.org/ and try again.
goto :failed

:missing_npm
echo npm was not found. Install Node.js 22 or later from https://nodejs.org/ and try again.
goto :failed

:old_node
echo Node.js 22 or later is required. Install the current LTS release from https://nodejs.org/ and try again.
goto :failed

:failed
echo.
pause
exit /b 1
