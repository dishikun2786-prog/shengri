# Cloudflare Tunnel 启动脚本
# 用于将本地服务通过 Cloudflare Tunnel 暴露到公网
# 使用 tunnel.yml 配置多服务路由

$tunnelScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cloudflared = "$env:USERPROFILE\Downloads\cloudflared.exe"

Write-Host "正在启动 Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "路由配置:" -ForegroundColor Yellow
Write-Host "  - api.openedskill.com -> localhost:3000 (NestJS API)" -ForegroundColor White
Write-Host "  - sr.openedskill.com  -> localhost:8100 (Calendar Engine)" -ForegroundColor White
Write-Host ""
Write-Host "公网访问地址:" -ForegroundColor Cyan
Write-Host "  - Web: https://sr.openedskill.com" -ForegroundColor White
Write-Host "  - API: https://api.openedskill.com" -ForegroundColor White
Write-Host ""

& $cloudflared tunnel --config "$tunnelScriptDir\tunnel.yml" run
