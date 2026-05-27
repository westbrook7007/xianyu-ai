@echo off
chcp 65001 >nul
echo ========================================
echo   闲鱼爬虫 - 一键安装（带进度）
echo ========================================
echo.

set PY=C:\Users\xingw\Anaconda3\envs\xianyu\python.exe

if not exist "%PY%" (
    echo [错误] 找不到 Python，请先完成 conda 环境创建
    pause
    exit /b 1
)

cd /d "%~dp0"
"%PY%" setup_env.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [失败] 安装未完成
    pause
    exit /b 1
)

echo.
echo 下一步：双击 start_crawler.bat 启动爬虫服务
pause
