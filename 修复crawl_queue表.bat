@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   修复 crawl_queue 表
echo ========================================
echo.
echo 1. SQL 已复制到剪贴板
echo 2. 浏览器将打开 Supabase SQL Editor
echo 3. 在网页里 Ctrl+V 粘贴，点 Run（绿色按钮）
echo.

powershell -NoProfile -Command "Get-Content -Raw 'supabase\crawl_queue_only.sql' | Set-Clipboard"
start https://supabase.com/dashboard/project/mxnmoaqjciglodhemolc/sql/new

echo 执行完 Run 后，回到 Vercel 网站重试搜索即可。
pause
