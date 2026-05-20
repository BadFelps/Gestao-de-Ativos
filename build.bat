@echo off
echo Exportando projeto do base44...
cd "C:\Gestao Ativos"
git pull origin main

echo Configurando variaveis...
set VITE_BASE44_APP_BASE_URL=https://api.base44.com
set VITE_BASE44_APP_ID=69b984ecbe7402af99e141a5
set EXPO_PUBLIC_BASE44_APP_BASE_URL=https://api.base44.com
set EXPO_PUBLIC_BASE44_APP_ID=69b984ecbe7402af99e141a5

echo Gerando APK...
npm run build:apk

echo Pronto! Acesse expo.dev para baixar o APK.
pause