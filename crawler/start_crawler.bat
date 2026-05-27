@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PY=C:\Users\xingw\Anaconda3\envs\xianyu\python.exe
set CRAWL_API_SECRET=xianyu-local-secret-2026
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

echo ========================================
echo   闲鱼爬虫 v2.1 启动中...
echo   会先关闭旧进程，再启动新服务
echo ========================================

REM 关闭占用 8080 端口的旧爬虫（避免跑旧代码）
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo 关闭旧进程 PID=%%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo 爬虫地址: http://127.0.0.1:8080
echo 关闭本窗口 = 停止爬虫
echo.

"%PY%" server.py
pause
