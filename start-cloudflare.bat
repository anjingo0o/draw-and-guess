@echo off
chcp 65001 >nul
title 你画我猜 - Cloudflare 公网版

echo ========================================
echo 🎨 你画我猜 - Cloudflare 公网版
echo ========================================
echo.

REM 启动游戏服务器（后台）
echo 正在启动游戏服务器...
start /B node server.js

REM 等待服务器启动
timeout /t 3 /nobreak >nul

echo.
echo 正在创建 Cloudflare 公网隧道...
echo 等待生成公网地址...
echo.

REM 启动 Cloudflare 隧道
cloudflared.exe tunnel --url http://localhost:3456

pause
