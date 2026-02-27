@echo off
chcp 65001 >nul
title 你画我猜 - Cloudflare 公网版

echo ========================================
echo 🎨 你画我猜 - Cloudflare 公网版
echo ========================================
echo.
echo 正在启动游戏服务器...
echo.

REM 启动游戏服务器
start /B node server.js > server.log 2>&1

REM 等待服务器启动
timeout /t 3 /nobreak >nul

echo 正在创建 Cloudflare 公网隧道...
echo 等待生成公网地址...
echo.
echo （首次使用会自动下载 Cloudflared，请稍等...）
echo.

REM 检查 cloudflared
if not exist cloudflared.exe (
    echo 正在下载 Cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    echo 下载完成！
    echo.
)

REM 启动 Cloudflare 隧道
start /B cloudflared.exe tunnel --url http://localhost:3456 > tunnel.log 2>&1

REM 等待并提取公网地址
echo 正在获取公网地址...
echo.
set "url="
set "count=0"

:waitloop
timeout /t 2 /nobreak >nul
set /a count+=1

if exist tunnel.log (
    for /f "delims=" %%a in ('findstr "trycloudflare.com" tunnel.log 2^>nul') do (
        for /f "tokens=*" %%b in ("%%a") do (
            set "line=%%b"
            if not defined url (
                echo %%b | findstr "https://" >nul && (
                    for /f "tokens=*" %%c in ('echo %%b ^| findstr "https://[a-z0-9-]*\.trycloudflare\.com"') do (
                        set "url=%%c"
                    )
                )
            )
        )
    )
)

if not defined url if %count% lss 30 goto waitloop

if defined url (
    echo ========================================
    echo 🎉 公网访问地址已生成！
    echo ========================================
    echo.
    echo 🔗 公网网址: %url%
    echo.
    echo 📱 分享给朋友: %url%
    echo.
    echo ✅ 无需密码，直接访问！
    echo ========================================
    echo.
    echo 按任意键停止服务器...
    pause >nul
) else (
    echo ❌ 获取公网地址失败
    echo.
    echo 请检查：
    echo 1. 网络连接是否正常
    echo 2. 防火墙是否阻止
    echo 3. 查看 tunnel.log 获取详细信息
    echo.
    echo 备选方案：
    echo 1. 使用局域网模式: npm start
    echo 2. 使用 localtunnel: npm run public
    echo.
    pause
)

REM 清理
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
del server.log tunnel.log 2>nul

exit
