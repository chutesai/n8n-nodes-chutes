@echo off
REM ========================================
REM  Stop n8n Docker Container
REM ========================================

echo.
echo ========================================
echo   Stopping n8n Container
echo ========================================
echo.

cd /d "%~dp0"

docker-compose down

if %errorlevel% equ 0 (
    echo.
    echo n8n container stopped successfully!
    echo.
) else (
    echo.
    echo [ERROR] Failed to stop container
    echo.
)

pause

