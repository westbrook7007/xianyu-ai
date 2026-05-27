@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

set "GH=%~dp0.tools\gh\bin\gh.exe"
set "GIT=C:\国外 自学\Git\cmd\git.exe"
set "PATH=C:\国外 自学\Git\usr\bin;C:\国外 自学\Git\mingw64\bin;C:\国外 自学\Git\cmd;%PATH%"

if not exist "%GH%" (
    echo [错误] 找不到 GitHub 命令行工具，请先联系助手重新下载。
    pause
    exit /b 1
)

echo.
echo ========================================
echo   闲鱼AI - 上传到 GitHub（第 1 步）
echo ========================================
echo.

"%GH%" auth status >nul 2>&1
if errorlevel 1 (
    echo [1/3] 请在浏览器中完成 GitHub 登录授权...
    echo       终端会显示一段验证码，浏览器里输入即可。
    echo.
    "%GH%" auth login -h github.com -p https -w --skip-ssh-key
    if errorlevel 1 (
        echo [错误] GitHub 登录失败，请重试。
        pause
        exit /b 1
    )
) else (
    echo [1/3] GitHub 已登录，跳过授权。
)

echo.
echo [2/3] 创建仓库 xianyu-ai 并关联远程...
"%GH%" repo view xianyu-ai >nul 2>&1
if errorlevel 1 (
    "%GH%" repo create xianyu-ai --public --source=. --remote=origin --description "闲鱼AI智能比价选品工具"
    if errorlevel 1 (
        echo [错误] 创建仓库失败。若网页上已手动建过同名仓库，请改用手动方式。
        pause
        exit /b 1
    )
) else (
    echo       仓库已存在，检查远程地址...
    "%GIT%" remote get-url origin >nul 2>&1
    if errorlevel 1 (
        for /f "delims=" %%u in ('"%GH%" api user -q .login') do set "USER=%%u"
        "%GIT%" remote add origin https://github.com/!USER!/xianyu-ai.git
    )
)

echo.
echo [3/3] 推送代码到 GitHub...
"%GIT%" push -u origin main
if errorlevel 1 (
    echo [错误] 推送失败，请检查网络或重新运行本脚本。
    pause
    exit /b 1
)

echo.
echo ========================================
echo   成功！代码已上传到 GitHub
echo ========================================
for /f "delims=" %%u in ('"%GH%" api user -q .login') do set "USER=%%u"
echo 仓库地址: https://github.com/!USER!/xianyu-ai
echo.
echo 下一步: 打开 https://vercel.com 用 GitHub 登录并导入此仓库
echo.
pause
