@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   修复 Supabase 全部数据表
echo ========================================
echo.
echo SQL 已复制到剪贴板，浏览器将打开 SQL Editor
echo 请 Ctrl+V 粘贴后点 Run（有 RLS 提示选 Run and enable RLS）
echo.

powershell -NoProfile -Command "Get-Content -Raw 'supabase\bootstrap_all_tables.sql' | Set-Clipboard"
start https://supabase.com/dashboard/project/mxnmoaqjciglodhemolc/sql/new
pause
