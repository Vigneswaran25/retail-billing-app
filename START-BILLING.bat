@echo off
title Ayyanar Metal - Billing Software
color 0A

REM ── Change to the folder where this .bat file lives ──────────────────────────
cd /d "%~dp0"

echo.
echo  ==========================================
echo    AYYANAR METAL - Billing Software
echo  ==========================================
echo.

REM ── Check if .env exists ─────────────────────────────────────────────────────
if not exist ".env" (
    echo  [ERROR] .env file not found in this folder!
    echo  Please make sure .env is in the same folder as this file.
    pause
    exit /b 1
)

REM ── Try to start PostgreSQL (common service names) ───────────────────────────
sc query postgresql-x64-16 >nul 2>&1 && net start postgresql-x64-16 >nul 2>&1
sc query postgresql-x64-15 >nul 2>&1 && net start postgresql-x64-15 >nul 2>&1
sc query postgresql >nul 2>&1          && net start postgresql >nul 2>&1

timeout /t 2 /nobreak >nul

REM ── Launch the app ────────────────────────────────────────────────────────────
echo  [OK] Starting server...
echo  [OK] Open your browser at: http://localhost:5000
echo.
echo  Do NOT close this window while using the billing software.
echo  Press Ctrl+C to stop.
echo.

if exist "ayyanar-billing.exe" (
    ayyanar-billing.exe
) else (
    node server\index.js
)

pause
