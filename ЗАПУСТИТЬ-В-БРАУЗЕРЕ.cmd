@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Установите Node.js 22.13 или новее: https://nodejs.org/
  pause
  exit /b 1
)
echo После запуска откройте http://127.0.0.1:4189/
node server.mjs
pause
