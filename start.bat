@echo off
echo Starting dev server...
echo Press S + Enter to stop.
start /B cmd /C "npm run dev"

:LOOP
choice /C S /N /M "" >nul
if errorlevel 1 goto STOP
goto LOOP

:STOP
taskkill /F /IM node.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do taskkill /F /PID %%a >nul 2>&1
echo Servers stopped.
exit
