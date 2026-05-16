# ProjectGantt - Sistema de Gerenciamento de Projetos e Linhas de Base

ProjectGantt é uma aplicação web de ponta (Local-First) projetada para planejamento, acompanhamento de tarefas e gerenciamento de Linha de Base (Baseline) de projetos com gráfico Gantt interativo de alta fidelidade visual.

## Arquitetura e Tecnologia

A aplicação é arquitetada sob o paradigma **Local-First**, eliminando a necessidade de um servidor de banco de dados centralizado e mantendo a total privacidade e controle dos dados diretamente no sistema de arquivos do usuário.

- **Frontend & Reatividade**: Utiliza **Vue 3** (via CDN com inicialização limpa) para controle de reatividade, estado, propriedades computadas e renderização condicional.
- **Armazenamento / Persistência**: Integração nativa com a **File System Access API** do navegador (`window.showDirectoryPicker`, `getFileHandle`, `createWritable`). Os arquivos do projeto (estruturados em formato CSV robusto) são lidos e gravados diretamente no disco local do usuário.
- **Estilização Visual**: Interface Premium com tema escuro (Dark Mode), tipografia moderna e micro-animações, projetada com foco absoluto em usabilidade e excelência visual.

## Recursos em Destaque

- **Gráfico Gantt Dinâmico**: Visualização de cronograma com barras de progresso, datas de início e fim, e representação visual clara das durações.
- **Gerenciamento de Linha de Base (Baseline)**: Permite registrar o planejamento original para comparação com a execução real.
- **Seleção Avançada de Baseline (Issue #39)**:
  - Adição de caixas de seleção (checkboxes) em todas as tarefas não fechadas.
  - Checkbox global no cabeçalho da tabela para selecionar ou desmarcar simultaneamente todas as tarefas elegíveis.
  - Ao salvar a Linha de Base, o sistema grava o snapshot (`baseStart`, `baseEnd`, `baseWork`, `baseCost`) exclusivamente para as tarefas que foram explicitamente selecionadas pelo usuário, preservando o histórico das demais.
- **Central de Exportação e Relatórios Gerenciais (Issue #38)**:
  - **Imagem HD (PNG)**: Captura visual de alta fidelidade do cronograma Gantt e painel de indicadores através do `html2canvas`.
  - **Relatório Executivo Oficial (PDF)**: Documento gerencial gerado nativamente via `jsPDF`, formatado de acordo com diretrizes de relatórios executivos. Apresenta indicadores de avanço, SPI (Índice de Prazo), Desvios Médios e a tabela de acompanhamento detalhada com status de Forecast e atrasos.
  - **Daily Status Report (CSV/Excel)**: Planilha otimizada para reuniões diárias (Daily Scrum / Alinhamento), contendo identificadores, progresso, previsão de término, desvios em dias e indicação de re-planejamento.
- **Cálculo Automático e Propagação**: Propagação de datas de resumo em tempo real e consolidação de custos e trabalho acumulado.

## Como Executar Localmente

Como a aplicação faz uso da File System Access API para manipular arquivos locais, ela deve ser executada sob um servidor HTTP local (contexto seguro/localhost).

1. Abra o terminal no diretório do projeto.
2. Execute o comando:
   ```bash
   npm run dev
   ```
3. Acesse a URL fornecida no terminal (geralmente `http://localhost:5173` ou similar).

---

### Notas Legadas e Configurações de Ambiente

Outros modelos ==> 
OpenCode ==>
https://youtu.be/qw2EwRarGgE?si=ptFLJ5ZNhHcbCuRF

openCode:
/modelos
/conect
;

Rodar no Terminal - npm run dev 

skills
frontend-design,
canvas-design,
high-end-visual-design,
kpi-dashboard-design,
stitch-ui-design,
ui-ux-designer,
web-design-guidelines,
ui-ux-designer,
daily-news-report,
pdf-official,
senior-architect,
senior-frontend,
senior-fullstack
multi-agent-brainstorming