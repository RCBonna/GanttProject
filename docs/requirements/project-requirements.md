# Requisitos de Projeto (Project Requirements)

Este documento define os objetivos operacionais (Requisitos Funcionais - RF) e arquiteturais (Requisitos Não Funcionais - RNF) do sistema ProjectGantt.

## 1. Visão de Produto
Fornecer a Analistas e Gerentes de Projeto uma solução rápida, privada e leve para elaboração visual e manipulação de cronogramas via navegador, sem exigência de assinaturas de SaaS corporativo, bancos de dados em nuvem, ou fluxos complexos de onboarding e login.

## 2. Requisitos Funcionais (RF)
- **RF01 - Autogestão Offline:** O sistema deve ler e escrever projetos diretamente sobre arquivos formato CSV hospedados na máquina local do cliente.
- **RF02 - Cronograma Automático:** O sistema calculará datas de partida e chegada recursivamente, baseado na definição de dias de duração e IDs atrelados como predecessores.
- **RF03 - Exclusão de Dias Não Úteis:** Fins de semana deverão obrigatoriamente ser pulados do somatório temporal das barras. O sistema suportará cadastro manual customizado de Feriados via interface.
- **RF04 - Trava Manual de Data:** O sistema deve oferecer a capacidade de sobrepor regras automáticas travando as datas através de intervenção explícita no formulário do modal.
- **RF05 - Execução vs Planejamento (Sprints Recentes):** A interface deve prover campos e sobreposição paralela visual entre o que foi "Planejado" (Linha teórica de Baseline e predições temporárias) e o "Real" (Datas físicas entregues relatadas).
- **RF06 - Snapshot de Linha de Base:** Ação de apertar o botão "Salvar Baseline" tira uma "fotografia" inalterável via cálculo natural marcando um checkpoint oficial das datas calculadas daquele instante.
- **RF07 - Recalcular Cascata Forecast:** Implementar engine capaz de reconhecer quando entregas físicas reais sofreram atrasos ante a baseline e replanejar (Forecast) as datas prováveis da cascata seguinte.
- **RF08 - Indicadores e KPIs Automáticos:** Deve apresentar KPIs globais calculados de forma efêmera como: Desvio Médio em dias, SPI (Schedule Performance Index) e contagem quantitativa de alertas por atrasos (Forecast Alert).

## 3. Requisitos Não Funcionais (RNF)
- **RNF01 - Usabilidade UI/UX:** Adotar linguagem visual Premium e clean similar aos atuais gigantes de mercado com foco em responsividade e manipulação do tamanho de exibição do gráfico. A UI será totalmente traduzida e operante em Português-BR nativo, incluindo interpretação de formatação regional de datas (DD/MM/YYYY).
- **RNF02 - Desempenho e Eficiência em Render:** Componentes do framework deverão assegurar o não colapso do DOM ao plotar projetos contendo mais de 100~200 atividades vinculadas.
- **RNF03 - Arquitetura de Permissões e Segurança Local-First:** Usar estratégias robustas da `File System API`, e contramedidas modernas, como gravação de Handle via IndexedDB para impedir que toda inicialização de software necessite que o usuário autorize pop-ups invasivos do OS Windows ou macOS.
- **RNF04 - Universalidade Semântica e Exportação Analítica:** Manter a semântica da origem CSV livre de lock-in tecnológico para que usuários, se desejarem, manipulem seus arquivos-fonte livremente usando MS Excel. O software possuirá também capacidade gráfica (via canvas) de tirar "Screenshots" do Gantt para colar em relatórios PDF ou apresentações.
