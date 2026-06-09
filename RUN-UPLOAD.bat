@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo Usage: RUN-UPLOAD.bat RUN_ID
  echo RUN_ID = ID du run Archive reussi ^(artifact Settle-ipa^)
  echo Exemple: RUN-UPLOAD.bat 27234767639
  pause
  exit /b 2
)

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\babysit-testflight.ps1" -UploadOnly -Trigger -RunId %1
pause
