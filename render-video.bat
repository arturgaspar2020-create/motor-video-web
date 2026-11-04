@echo off
setlocal
title Motor Video Studio - Renderizador
cd /d "%~dp0"
echo ==========================================
echo       MOTOR VIDEO STUDIO - RENDER
echo ==========================================
where python >nul 2>nul
if errorlevel 1 (
  echo ERRO: Python nao encontrado. Instale Python 3.10+ e marque "Add Python to PATH".
  pause
  exit /b 1
)
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo ERRO: FFmpeg nao encontrado no PATH.
  echo Consulte engine\README.md para instalacao.
  pause
  exit /b 1
)
set /p PROJECT=Arquivo JSON do projeto [projeto-motor-video.json]: 
if "%PROJECT%"=="" set PROJECT=projeto-motor-video.json
set /p AUDIO=Arquivo de narracao [narracao.mp3]: 
if "%AUDIO%"=="" set AUDIO=narracao.mp3
set /p OUTPUT=Nome do video final [video-final.mp4]: 
if "%OUTPUT%"=="" set OUTPUT=video-final.mp4
python engine\render.py --project "%PROJECT%" --audio "%AUDIO%" --output "%OUTPUT%"
if errorlevel 1 (
  echo.
  echo A renderizacao terminou com erro. Leia a mensagem acima.
) else (
  echo.
  echo Video criado: %OUTPUT%
)
pause
