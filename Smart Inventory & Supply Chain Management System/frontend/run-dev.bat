@echo off
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
".\node_modules\.bin\next.cmd" dev
