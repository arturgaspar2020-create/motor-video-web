@echo off
chcp 65001 >nul
title Motor Video Studio - Instalar IA gratuita
echo ============================================
echo   MOTOR VIDEO STUDIO - IA LOCAL GRATUITA
echo ============================================
echo.
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama ainda nao esta instalado.
  echo Baixe gratuitamente em: https://ollama.com/download/windows
  echo Instale, abra o Ollama e execute este arquivo novamente.
  start "" "https://ollama.com/download/windows"
  pause
  exit /b 1
)
echo.
echo Baixando o modelo gratuito Qwen3 4B.
echo O download e feito apenas uma vez e pode ocupar alguns GB.
echo.
ollama pull qwen3:4b
if errorlevel 1 (
  echo.
  echo Nao foi possivel baixar o modelo. Verifique sua internet e tente novamente.
  pause
  exit /b 1
)
echo.
echo IA instalada! Deixe o Ollama aberto e inicie o Motor Video Studio.
echo Modelo: qwen3:4b
echo Analise local, sem API paga ou creditos.
pause
