# Plano Estratégico: Gantt Profissional (Baseline vs Realizado)

A transição de um visualizador estático para um **Editor e Gerenciador de Projetos Completo** exige uma mudança arquitetural significativa. A introdução de datas planejadas versus reais transforma o sistema de um simples calculador de datas para um sistema de controle de cronograma (*Baseline Tracking*).

Abaixo detalho a análise técnica, as implicações de UX/UI e o plano de implementação sugerido.

---

## 1. Evolução do Modelo de Dados

O modelo de dados atual é restrito aos inputs matemáticos para o motor. Ele passará a ser um repositório de estado da realidade do projeto.

### Novos Campos no CSV e na Memória:
*   `planned_start` / `planned_end`: Datas da *Baseline* (Linha de Base). Representam o plano original aprovado.
*   `actual_start` / `actual_end`: Representam a realidade. 
    *   *Regra de Negócio:* `actual_start` só existe se `% > 0`. `actual_end` só existe se `% = 100`.
*   `forecast_start` / `forecast_end`: (Apenas em memória) Calculados dinamicamente com base nas dependências, atualizando a previsão de término real considerando os atrasos das predecessoras.

## 2. O Novo Motor de Cálculo (Cálculo Sob Demanda)

Com datas fixas inseridas pelo usuário, o comportamento do algoritmo de cronograma muda drasticamente:

1.  **Cálculo da Linha de Base (Planejado):** Se o CSV trouxer datas planejadas, elas são absolutas e **não** mudam sozinhas. Se não vierem, o sistema faz um "Cálculo Inicial" (como fazemos hoje) para defini-las, permitindo que o usuário as trave (Baseline).
2.  **Cálculo Dinâmico (Real / Forecast):** A verdadeira utilidade do gráfico passará a ser ver o impacto do atraso. 
    *   Se a Tarefa 1 atrasou 3 dias (o `actual_end` é maior que o `planned_end`), o sistema deve empurrar o `forecast_start` da Tarefa 2 (que depende da 1) para frente.
3.  **Botão "Recalcular":** Como as datas agora podem ser editadas manualmente, o usuário precisa de um botão "Recalcular" para forçar o sistema a reajustar o plano ou as previsões em cascata com base nas durações e vínculos.

## 3. Visualização e Design (UX/UI)

Para exibir Planejado vs Real de forma limpa, sem poluir a interface, adotaremos um padrão *premium* usado no MS Project e Primavera:

*   **A Barra da Linha de Base (Planejado):** Uma barra mais fina, cinza claro ou apenas com contorno, renderizada *abaixo* ou na *metade inferior* da linha da tarefa.
*   **A Barra Real/Previsão (Forecast):** A barra colorida com degradê (que já temos). Ela renderiza por cima do planejado.
*   **Indicadores de Atraso:** Se a barra Real ultrapassar a linha de base cinza, a "sobra" (os dias de atraso) pode assumir um tom de vermelho/alerta sutil.
*   **Grid Expandível (Lista Lateral):** Inclusão de novas colunas, possivelmente ocultáveis através de um seletor de colunas (Ex: "Visão Planejamento" vs "Visão Execução"), para não quebrar o layout da tela.

## 4. Edição, Salvamento e Multi-Arquivos

Até agora somos um visualizador *Read-Only*. A transição para editor exigirá não só persistência, mas a gestão de múltiplos arquivos de contexto.

*   **Edição (Modal Premium):** Clicar duas vezes numa tarefa abrirá um modal premium de edição (com foco total no usuário) para alterar datas, dependências e progresso confortavelmente.
*   **Novos Arquivos de Entrada (CSV):**
    *   **Metadados do Projeto:** Um arquivo CSV contendo dados globais do projeto: Nome do Projeto, Data de Início, Gerente do Projeto, e o Nome do CSV de tarefas vinculado.
    *   **Feriados Globais:** Um arquivo CSV (`feriados.csv`) na mesma pasta que servirá de calendário base para *todos* os projetos daquela pasta.
*   **A "Mágica" do Local-First (File System Access API):** Usaremos a API moderna de navegadores (`window.showSaveFilePicker`/`showDirectoryPicker`). O usuário selecionará a pasta do projeto, o app lerá os arquivos e terá permissão para **sobrescrever** os dados no disco. O botão "Salvar" salvará *direto no arquivo do disco do usuário* de forma invisível e fluida, como um aplicativo nativo.

## 5. Refatoração Arquitetural Necessária

O `index.html` atual tem ~1200 linhas. Adicionar gerenciamento de estado, edição, gravação e cálculo de baseline no formato procedural atual causará um colapso na manutenção (o famoso *Código Espaguete*).

**Tecnologia Escolhida para Refatoração:**
Adotaremos a **Opção B (Reatividade Leve): Vue.js 3 via CDN**. 
Isso manterá a filosofia *Local-First* (sem necessidade de Node.js, NPM ou build step), rodando em um arquivo HTML simples, mas trará o poder da reatividade. Ao atualizar uma data no Modal, o Vue atualizará automaticamente a tabela e as variáveis do gráfico, reduzindo o esforço em código (e bugs) em 90%.

---

## 6. Sprints de Implementação

*   **Sprint 1: Conclusão da Migração Vue.js & Motor de Domínio**
    *   Finalizar a portabilidade total do `index.html` para o ecosistema Vite (`ChartArea.vue`, `TaskList.vue`, etc.).
    *   Isolar a lógica matemática de `calculateSchedule`, `addBusinessDays` e do recém-criado suporte híbrido a `Feriados` em um arquivo de serviço independente (ex: `src/services/GanttEngine.js`).
*   **Sprint 2: Implementação do Baseline Tracking (Planejado vs Real)**
    *   Atualizar o parser CSV para suportar as colunas `planned_start`, `planned_end`, `actual_start`, `actual_end`.
    *   Atualizar o `ChartArea.vue` para renderizar as duas barras simultaneamente (barra de baseline cinza/translúcida; barra de progresso sólida).
    *   Implementar o cálculo dinâmico de Forecast (Previsão): se a barra `actual` atrasar, empurrar as sucessoras automaticamente.
*   **Sprint 3: O Modal Premium e Local-First API**
    *   Criar o componente `TaskEditorModal.vue` com um design sofisticado (Grid 2 colunas, validação de datas, inputs premium). O gatilho será o double-click na barra do Gantt.
    *   Implementar a função `saveToDisk()` usando a File System Access API para salvar o CSV automaticamente na pasta do usuário sempre que o modal for fechado e houver alterações.
*   **Sprint 4: Features Avançadas (Caminho Crítico & Desfazer)**
    *   Desenvolver o algoritmo para encontrar e destacar o Caminho Crítico.
    *   Implementar um History Stack simples no Vue para permitir Ctrl+Z (Desfazer) após editar o cronograma.
