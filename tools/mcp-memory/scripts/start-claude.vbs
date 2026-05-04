' Launch Claude Code in Windows Terminal after services start
Set WshShell = CreateObject("WScript.Shell")

' Wait for Qdrant + Ollama to initialize (5 seconds)
WScript.Sleep 5000

' Open Windows Terminal running Claude in shengri project
WshShell.Run "wt.exe --startingDirectory ""E:\Program Files\www\shengri"" claude", 1, False
