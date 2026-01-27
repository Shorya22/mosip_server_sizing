@echo off
echo ========================================
echo   MOSIP Resource Calculator - Full App
echo ========================================
echo.
echo Starting Backend and Frontend servers...
echo.

:: Start Backend in a new window
start "MOSIP Backend" cmd /k "%~dp0run-backend.bat"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend in a new window
start "MOSIP Frontend" cmd /k "%~dp0run-frontend.bat"

echo.
echo ========================================
echo   Servers are starting...
echo ========================================
echo.
echo   Backend API:    http://localhost:8000
echo   API Docs:       http://localhost:8000/docs
echo   Frontend App:   http://localhost:5173
echo.
echo   Close this window or press any key to exit.
echo   (Servers will continue running in their windows)
echo ========================================

pause
