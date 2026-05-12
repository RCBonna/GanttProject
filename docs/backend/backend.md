# Arquitetura Backend (Local-First)

## 1. Definição do Backend
No ecossistema do **ProjectGantt**, não existe um servidor tradicional (Node.js, Python, Java, etc.) nem um banco de dados relacional clássico (PostgreSQL, MySQL). 

O papel do "Backend" é assumido por serviços e APIs nativas do navegador executadas localmente no cliente (Browser Sandbox). Isso é chamado de arquitetura **Serverless Local-First**.

## 2. Responsabilidades do "Backend" Local
A lógica que normalmente residiria em um servidor foi portada para o JavaScript rodando no cliente:
- **Parser de Dados:** Conversão bidirecional entre JSON e CSV (função `parseCSV` e rotinas de salvamento manual).
- **Cálculo de Agendamentos (Engine de Gantt):** Toda a cascata de datas (Start-to-Start, Finish-to-Start), consideração de feriados e fins de semana, é feita pela função `calculateSchedule()` síncrona no cliente.
- **Sistema de Arquivos:** `saveFileToDisk` atua como o equivalente a um Endpoint REST `POST /save`, interagindo com o disco rígido do usuário através da `File System Access API`.

## 3. Segurança e Confiabilidade
Como o processamento é feito localmente, o sistema é imune a quedas de servidor e atrasos de rede (latência zero). Contudo, a persistência é assíncrona para não travar a thread principal (UI). Se a escrita falhar por perda de permissão da pasta, os dados não são perdidos imediatamente, pois ficam armazenados no `localStorage` como fallback.

## 4. Restrições do Modelo
- Não há colaboração em tempo real (multi-tenant/WebSockets) nativa, a menos que a pasta escolhida pelo usuário seja um diretório sincronizado em nuvem (Ex: OneDrive, Google Drive, Dropbox).
- A concorrência de arquivos (dois usuários salvando o CSV ao mesmo tempo em uma pasta compartilhada do OneDrive) deve ser gerida pelo próprio serviço de nuvem, pois a aplicação não implementa travamento (lock) de arquivos em disco.
