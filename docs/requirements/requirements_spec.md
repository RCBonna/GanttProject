# Especificação de Requisitos e Restrições Técnicas

Este documento reúne de forma estruturada os requisitos funcionais, não funcionais e as restrições técnicas de engenharia do **ProjectGantt**, orientando auditorias de conformidade e o desenvolvimento de novas features.

---

## 1. Requisitos Funcionais (Functional Requirements - RF)

Os requisitos funcionais detalham os comportamentos esperados e os serviços que o ProjectGantt deve fornecer aos usuários de planejamento.

### RF-01: Gestão de Portfólio Local-First
*   **Descrição:** O sistema deve estruturar e gerenciar múltiplos projetos agrupados sob um mesmo diretório de trabalho físico local selecionado pelo usuário.
*   **Critérios de Aceitação:**
    *   Criação automática do descritor de catálogo `portfolio.json` ao iniciar um diretório.
    *   Detecção automática de novos arquivos planilhas de tarefas no diretório do portfólio.
    *   Mapeamento de metadados como Nome, Gerente Responsável, Cor de Destaque e Data Base do Portfólio.

### RF-02: Novo Projeto por Modelo (Wizard)
*   **Descrição:** O sistema deve oferecer um assistente (Wizard) em 3 passos para criação de novos projetos estocando planilhas separadas.
*   **Modelos Obrigatórios:**
    *   *Em Branco (Blank):* Inicializa com uma única tarefa padrão de planejamento.
    *   *Desenvolvimento de Software:* Inicializa com cronograma de 6 fases encadeadas por dependências FS/SS.
    *   *Engenharia Civil:* Inicializa com fluxo linear crítico completo de edificação residencial.

### RF-03: Editor e CRUD de Tarefas
*   **Descrição:** O usuário deve poder adicionar, editar dados e excluir atividades diretamente no painel e no modal reativo.
*   **Campos Editáveis:** Nome da Tarefa, Duração (dias úteis), Progresso ($0$ a $100\%$), Predecessora (IDs separados por vírgula), Tipo de Link (`FS` ou `SS`), Datas Reais de Execução (Início e Fim) e Datas Planejadas Fixas (Trava).

### RF-04: Resolução Algorítmica de Dependências
*   **Descrição:** O motor do agendador deve calcular automaticamente a data inicial e final projetada das atividades com base nos vínculos técnicos FS (Término-Início) e SS (Início-Início) de suas predecessoras.
*   **Critérios de Aceitação:**
    *   Propagação automática do atraso em cascata para tarefas sucessoras.
    *   Pular finais de semana e feriados cadastrados no calendário global de restrições.

### RF-05: Captura e Gestão de Linhas de Base (Baseline)
*   **Descrição:** O sistema deve permitir tirar um instantâneo (snapshot) das datas de planejamento atuais de tarefas selecionadas e congelá-las nas colunas de Baseline.
*   **Critérios de Aceitação:**
    *   Gravação em CSV dos campos `baselineStart`, `baselineEnd` e `baselineDate`.
    *   Comparação visual paralela na linha do tempo exibindo barras de Baseline (cinza clássico) abaixo das barras planejadas ativas.

### RF-06: Modos de Visualização e Ajuste Dinâmico de Colunas
*   **Descrição:** O usuário deve poder alternar a tabela lateral de dados entre três modos predefinidos para melhor leitura das informações de ciclo de vida.
*   **Modos de Visualização:**
    *   *Padrão (Básico):* Exibe apenas ID, Tarefa, Duração e Progresso.
    *   *Planejamento:* Acrescenta as colunas de Predecessora, Tipo e Datas Planejadas de Início e Fim.
    *   *Execução:* Substitui/acrescenta colunas de Datas Reais e Desvios de Cronograma.

### RF-07: Relatórios e Exportação Multi-Formato
*   **Descrição:** O sistema deve compilar e exportar o planejamento em formatos de distribuição distribuída corporativos.
*   **Formatos Suportados:**
    *   *CSV:* Planilha nativa compatível com Excel delimitada por ponto e vírgula.
    *   *PDF:* Relatório executivo estruturado com folha de estilo formal integrando a tabela lateral e a linha do tempo do Gantt.
    *   *Imagem (PNG):* Captura do elemento do grid gráfico para inclusão em apresentações de slides de status report.

---

## 2. Requisitos Não Funcionais (Non-Functional Requirements - RNF)

Os requisitos não funcionais especificam critérios de qualidade e usabilidade do ecossistema técnico.

### RNF-01: Desempenho e Latência de Cálculo (Performance)
*   **Descrição:** O motor de agendamento em RAM (`calculateSchedule`) deve resolver todas as cadeias de dependências e atualizar as barras em tela em menos de 50 milissegundos para cronogramas com até 200 tarefas simultâneas.

### RNF-02: Soberania e Privacidade de Dados (Local-First Sovereignty)
*   **Descrição:** Nenhum dado inserido pelo usuário (tarefas, notas, nomes ou feriados) pode ser enviado para servidores externos. O aplicativo deve ser 100% autônomo offline.

### RNF-03: Resiliência contra Falhas de Escrita (Backup)
*   **Descrição:** O sistema deve assegurar resiliência total contra falhas de fornecimento de energia ou travamento do sistema operacional criando arquivos de backup `.bak` imediatamente antes de escrever qualquer alteração de dados no diretório físico.

### RNF-04: Portabilidade de Navegadores (Cross-Browser Capability)
*   **Descrição:** A aplicação deve funcionar perfeitamente nos navegadores baseados em Chromium (Chrome, Edge, Opera, Brave) com suporte de escrita física direta, e ativar fallback automático para LocalStorage ofuscado em navegadores restritos como Safari e Firefox.

### RNF-05: Acessibilidade Visual e Foco (Accessibility - WCAG)
*   **Descrição:** O aplicativo deve atender aos critérios de contraste visual (WCAG AA), fornecer indicadores claros de foco de teclado (outline customizado nos inputs) e suportar navegação sequencial via tecla `Tab` em todos os modais interativos.

---

## 3. Restrições Técnicas de Desenvolvimento (Constraints)

As restrições técnicas definem o escopo tecnológico fechado adotado para a infraestrutura do ProjectGantt, em alinhamento com o ADR de estabilidade do monolito estático.

*   **REST-01 (Sem Etapa de Compilação):** O código frontend deve rodar nativamente no navegador direto do código fonte estático, sem necessidade de ferramentas de transpilação (Babel, Webpack, SASS, TypeScript) ou frameworks pesados baseados em bundlers de build.
*   **REST-02 (Bibliotecas de CDN Limpas):** A dependência de terceiros limita-se exclusivamente ao Vue.js 3 (reatividade), jsPDF (relatórios PDF) e html2canvas (capturas estáticas), importados via links de CDNs consolidadas.
*   **REST-03 (Paradigmas de APIs do Navegador):** A gravação física em disco do usuário é realizada estritamente por meio da API padrão **File System Access**, sem instalação de módulos externos de backend no computador do usuário final.
