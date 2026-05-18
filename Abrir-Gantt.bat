@echo off
echo Iniciando ProjectGantt com servidor local seguro...
echo.

set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
set PORT=8787
set URL=http://127.0.0.1:%PORT%
set USER_DATA_DIR="%TEMP%\chrome-dev-gantt"

:: Inicia o servidor Node.js em segundo plano
start "ProjectGantt Server" /B node "%~dp0server.js"

:: Aguarda o servidor iniciar
timeout /t 2 /nobreak >nul

:: Abre o Chrome no servidor local (sem flags inseguras)
start "" %CHROME_PATH% --user-data-dir=%USER_DATA_DIR% --lang=pt-BR %URL%

echo ProjectGantt aberto no navegador.
echo O servidor local esta rodando na porta %PORT%.
echo Feche o Chrome para parar o servidor.
