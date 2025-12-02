@echo off
REM Quick Start Script for Local Development (Windows)
REM Run with: quick-start.bat

echo ==================================
echo 🚀 Expense Tracker - Local Setup
echo ==================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo 📥 Download from: https://nodejs.org/
    pause
    exit /b 1
)

node --version
echo.

REM Install dependencies if needed
if not exist "local-server\node_modules" (
    echo 📦 Installing dependencies...
    cd local-server
    call npm install
    cd ..
    echo ✓ Dependencies installed
    echo.
) else (
    echo ✓ Dependencies already installed
    echo.
)

REM Start the server
echo 🚀 Starting local server...
echo.
echo Server will be available at:
echo   📍 Admin:  http://localhost:3000/admin.html
echo   📍 User:   http://localhost:3000/user.html
echo   📍 Tests:  http://localhost:3000/tests/frontend.test.html
echo   📍 Debug:  http://localhost:3000/debug
echo.
echo 🔑 Access Keys:
echo   Admin: admin123
echo   User:  user123
echo.
echo Press Ctrl+C to stop the server
echo ==================================
echo.

cd local-server
npm start
