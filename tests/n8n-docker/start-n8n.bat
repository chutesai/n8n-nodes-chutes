@echo off
REM ========================================
REM  Start n8n Docker Container for Testing
REM  Chutes.ai n8n Node
REM ========================================

echo.
echo ========================================
echo   Starting n8n with Chutes.ai Node
echo ========================================
echo.

REM Change to the script directory
cd /d "%~dp0"

REM Change to project root to run build
cd ..\..

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [1/5] Building the Chutes.ai node...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Stopping any existing n8n container...
cd tests\n8n-docker
docker-compose down

echo.
echo [3/5] Building Docker image with ffmpeg.wasm...
docker-compose build

echo.
echo [4/5] Starting n8n container...
docker-compose up -d

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Docker container!
    pause
    exit /b 1
)

echo.
echo [5/5] Installing Chutes.ai node in n8n...
timeout /t 5 /nobreak >nul

REM Install the custom node globally inside the container
docker exec n8n-chutes-test sh -c "cd /data/custom/n8n-nodes-chutes && npm install && npm install -g ."

echo.
echo ========================================
echo   n8n is starting up...
echo ========================================
echo.
echo Waiting for n8n to be ready (this may take 30-60 seconds)...
timeout /t 10 /nobreak >nul

REM Wait for n8n to be healthy
:wait_loop
docker inspect n8n-chutes-test --format="{{.State.Health.Status}}" 2>nul | findstr /i "healthy" >nul
if %errorlevel% neq 0 (
    echo Still waiting for n8n to start...
    timeout /t 5 /nobreak >nul
    goto wait_loop
)

echo.
echo ========================================
echo   SUCCESS! n8n is ready!
echo ========================================
echo.
echo   URL:      http://localhost:5678
echo   Username: admin
echo   Password: admin
echo.
echo To view logs:     docker logs -f n8n-chutes-test
echo To stop n8n:      docker-compose down
echo To restart n8n:   docker-compose restart
echo.
echo ========================================
echo.

REM Open browser (optional - comment out if you don't want auto-open)
start http://localhost:5678

pause