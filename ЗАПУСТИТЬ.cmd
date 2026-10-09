@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" (
  start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
  exit /b 0
)
echo Для запуска без установки Node.js используйте готовую Windows-сборку: ModelStudio.exe.
echo Для запуска из исходников сначала выполните pnpm install и node node_modules/electron/install.js.
echo Прежний запуск в браузере: ЗАПУСТИТЬ-В-БРАУЗЕРЕ.cmd.
pause
