@echo off
title Building Ayyanar Metal Billing App...
color 0E
cd /d "%~dp0"

echo.
echo  ==========================================
echo    Building Ayyanar Metal Billing App
echo  ==========================================
echo.

REM ── Step 1: Build React Frontend ─────────────────────────────────────────────
echo  [1/4] Building React frontend...
cd client
call npm run build
if errorlevel 1 ( echo [ERROR] React build failed! & pause & exit /b 1 )
echo  [OK] React build done.
cd ..

REM ── Step 2: Copy React build into server/public ──────────────────────────────
echo  [2/4] Copying build to server...
if exist "server\public" rmdir /s /q "server\public"
xcopy /E /I /Y "client\dist" "server\public" >nul
echo  [OK] Copied to server/public.

REM ── Step 3: Install server prod dependencies ──────────────────────────────────
echo  [3/4] Installing server dependencies...
cd server
call npm install --omit=dev
if errorlevel 1 ( echo [ERROR] npm install failed! & pause & exit /b 1 )
echo  [OK] Dependencies installed.

REM ── Step 4: Build .exe with pkg ───────────────────────────────────────────────
echo  [4/4] Compiling to .exe (this takes 1-2 minutes)...
if not exist "..\dist-deploy" mkdir "..\dist-deploy"
call npx pkg index.js --target node18-win-x64 --output "..\dist-deploy\ayyanar-billing.exe" --compress GZip
if errorlevel 1 ( echo [ERROR] pkg build failed! & pause & exit /b 1 )
cd ..

REM ── Copy deployment files ────────────────────────────────────────────────────
echo.
echo  Copying deployment files...
copy /Y "deploy\.env" "dist-deploy\.env" >nul
copy /Y "START-BILLING.bat" "dist-deploy\START-BILLING.bat" >nul
if exist "dist-deploy\public" rmdir /s /q "dist-deploy\public"
xcopy /E /I /Y "server\public" "dist-deploy\public" >nul

echo.
echo  ==========================================
echo    BUILD COMPLETE!
echo  ==========================================
echo.
echo  Deployment folder: dist-deploy\
echo    - ayyanar-billing.exe
echo    - .env  (fill in DB_PASSWORD before giving to client)
echo    - START-BILLING.bat
echo.
pause
