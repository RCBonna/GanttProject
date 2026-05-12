# Integração com a File System Access API

## 1. Objetivo da API
A **File System Access API** do W3C permite que páginas da web leiam e gravem diretamente em diretórios selecionados pelo usuário, de maneira segura. No ProjectGantt, esta API é o motor primário para operar de forma serverless, operando como o conector I/O (Input/Output).

## 2. Fluxo Principal de Conexão (`showDirectoryPicker`)
O processo de inicialização de permissão exige um `User Gesture` (Clique intencional do usuário).
```javascript
// O usuário clica em "Abrir Pasta"
const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
```
Esta ação não só carrega os arquivos para a RAM (onde a engine Gantt atuará), mas é a permissão principal para que a aplicação efetue os "Saves".

## 3. O Fluxo de Reconexão Passiva (Restauro de Sessão)
A API suporta armazenamento e requisição de handles pré-aprovados.
A lógica do aplicativo (em `App.setup()` - `onMounted`) utiliza a seguinte ordem:
1. Requisita do `IndexedDB` a chave `projectFolder` onde o handle de sessão anterior foi salvo.
2. Faz o uso de `handle.queryPermission({ mode: 'readwrite' })`.
3. Se o retorno for `granted`, o sistema religa-se passivamente sem o usuário perceber.
4. Se o retorno for `prompt`, a UI altera o banner para o modo de "Sincronização Suspensa", pois os navegadores frequentemente perdem a credencial a cada reinício até o usuário clicar manualmente para restaurá-la via `handle.requestPermission()`.

## 4. Métodos de Escrita Assíncrona e Safe Writing
Sempre que há uma modificação de tarefa no front:
1. O CSV é concatenado como string e a função `getFileHandle` invoca o arquivo.
2. Chama-se `createWritable()`, que bloqueia o acesso àquele arquivo nativamente.
3. Escreve-se os dados prefixados pelo UTF-8 BOM (`\ufeff`) garantindo compatibilidade com o MS Excel e caracteres em PT-BR.
4. Ao rodar `writable.close()`, os dados são cristalizados no disco de forma síncrona aos olhos do sistema operacional.

## 5. Tratamento de Erros e Limitações
- Se o arquivo estiver sendo editado ou "Trancado" por um Excel aberto em segundo plano, a chamada a `createWritable()` pode gerar erro em determinados sistemas Windows. A aplicação está encapsulada em blocos `try-catch` que acionam os `Toasts` noticiando erro de gravação, falhando silenciosamente mas garantindo a continuidade do estado em memória e LocalStorage.
