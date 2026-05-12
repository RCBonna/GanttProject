# Diagrama e Jornada do Usuário (Flows)

## 1. Ciclo de Vida da Sessão

### 1.1 First-Time Login (Acesso Inicial)
1. **Página Carregada:** Renderiza o status visual em `Empty State`. A interface apresenta informações sobre "Pasta desconectada".
2. **Ação Primária:** O usuário clica em `📂 Abrir Pasta`.
3. **Trigger de SO:** O navegador interpela a janela de sistema (Windows Explorer / Finder) solicitando um diretório ao usuário.
4. **Bootstrapping:** 
   - A permissão é recebida.
   - O `vue_app.js` escaneia a pasta e invoca em paralelo: `projeto.csv`, `feriados.csv` e o arquivo referenciado como `tarefas.csv`.
   - Se os arquivos não existirem, são assumidos arrays vazios, que populam reativamente a tela de Gantt em branco.

### 1.2 Criação e Atualização de Tarefas (Data Manipulation)
1. **Adição:** O usuário clica no botão "➕ Nova Tarefa".
2. **Modal Flow:** Um Dialog é aberto. O usuário interage com o formulário padrão.
3. **Commit Lógico:** Ao pressionar Salvar, o Vue atualiza seu Proxy (Virtual DOM).
4. **Engine Trigger:** Em cadeia reativa, `calculateSchedule()` roda reescrevendo as datas absolutas (`start`/`end`) nas propriedades lógicas. `buildTimeline()` varre esses dados calculando o bounding box e colunas temporais de visualização.
5. **Autosave IO:** O fluxo despacha os Arrays em uma conversão para string `.csv` e atualiza nativamente através do `writable.close()`. Não há botões de "Salvar Projeto" globais, o Salvamento é Event-Driven por microações.

### 1.3 Sessões Recorrentes (Return User)
1. **Página Carregada:** A diretiva do Vue `onMounted` engatilha `loadHandleFromDB()`.
2. **Handle Intercept:** Caso o Handle seja capturado no IndexedDB, faz uma varredura silenciosa pelo status (`queryPermission`).
3. **Estado Suspenso:** Devido a políticas do Browser, o status pode retornar 'prompt'. A aplicação então constrói o cenário via LocalStorage garantindo uso visual, e apresenta ao usuário um Banner Customizado ("Sincronização Local Suspensa").
4. **Re-Sincronização UI:** O usuário clica em "Ativar Sincronização". Como há permissão intencional, a chamada à API reconecta silenciosamente em backgroung a pasta, evitando a janela do Windows Explorer.

### 1.4 Baseline Setup
1. **Intenção Estratégica:** O gerente do projeto finaliza as amarrações lógicas.
2. **Acionamento do Snapshot:** Clique no botão de Baseline.
3. **Gravação Dinâmica:** O Front-end duplica `start/end` temporário calculado e copia duravelmente como `baselineStart` / `baselineEnd` e vincula no CSV de armazenamento. Modificações futuras em cascata exibirão discrepâncias analíticas da fotografia original.
