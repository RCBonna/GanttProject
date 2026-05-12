# Estratégia de Testes (Testing)

Sendo o ProjectGantt uma ferramenta Local-First Serverless, o escopo de testes orbita fundamentalmente em E2E (End-to-End) visual e tratamento de IO assíncrono (Leitura/Gravação) no disco.

## 1. Contextos de Teste Estratégicos

### 1.1 Testes de Integração de Sistema de Arquivos (File System API)
O comportamento dos navegadores com APIs rigorosas deve ser avaliado sob diferentes cenários de segurança:
- **Revogação de Permissão Silenciosa:** Simular aba fechada para garantir que o fluxo de reengajamento via IndexedDB apresente a "Sincronização Suspensa" de forma controlada sem quebrar o layout.
- **Race Conditions de Arquivo Trancado:** Tentar escrever uma alteração via aplicação enquanto o `tarefas.csv` original permanece aberto no MS Excel (o que bloqueia gravação de disco). A expectativa é o intercept pelo Handler via catch, acionamento do Toast de Erro e fallback seguro via LocalStorage da alteração efetuada em RAM.
- **Deteção de Caracteres CSV:** Inserção de aspas duplas e Ponto-e-Vírgula (`;`) nas caixas de nome de atividade não podem invalidar o parser original ou quebrar as colunas na próxima leitura.

### 1.2 Testes Unitários de Engine Gantt (`calculateSchedule`)
Testar vetores de tempo puro na lógica em Vue via mock de array:
1. **Regra Finish-to-Start Padrão:** Task B (depende de A). Se A acaba numa sexta-feira, verificar se `addWorkingDays` aponta o `start` de B precisamente para segunda-feira e não para sábado.
2. **Impacto Feriado Global:** Injetar um Feriado (feriados.csv) cruzando a execução de uma tarefa de 10 dias. Garantir que o `end` avance 1 dia útil extra.
3. **Cascatas Recursivas:** Ao alterar duração de uma tarefa N1 que rege N2, que rege N3. Testar se após edição, o framework de vue atualiza o array mutando o DOM até a Task N3 corretamente e em tempo linear, evitando loops infinitos `StackOverflow`.

### 1.3 Testes UX e Interatividade Visual
- **Layout Ultrawide / Resizer:** O redimensionamento manual da grid esquerdo não deve causar overlay indevido nas barras da área direita do gráfico ou forçar barra de scroll inferior imobilizada.
- **Tooltips Capping:** Tooltips posicionais via mouseevent não podem estourar os cantos do viewport ou gerar instabilidade vertical do DOM ("saltos" de scrollbar).

## 2. Testes Recomendados e Futuro Automatizável
Não foram integrados frameworks no protótipo nativo (`vue_app.js`), contudo, ao migrar para a ramificação `/src` (Vite), recomenda-se:
- **Vitest:** Para varredura síncrona do cálculo da Engine.
- **Playwright / Cypress:** Recomendável para automatizar clique simulado no modal, porém, frameworks têm ressalvas conhecidas ao interceptar e simular API do Sistema Operacional nativo como a `File System Access API`. Muitas asserções IO deverão ser mockadas em ambiente de CI.
