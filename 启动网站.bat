@echo off
chcp 65001 >nul
echo ========================================
echo   启动闲鱼AI选品网站
echo ========================================
cd /d "%~dp0"

set NPM=C:\Program Files\nodejs\npm.cmd

REM 关闭占用 3000 端口的旧进程（避免样式丢失/页面异常）
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo 关闭旧网站进程 PID=%%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo.
echo 正在启动，请稍候...
echo 启动成功后打开: http://localhost:3000
echo 关闭本窗口 = 停止网站
echo.

"%NPM%" run dev
pause
