@echo off
REM ========================================
REM  Update n8n Node Without Full Restart
REM ========================================

echo.
echo ========================================
echo   Updating Chutes.ai Node in n8n
echo ========================================
echo.

cd /d "%~dp0"
cd ..\..

echo [1/5] Rebuilding the node...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Stopping n8n container...
cd tests\n8n-docker
docker-compose down

echo.
echo [3/5] Rebuilding Docker image with ffmpeg.wasm...
docker-compose build --no-cache

echo.
echo [4/5] Starting n8n with updated image...
docker-compose up -d

echo.
echo [5/5] Installing node dependencies in container...
timeout /t 10 /nobreak >nul
docker exec -u root n8n-chutes-test sh -c "cd /data/custom/n8n-nodes-chutes && rm -rf node_modules && npm install && chown -R node:node /data/custom"

echo.
echo ========================================
echo   Update Complete!
echo ========================================
echo.
echo Waiting for n8n to fully start (20 seconds)...
timeout /t 20 /nobreak >nul

echo.
echo n8n should now be ready at:
echo http://localhost:5678
echo.
echo If you have workflows open, refresh the browser.
echo.
pause