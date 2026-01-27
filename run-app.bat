@echo off
setlocal enabledelayedexpansion

title MOSIP Resource Calculator

echo.
echo  +==============================================================+
echo  ^|           MOSIP SERVER SIZING CALCULATOR                     ^|
echo  ^|                    v1.0.0                                    ^|
echo  +==============================================================+
echo.

:: Set paths
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

:: Check if Python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python is not installed or not in PATH
    echo  Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH
    echo  Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo  [OK] Python found
echo  [OK] Node.js found
echo.

:: Check/Create Python virtual environment
if not exist "%BACKEND_DIR%\venv" (
    echo  [SETUP] Creating Python virtual environment...
    python -m venv "%BACKEND_DIR%\venv"
)

:: Check/Install backend dependencies
echo  [SETUP] Checking backend dependencies...
call "%BACKEND_DIR%\venv\Scripts\activate.bat"
pip install -r "%BACKEND_DIR%\requirements.txt" -q
echo  [OK] Backend dependencies ready
echo.

:: Check/Install frontend dependencies
if not exist "%FRONTEND_DIR%\node_modules" (
    echo  [SETUP] Installing frontend dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
    cd /d "%ROOT_DIR%"
)
echo  [OK] Frontend dependencies ready
echo.

echo  ==============================================================
echo                       STARTING SERVERS
echo  ==============================================================
echo.

:: Start Backend Server
echo  [STARTING] Backend API Server...
start "MOSIP Backend - FastAPI" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Wait for backend to initialize
echo  [WAITING] Waiting for backend to initialize...
timeout /t 4 /nobreak >nul

:: Start Frontend Server
echo  [STARTING] Frontend Dev Server...
start "MOSIP Frontend - Vite" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

:: Wait for frontend to initialize
timeout /t 3 /nobreak >nul

echo.
echo  ==============================================================
echo                       SERVERS RUNNING
echo  ==============================================================
echo.
echo    Frontend App:      http://localhost:5173
echo    Backend API:       http://localhost:8000
echo    API Documentation: http://localhost:8000/docs
echo.
echo  ==============================================================
echo.

:: Ask to open browser
choice /c YN /m "  Open application in browser"
if %errorlevel% equ 1 (
    start http://localhost:5173
)

echo.
echo  [INFO] Servers are running in separate windows.
echo  [INFO] Close those windows to stop the servers.
echo.
pause
