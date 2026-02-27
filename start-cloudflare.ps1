# 你画我猜 - Cloudflare 公网版启动脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎨 你画我猜 - Cloudflare 公网版" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 cloudflared
if (-not (Test-Path ".\cloudflared.exe")) {
    Write-Host "正在下载 Cloudflared..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "cloudflared.exe"
    Write-Host "下载完成！" -ForegroundColor Green
}

# 启动游戏服务器
Write-Host "正在启动游戏服务器..." -ForegroundColor Yellow
$server = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow

# 等待服务器启动
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "正在创建 Cloudflare 公网隧道..." -ForegroundColor Yellow
Write-Host "等待生成公网地址..." -ForegroundColor Gray
Write-Host ""

# 启动 Cloudflare 隧道并捕获输出
$cloudflared = Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:3456" -PassThru -NoNewWindow -RedirectStandardOutput "tunnel.log" -RedirectStandardError "tunnel.err"

# 等待并显示公网地址
$publicUrl = $null
$timeout = 60
$timer = 0

while (-not $publicUrl -and $timer -lt $timeout) {
    Start-Sleep -Seconds 2
    $timer += 2

    if (Test-Path "tunnel.log") {
        $content = Get-Content "tunnel.log" -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
            $publicUrl = $matches[0]
        }
    }
}

if ($publicUrl) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "🎉 公网访问地址已生成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 公网网址: $publicUrl" -ForegroundColor White -BackgroundColor Blue
    Write-Host ""
    Write-Host "📱 分享给朋友: $publicUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ 无需密码，直接访问！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray

    # 保存地址到文件
    @{url = $publicUrl} | ConvertTo-Json | Set-Content "./public/ngrok-url.json"
} else {
    Write-Host "❌ 获取公网地址失败" -ForegroundColor Red
}

# 等待用户中断
while ($true) {
    Start-Sleep -Seconds 1
}
