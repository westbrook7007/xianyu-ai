@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

cd /d "%~dp0"
set "PATH=C:\国外 自学\Git\usr\bin;C:\国外 自学\Git\mingw64\bin;C:\国外 自学\Git\cmd;%PATH%"
set "GIT=C:\国外 自学\Git\cmd\git.exe"

echo.
echo ========================================
echo   用 GitHub Token 推送代码（推荐方式）
echo ========================================
echo.
echo 说明：
echo   1. GitHub 已不支持用「登录密码」推送，必须用 Token
echo   2. 获取 Token: https://github.com/settings/tokens/new
echo      - Note 填 xianyu-ai
echo      - 勾选 repo
echo      - 点 Generate token 并复制
echo.
set /p TOKEN=请粘贴 Token 后按回车: 

if "!TOKEN!"=="" (
    echo [错误] Token 不能为空
    pause
    exit /b 1
)

echo.
echo 正在推送，请稍候（约 1～3 分钟）...
"%GIT%" remote set-url origin https://westbrook7007:!TOKEN!@github.com/westbrook7007/xianyu-ai.git
"%GIT%" push -u origin main
set "PUSH_OK=!errorlevel!"

rem 推送完成后去掉 URL 里的 Token，避免泄露
"%GIT%" remote set-url origin https://github.com/westbrook7007/xianyu-ai.git

if !PUSH_OK! neq 0 (
    echo.
    echo [失败] 推送未成功。请检查 Token 是否勾选 repo，或网络是否稳定。
    pause
    exit /b 1
)

echo.
echo ========================================
echo   成功！请打开浏览器确认：
echo   https://github.com/westbrook7007/xianyu-ai
echo ========================================
pause
