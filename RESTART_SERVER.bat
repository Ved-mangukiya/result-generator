@echo off
echo ========================================
echo   Restarting EduTrack ERP Server
echo ========================================
echo.

echo [INFO] Stopping all running Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo [INFO] Waiting for processes to close...
timeout /t 2 /nobreak >nul

echo [INFO] Starting EduTrack ERP Server...
echo.
echo ====================================================
echo   EduTrack ERP — Institutional Management System
echo   Server URL: http://localhost:3000
echo ====================================================
echo.
echo   Default Admin: admin@result.local / admin123
echo   Faculty Login:  [username]@edutrack.local / teacher@123
echo ====================================================
echo.

start cmd /k "cd /d "%~dp0" && npm start"

echo.
echo Server is starting in a new window...
echo You can close this window now.
echo.
pause
