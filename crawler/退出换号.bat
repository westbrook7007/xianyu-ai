@echo off
chcp 65001 >nul
echo ========================================
echo   闲鱼退出当前账号 / 换号登录
echo ========================================
cd /d "%~dp0"

set PY=C:\Users\xingw\Anaconda3\envs\xianyu\python.exe

echo [1/3] 关闭占用登录态的爬虫进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo   关闭 PID=%%a
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [2/3] 备份并清除当前浏览器登录态...
"%PY%" switch_account.py

echo [3/3] 打开登录窗口，请用新账号扫码...
"%PY%" login_helper.py

echo.
echo 换号完成。请重新运行 start_crawler.bat 启动爬虫。
pause
