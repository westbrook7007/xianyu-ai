@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   闲鱼AI — Supabase 一键配置
echo ========================================
echo.
echo 【推荐】新账号请先在网页创建项目（会自动建好组织）：
echo   https://supabase.com/dashboard/new/new-project
echo.
echo 【全自动】有 Token 可粘贴（需账号下已有组织/项目）：
echo   https://supabase.com/dashboard/account/tokens
echo.
echo 或直接回车进入手动粘贴模式（最稳妥）
echo.

set /p TOKEN=Access Token（可留空）: 
if not "%TOKEN%"=="" set SUPABASE_ACCESS_TOKEN=%TOKEN%

"C:\Program Files\nodejs\node.exe" scripts\setup-supabase.mjs
echo.
pause
