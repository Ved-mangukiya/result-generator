@echo off
echo ========================================
echo   Apex Tuition ERP - Server Startup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Recommended: Download LTS version
    echo.
    pause
    exit /b 1
)

REM Display Node.js version
echo [INFO] Node.js found:
node --version
echo.

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed!
    echo.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    echo This may take a few minutes on first run...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed successfully!
    echo.
)

REM Check if port 3000 is already in use
netstat -ano | findstr :3000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 3000 is already in use!
    echo.
    echo Would you like to kill the existing process? (Y/N)
    set /p KILL_PORT=
    if /i "%KILL_PORT%"=="Y" (
        echo Killing process on port 3000...
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
            taskkill /F /PID %%a >nul 2>nul
        )
        echo Process killed.
        echo.
    )
)

REM Start the server
echo [INFO] Starting Apex Tuition ERP Server...
echo.
echo ========================================
echo   Server will start at:
echo   http://localhost:3000
echo ========================================
echo.
echo   Default Login Credentials:
echo   Email: admin@result.local
echo   Password: admin123
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

node backend/server.js

pause
