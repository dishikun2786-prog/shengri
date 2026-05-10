@echo off
REM Start MCP Memory Server for Claude Code
REM This script: 1) ensures Ollama is running, 2) pulls embedding model if needed, 3) launches MCP server

echo [mcp-memory] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [mcp-memory] Starting Ollama...
    start "Ollama" "D:\Program Files\Ollama\ollama.exe" serve
    timeout /t 3 /nobreak >nul
)

echo [mcp-memory] Starting MCP memory server...
cd /d "E:\Program Files\www\shengri\tools\mcp-memory"
npx tsx src/index.ts
