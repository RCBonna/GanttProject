@echo off
echo Iniciando Chrome com acesso liberado a arquivos locais...

set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
:: Usando a variável de ambiente para evitar erro de nome de usuário
set FILE_PATH="file:///%USERPROFILE%\OneDrive\Apps\ProjectGantt\index.html"
set USER_DATA_DIR="%TEMP%\chrome-dev-gantt"

start "" %CHROME_PATH% --allow-file-access-from-files --user-data-dir=%USER_DATA_DIR% --lang=pt-BR %FILE_PATH%
