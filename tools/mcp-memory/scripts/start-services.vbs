' Start Qdrant and Ollama silently on system startup
' No console windows visible

Set WshShell = CreateObject("WScript.Shell")

' Start Ollama
WshShell.Run """D:\Program Files\Ollama\ollama.exe"" serve", 0, False

' Start Qdrant
WshShell.Run """D:\360downloads\qdrant-x86_64-pc-windows-msvc\qdrant.exe""", 0, False
