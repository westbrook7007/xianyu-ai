@echo off
chcp 65001 >nul
echo ========================================
echo   闲鱼AI — 局域网演示模式
echo ========================================
cd /d "%~dp0"

set NPM=C:\Program Files\nodejs\npm.cmd

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LAN_IP=%%a
    goto :gotip
)
:gotip
set LAN_IP=%LAN_IP: =%

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo 关闭旧网站进程 PID=%%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo.
echo 【演示前请确认】
echo   1. 已运行 crawler\start_crawler.bat （爬虫）
echo   2. 已用 crawler\登录闲鱼.bat 扫码登录
echo.
echo 【其他人电脑访问地址】
echo   http://%LAN_IP%:3000
echo.
echo 【你自己本机访问】
echo   http://localhost:3000
echo.
echo 若其他人打不开，请在 Windows 防火墙允许 Node.js 专用网络访问
echo 关闭本窗口 = 停止网站
echo.

"%NPM%" run dev:lan
pause
