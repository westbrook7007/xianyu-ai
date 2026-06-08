@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PY=C:\Users\xingw\Anaconda3\envs\xianyu\python.exe
set CRAWL_API_SECRET=xianyu-local-secret-2026
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

echo ========================================
echo   闲鱼AI 队列 Worker
echo   从 Supabase 拉任务，调本机爬虫执行
echo ========================================
echo.
echo 请先确保：
echo   1. 已运行 start_crawler.bat
echo   2. .env.local 已配置 Supabase
echo   3. WORKER_CALLBACK_URL 指向 Vercel 或本机网站
echo.
echo 关闭本窗口 = 停止 Worker
echo.

echo 检查依赖...
"%PY%" -m pip install -r requirements.txt -q

"%PY%" queue_worker.py
pause
