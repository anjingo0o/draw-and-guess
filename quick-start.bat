@echo off
chcp 65001 >nul
title 你画我猜 - 正在启动...

echo ========================================
echo 🎨 你画我猜 - Cloudflare 公网版
echo ========================================
echo.

:: 查找可用端口
set PORT=0
for /f "tokens=2 delims= " %%a in ('netstat -ano ^| findstr ":3456"') do (
    echo 端口 3456 被占用，尝试其他端口...
    set PORT=1
)

if "%PORT%"=="0" (
    set GAME_PORT=3456
) else (
    set GAME_PORT=4567
)

echo 使用端口: %GAME_PORT%
echo.

:: 启动游戏服务器
echo [1/3] 正在启动游戏服务器...
start /B cmd /c "set PORT=%GAME_PORT% && node server.js > server.log 2>&1"

:: 等待服务器启动
timeout /t 2 /nobreak >nul

:: 检查 cloudflared
if not exist cloudflared.exe (
    echo [2/3] 首次使用，正在下载 Cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'" >nul 2>&1
    if exist cloudflared.exe (
        echo      下载完成！
    ) else (
        echo      下载失败，请检查网络连接
        pause
        exit /b 1
    )
) else (
    echo [2/3] Cloudflared 已存在
)

echo.
echo [3/3] 正在创建公网隧道...
echo.
echo ⏳ 请稍候，正在获取公网地址...
echo.

:: 启动 Cloudflare 隧道
start /B cmd /c "cloudflared.exe tunnel --url http://localhost:%GAME_PORT% > tunnel.log 2>&1"

:: 等待并提取公网地址
timeout /t 5 /nobreak >nul

set PUBLIC_URL=
for /f "delims=" %%a in ('findstr "trycloudflare.com" tunnel.log 2^>nul') do (
    for /f "tokens=2 delims= " %%b in ("%%a") do (
        echo %%b | findstr "https://" >nul && (
            set PUBLIC_URL=%%b
            goto :found
        )
    )
)

:: 再试一次
if not defined PUBLIC_URL (
    timeout /t 3 /nobreak >nul
    for /f "delims=" %%a in ('findstr "trycloudflare.com" tunnel.log 2^>nul') do (
        for /f "tokens=2 delims= " %%b in ("%%a") do (
            echo %%b | findstr "https://" >nul && (
                set PUBLIC_URL=%%b
                goto :found
            )
        )
    )
)

:found
cls
echo ========================================
echo 🎨 你画我猜 - 运行中
echo ========================================
echo.

if defined PUBLIC_URL (
    echo ✅ 服务器已启动！
    echo.
    echo ========================================
    echo 🎉 公网访问地址：
    echo ========================================
    echo.
    echo    %PUBLIC_URL%
    echo.
    echo ========================================
    echo.
    echo 📱 把这个地址发给朋友即可联机！
    echo 🌐 无需密码，直接访问！
    echo.
    echo 💡 本机访问：http://localhost:%GAME_PORT%
    echo.
) else (
    echo ⚠️  公网地址获取失败
    echo.
    echo 但本地服务器已启动：
    echo    http://localhost:%GAME_PORT%
    echo.
    echo 同一WiFi下的设备可以访问：
    echo    http://%COMPUTERNAME%:%GAME_PORT%
    echo.
)

echo 按任意键停止服务器...
pause >nul

:: 清理
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
del server.log tunnel.log 2>nul

echo.
echo 服务器已停止
timeout /t 2 /nobreak >nul
