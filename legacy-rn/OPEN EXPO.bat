@echo off
cd /d "%~dp0"
echo.
echo  Settle - Expo SDK 54 (compatible Expo Go App Store)
echo  iPhone et PC doivent etre sur le meme WiFi.
echo.
npx expo start --lan --clear
