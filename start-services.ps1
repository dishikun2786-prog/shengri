# 生瑞一键启动脚本
# 使用方式：右键 -> 使用 PowerShell 运行 或 双击

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  生瑞命理服务 - 一键启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$QDRANT_PATH = "D:\360downloads\qdrant-x86_64-pc-windows-msvc\qdrant.exe"
$API_PORT = 3000
$WEB_PORT = 3001
$API_DIR = "E:\Program Files\www\shengri\apps\api"
$WEB_DIR = "E:\Program Files\www\shengri\apps\web"

# 函数：等待端口就绪
function Wait-Port($port, $timeout = 30) {
    $start = Get-Date
    while ((Get-Date) - $start).TotalSeconds -lt $timeout) {
        try {
            $null = [System.Net.Sockets.TcpClient]::new("localhost", $port).Close()
            return $true
        } catch { Start-Sleep -Seconds 1 }
    }
    return $false
}

# 函数：停止端口占用进程
function Stop-Port($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  停止占用端口 $port 的进程: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

Write-Host "[1/4] 检查 Qdrant 矢量数据库..." -ForegroundColor Yellow
$qdrantRunning = Get-Process qdrant -ErrorAction SilentlyContinue
if ($qdrantRunning) {
    Write-Host "  ✓ Qdrant 已在运行 (PID: $($qdrantRunning.Id))" -ForegroundColor Green
} else {
    Write-Host "  启动 Qdrant..." -ForegroundColor Yellow
    if (Test-Path $QDRANT_PATH) {
        Start-Process -FilePath $QDRANT_PATH -WindowStyle Hidden
        Start-Sleep -Seconds 3
        if (Wait-Port 6333) {
            Write-Host "  ✓ Qdrant 启动成功" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Qdrant 启动失败" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✗ Qdrant 可执行文件不存在: $QDRANT_PATH" -ForegroundColor Red
        Write-Host "  请修改脚本中的 QDRANT_PATH 变量" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[2/4] 检查 API 服务 (端口 $API_PORT)..." -ForegroundColor Yellow
Stop-Port $API_PORT
Write-Host "  启动 NestJS API..." -ForegroundColor Yellow
Set-Location $API_DIR
Start-Process -FilePath "pnpm" -ArgumentList "dev" -WindowStyle Normal -NoNewWindow
Write-Host "  ✓ API 服务启动中 (pnpm dev)..." -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] 检查 Web 服务 (端口 $WEB_PORT)..." -ForegroundColor Yellow
Stop-Port $WEB_PORT
Write-Host "  启动 Next.js Web..." -ForegroundColor Yellow
Set-Location $WEB_DIR
Start-Process -FilePath "pnpm" -ArgumentList "dev" -WindowStyle Normal -NoNewWindow
Write-Host "  ✓ Web 服务启动中 (pnpm dev)..." -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] 等待服务就绪..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

if (Wait-Port $API_PORT 60) {
    Write-Host "  ✓ API 服务就绪 (http://localhost:$API_PORT)" -ForegroundColor Green
} else {
    Write-Host "  ✗ API 服务未就绪，请检查日志" -ForegroundColor Red
}

if (Wait-Port $WEB_PORT 60) {
    Write-Host "  ✓ Web 服务就绪 (http://localhost:$WEB_PORT)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Web 服务未就绪，请检查日志" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  启动完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务地址：" -ForegroundColor White
Write-Host "  - API:   http://localhost:$API_PORT" -ForegroundColor White
Write-Host "  - Web:   http://localhost:$WEB_PORT" -ForegroundColor White
Write-Host "  - Qdrant: http://localhost:6333 (Mem0 向量存储)" -ForegroundColor White
Write-Host ""
Write-Host "公网映射（Cloudflare Tunnels）：" -ForegroundColor White
Write-Host "  - api.openedskill.com  -> 端口 $API_PORT" -ForegroundColor White
Write-Host "  - sr.openedskill.com   -> 端口 $WEB_PORT" -ForegroundColor White
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")