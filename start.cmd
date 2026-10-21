@echo off
rem SKK PP: API server (port 5000) and web client (port 5173) in two windows.
start "SKK PP backend" cmd /k "cd /d %~dp0backend && npm start"
start "SKK PP frontend" cmd /k "cd /d %~dp0 && npm run dev"
