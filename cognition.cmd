@echo off
rem Launch cognition. Double-click or pin to Start.
rem First run: installs the dependencies and builds. After a git pull: rebuilds.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :nonode
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)"
if errorlevel 1 goto :nonode

if exist node_modules\electron\package.json goto :installed
echo cognition: installing dependencies (first run, a few minutes)...
call npm ci
if errorlevel 1 goto :failed
:installed

rem Electron fetches its own binary on first use, not at npm install
if exist node_modules\electron\dist\electron.exe goto :haveelectron
echo cognition: downloading Electron...
node node_modules\electron\install.js
if errorlevel 1 goto :failed
if not exist node_modules\electron\dist\electron.exe goto :failed
:haveelectron

set "HEAD="
for /f "delims=" %%h in ('git rev-parse HEAD 2^>nul') do set "HEAD=%%h"
set "BUILT="
if exist out\.built-sha set /p BUILT=<out\.built-sha
if not exist out\main\index.js goto :build
if not defined HEAD goto :run
if "%HEAD%"=="%BUILT%" goto :run
:build
echo cognition: building...
call npm run build
if errorlevel 1 goto :failed
if defined HEAD >out\.built-sha echo %HEAD%

:run
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit /b 0

:nonode
echo cognition needs Node.js 22.18 or newer. Install it from https://nodejs.org and run this again.
pause
exit /b 1

:failed
echo cognition: setup failed - see the messages above.
pause
exit /b 1
