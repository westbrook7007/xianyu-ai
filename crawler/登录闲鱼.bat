@echo off
chcp 65001 >nul
echo ========================================
echo   闲鱼登录助手（推荐扫码，不要用短信）
echo ========================================
echo.
cd /d "%~dp0"
"C:\Users\xingw\Anaconda3\envs\xianyu\python.exe" login_helper.py
pause
