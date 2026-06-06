@echo off
echo ========================================
echo   Restarting Apex Tuition ERP Server
echo ========================================
echo.

echo [INFO] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo [INFO] Waiting for processes to close...
timeout /t 2 /nobreak >nul

echo [INFO] Starting server...
echo.
echo ========================================
echo   Server starting at:
echo   http://localhost:3000
echo ========================================
echo.
echo   Login: admin@result.local / admin123
echo ========================================
echo.

start cmd /k "cd /d "%~dp0" && npm start"

echo.
echo Server is starting in a new window...
echo You can close this window now.
echo.
pause
