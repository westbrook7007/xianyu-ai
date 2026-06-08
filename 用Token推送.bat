@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

cd /d "%~dp0"
set "PATH=C:\国外 自学\Git\usr\bin;C:\国外 自学\Git\mingw64\bin;C:\国外 自学\Git\cmd;%PATH%"
set "GIT=C:\国外 自学\Git\cmd\git.exe"

echo.
echo ========================================
echo   用 GitHub Token 推送到 GitHub
echo ========================================
echo.
echo 将推送：
echo   - 分支 main        （当前 v6.6 最新代码）
echo   - 标签 v6.6        （6月版本，可回滚）
echo   - 标签 v5.28       （5月28日初始版本，可回滚）
echo.
echo 获取 Token: https://github.com/settings/tokens/new
echo   Note: xianyu-ai  勾选: repo
echo.
set /p TOKEN=请粘贴 Token 后按回车: 

if "!TOKEN!"=="" (
    echo [错误] Token 不能为空
    pause
    exit /b 1
)

echo.
echo 正在推送 main 分支...
"%GIT%" remote set-url origin https://westbrook7007:!TOKEN!@github.com/westbrook7007/xianyu-ai.git
"%GIT%" push -u origin main
if !errorlevel! neq 0 goto :fail

echo.
echo 正在推送版本标签 v6.6 和 v5.28...
"%GIT%" push origin v6.6 v5.28
if !errorlevel! neq 0 goto :fail

"%GIT%" remote set-url origin https://github.com/westbrook7007/xianyu-ai.git

echo.
echo ========================================
echo   推送成功！
echo.
echo   仓库: https://github.com/westbrook7007/xianyu-ai
echo.
echo   版本标签（回滚用）:
echo     v6.6   - 当前 6.6 版本
echo     v5.28  - 5月28日初始版本（不影响，永久保留）
echo.
echo   回滚到 5 月版: git checkout v5.28
echo   回滚到 6.6 版: git checkout v6.6
echo ========================================
pause
exit /b 0

:fail
"%GIT%" remote set-url origin https://github.com/westbrook7007/xianyu-ai.git
echo.
echo [失败] 请检查 Token 是否勾选 repo，或网络是否稳定。
pause
exit /b 1
