@echo off
setlocal
title Motor Video Studio - Renderizador 3D
cd /d "%~dp0"
echo ==========================================
echo       MOTOR VIDEO STUDIO - RENDER 3D
echo ==========================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale Node.js 20.19+.
  pause
  exit /b 1
)
if not exist "node_modules\@remotion\renderer" (
  echo Instalando dependencias do motor...
  call npm install
  if errorlevel 1 (
    echo ERRO: npm install falhou.
    pause
    exit /b 1
  )
)
set /p PROJECT=Arquivo JSON do projeto [projeto-motor-video.json]:
if "%PROJECT%"=="" set PROJECT=projeto-motor-video.json
set /p AUDIO=Arquivo de narracao [narracao.mp3]:
if "%AUDIO%"=="" set AUDIO=narracao.mp3
set /p OUTPUT=Nome do video final [video-final.mp4]:
if "%OUTPUT%"=="" set OUTPUT=video-final.mp4
set /p MODEL=Personagem GLB opcional (Enter para procedural):
set MODEL_ARG=
if not "%MODEL%"=="" set MODEL_ARG=--model "%MODEL%"
set /p ALIGN=Tentar alinhamento IA local? (S/N):
set ALIGN_ARG=
if /i "%ALIGN%"=="S" set ALIGN_ARG=--align true
node engine\render-3d.mjs --project "%PROJECT%" --audio "%AUDIO%" --output "%OUTPUT%" --width 1920 --height 1080 --fps 30 %MODEL_ARG% %ALIGN_ARG%
if errorlevel 1 (
  echo.
  echo A renderizacao terminou com erro. Leia a mensagem acima.
) else (
  echo.
  echo Video criado: %OUTPUT%
)
pause
