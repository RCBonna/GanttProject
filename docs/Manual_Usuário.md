# 📘 Manual do Usuário — ProjectGantt v2.1

> **Versão:** 2.1 (Sprint 5)  
> **Última atualização:** Maio 2026  
> **Plataforma:** Navegador Web (Chrome/Edge recomendado)  
> **Armazenamento:** Local-first (arquivos CSV no seu computador)

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Requisitos do Sistema](#2-requisitos-do-sistema)
3. [Primeiros Passos](#3-primeiros-passos)
4. [Estrutura de Arquivos](#4-estrutura-de-arquivos)
5. [Interface Principal](#5-interface-principal)
6. [Gerenciamento de Tarefas](#6-gerenciamento-de-tarefas)
7. [Linha de Base (Baseline)](#7-linha-de-base-baseline)
8. [Motor de Forecast Inteligente](#8-motor-de-forecast-inteligente)
9. [Indicadores e KPIs](#9-indicadores-e-kpis)
10. [Visualizações e Colunas](#10-visualizações-e-colunas)
11. [Feriados e Calendário](#11-feriados-e-calendário)
12. [Tema e Personalização](#12-tema-e-personalização)
13. [Exportação](#13-exportação)
14. [Dúvidas Frequentes](#14-dúvidas-frequentes)

---

## 1. Visão Geral

O **ProjectGantt** é uma aplicação web de gerenciamento de projetos com gráfico de Gantt. Funciona diretamente no navegador, sem necessidade de servidor ou conta — seus dados ficam salvos em **arquivos CSV** no seu computador.

### Principais Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| 📊 Gráfico de Gantt | Visualização temporal de tarefas com barras coloridas |
| 📸 Linha de Base | Snapshot do planejamento para comparar com mudanças |
| 📈 KPIs de Desvio | SPI, desvio médio e contagem de tarefas atrasadas |
| 🎯 Três Tipos de Data | Planejamento, Execução Real e Baseline |
| 🗓️ Feriados | Calendário customizável que exclui dias não úteis |
| 🌓 Tema Claro/Escuro | Interface adaptável à sua preferência |
| 📤 Exportar Imagem | Salve o gráfico como PNG para relatórios |
| ⚡ Motor de Forecast | Recálculo inteligente e propagação de desvios reais em cascata |

---

## 2. Requisitos do Sistema

- **Navegador:** Google Chrome 86+ ou Microsoft Edge 86+ (necessário para File System Access API)
- **Sistema:** Windows, macOS ou Linux
- **Conexão:** Não necessária (funciona 100% offline)

> ⚠️ **Firefox e Safari** não suportam a API de acesso a arquivos usada pelo ProjectGantt.

---

## 3. Primeiros Passos

### 3.1 Abrindo a Aplicação

1. Abra o arquivo `index.html` diretamente no navegador **ou** sirva a pasta com um servidor local:
   ```
   npx serve .
   ```
2. Acesse `http://localhost:3000` no navegador.

### 3.2 Selecionando a Pasta do Portfólio

1. Clique no botão **"📁 Abrir Pasta"** (menu ⚙️) ou no botão central **"📁 Selecionar Pasta"**.
2. Navegue até a pasta do portfólio e conceda permissão de leitura/escrita quando solicitado.
3. O sistema valida os arquivos de configuração:
   - Se existir `portfolio.json`: lê os projetos registrados.
   - Se não existir `portfolio.json`: oferece criação de um novo portfólio (wizard).
4. O arquivo `feriados.json` é opcional na abertura inicial: se não existir, pode ser criado pelo fluxo do portfólio.

### 3.3 Selecionando um Projeto

- Se o `portfolio.json` tiver **1 projeto**, o sistema abre direto no Gantt.
- Se o `portfolio.json` tiver **2+ projetos**, abre a tela para seleção do projeto.
- Se o `portfolio.json` estiver vazio, o sistema oferece criar o primeiro projeto.

---

## 4. Estrutura de Arquivos

Sua pasta de projeto deve conter os seguintes arquivos:

### `portfolio.json` — Catálogo de Projetos do Portfólio

Contém a lista de projetos disponíveis na pasta.
Cada item referencia o CSV de tarefas do projeto.

### `projeto-0.csv` (ou nome customizado) — Tarefas
```csv
ID;Tarefa;Duracao;Predecessora;Percent_Completo;Data_Inicio_Planejado;Data_Fim_Planejado;Data_Inicio_Real;Data_Fim_Real;Data_Inicial_Baseline;Data_Final_Baseline;Baseline_Data
1;Análise de Requisitos;5;;20;;;;;;;
2;Design do Sistema;3;1;0;;;;;;;
```

| Coluna | Descrição | Obrigatório |
|--------|-----------|:-----------:|
| ID | Identificador numérico sequencial | ✅ |
| Tarefa | Nome da atividade | ✅ |
| Duracao | Duração em dias úteis | ✅ |
| Predecessora | ID da tarefa predecessora | ❌ |
| Percent_Completo | Percentual concluído (0-100) | ✅ |
| Data_Inicio_Planejado | Data de início planejada | ❌ |
| Data_Fim_Planejado | Data de fim planejada | ❌ |
| Data_Inicio_Real | Data de início real da execução | ❌ |
| Data_Fim_Real | Data de fim real da execução | ❌ |
| Data_Inicial_Baseline | Data de início do baseline | ❌ |
| Data_Final_Baseline | Data de fim do baseline | ❌ |
| Baseline_Data | Data em que o baseline foi salvo | ❌ |

> 💡 As datas podem estar no formato `YYYY-MM-DD` ou `DD/MM/YYYY`. O sistema reconhece ambos.

### `feriados.json` — Feriados e Dias Não Úteis

Mapa de feriados por data (`YYYY-MM-DD`).

---

## 5. Interface Principal

A interface é dividida em áreas funcionais:

### 5.1 Barra de Cabeçalho (Header)

| Elemento | Função |
|----------|--------|
| **Nome do Projeto** | Exibe o nome e gerente do projeto ativo |
| **✏️ Editar** | Abre configurações do projeto (nome, gerente, data início) |
| **▶ Informações do Portfólio** | Abre o painel lateral com dados do portfólio |
| **⚙️ Menu** | Ações do sistema (Alterar Projeto, Alterar Portfólio, Feriados, etc.) |
| **🌓 Tema** | Alterna entre tema claro e escuro |
| **Exportar Imagem** | Gera uma imagem PNG do gráfico |

### 5.2 Barra de Estatísticas (Stats Bar)

| Indicador | Descrição |
|-----------|-----------|
| **📋 Tarefas** | Total de tarefas no projeto |
| **📅 Dias Úteis** | Duração total do projeto em dias úteis |
| **Progresso (%)** | Donut visual com percentual geral de conclusão |
| **🏁 Término Geral** | Data prevista de conclusão do projeto |
| **SPI** | Schedule Performance Index (aparece após baseline) |
| **Desvio Médio** | Média de desvio em dias vs baseline |
| **Atrasadas** | Quantidade de tarefas atrasadas vs baseline |

### 5.3 Controles de Visibilidade

Na barra de estatísticas, à direita, existem **Toggle Pills**:

- **Baseline** — Liga/desliga as barras tracejadas de linha de base
- **Real** — Liga/desliga as barras de execução real

Esses estados são persistidos entre sessões.

### 5.4 Área do Gráfico

- **Lista de Tarefas (esquerda):** Tabela com dados das tarefas
- **Resizer:** Arraste a borda entre a lista e o gráfico para ajustar proporções
- **Gráfico de Gantt (direita):** Barras temporais com scroll sincronizado

### 5.5 Zoom

| Nível | Granularidade | Quando usar |
|-------|---------------|-------------|
| **Dia** | Uma coluna por dia | Projetos curtos (até 3 meses) |
| **Semana** | Uma coluna por semana | Projetos médios (3-12 meses) |
| **Mês** | Uma coluna por mês | Visão macro de projetos longos |

---

## 6. Gerenciamento de Tarefas

### 6.1 Adicionar Tarefa

1. Clique no botão **"+ Tarefa"** no cabeçalho
2. Uma nova tarefa será adicionada ao final da lista
3. **Duplo-clique** na tarefa para abrir o editor

### 6.2 Editar Tarefa

1. **Duplo-clique** em qualquer tarefa (na lista ou na barra do gráfico)
2. O modal de edição abrirá com os seguintes campos:

| Campo | Descrição |
|-------|-----------|
| Nome da Tarefa | Texto descritivo da atividade |
| Duração (dias) | Quantidade de dias úteis. Use **0** para marcos (milestones) |
| Predecessora | ID da tarefa que deve finalizar antes desta começar |
| Progresso (%) | Slider de 0 a 100% |
| Datas Reais | Início e fim da execução real (formato `DD/MM/YYYY`) |
| Linha de Base | Exibição read-only das datas do baseline |

### 6.3 Marcos (Milestones)

- Defina **Duração = 0** para transformar uma tarefa em marco
- Marcos aparecem como **losangos** (◆) no gráfico em vez de barras

### 6.4 Predecessoras

- Insira o **ID numérico** da tarefa predecessora
- O sistema calcula automaticamente: a tarefa inicia no dia útil seguinte ao término da predecessora
- **Setas** conectam visualmente as tarefas vinculadas no gráfico

### 6.5 Excluir Tarefa

1. Abra o editor (duplo-clique)
2. Clique no botão **"Excluir"** no rodapé do modal
3. Confirme a exclusão

### 6.6 Salvamento Automático

- Todas as alterações são salvas **automaticamente** no arquivo CSV quando a pasta está conectada
- Um aviso amarelo aparece se a pasta não estiver conectada naquela sessão

---

## 7. Linha de Base (Baseline)

### O que é?

A **Linha de Base** é uma "fotografia" do cronograma planejado em um determinado momento. Serve como referência para medir desvios futuros.

### 7.1 Salvando uma Linha de Base

1. Certifique-se de que o cronograma planejado está correto
2. Clique no botão **"📸 Salvar Baseline"** no cabeçalho
3. Confirme a operação (se já existir um baseline anterior, será sobrescrito)
4. Um toast de confirmação aparecerá: "✅ Baseline salvo com sucesso!"

### 7.2 Visualizando o Baseline

- **Barras tracejadas** (ghost bars) aparecem acima das barras planejadas
- Use o toggle **"Baseline"** para ligar/desligar a visualização
- O tooltip mostra as datas originais do baseline ao passar o mouse

### 7.3 Interpretação Visual

| Situação | O que você vê |
|----------|---------------|
| Tarefa no prazo | Barra planejada alinhada com ghost bar |
| Tarefa atrasada | Barra planejada excede a ghost bar (badge vermelho `+Xd`) |
| Tarefa adiantada | Barra planejada menor que ghost bar (badge verde `-Xd`) |

---

## 8. Motor de Forecast Inteligente

O **Motor de Forecast** é um algoritmo preditivo inteligente que atualiza dinamicamente as previsões das tarefas futuras com base na execução real das tarefas predecessoras.

### 8.1 Como funciona o recálculo em cascata?

- **Sem Execução Real:** Se nenhuma tarefa predecessora possui datas reais (`Data_Inicial_Real` ou `Data_Final_Real`), as tarefas sucessoras seguem rigorosamente as datas planejadas calculadas a partir da data de início do projeto.
- **Propagação de Atrasos/Adiantamentos Reais:** Assim que uma tarefa é realizada ou se inicia com atraso real, o motor analisa os impactos e propaga o desvio em cascata para todas as tarefas sucessoras conectadas (respeitando finais de semana e feriados cadastrados):
  - Se a predecessora terminou na data real `Y`, a sucessora é reprogramada para iniciar no próximo dia útil após `Y`.
  - Se a predecessora já iniciou de forma real, mas ainda não terminou, o motor calcula o término estimado (Data de Início Real + Duração Planejada) e propaga esse desvio para os próximos passos.

### 8.2 Indicadores Visuais de Origem (Date Source)

Na coluna de **Início Planejado** (aba de visualização *Plan* ou *Full*), você verá pequenos ícones ao lado da data indicando sua origem:
- **🔒 Cadeado (Locked):** Indica que a tarefa tem uma data de início inserida manualmente pelo usuário no CSV ou foi definida de forma fixa.
- **⚡ Raio (Forecast):** Indica que a data de início é flutuante e foi recalculada dinamicamente pelo motor devido a desvios ou atrasos reais em suas predecessoras.

### 8.3 Executando o Forecast

Sempre que dados de execução real forem inseridos ou atualizados, o motor realiza os cálculos de forecast automaticamente. 
Para forçar um recálculo manual a qualquer momento:
1. Clique no botão **"🔄 Recalcular"** na barra de controle superior.
2. Um toast flutuante no topo confirmará o resultado:
   - *Exemplo:* `🔄 Previsão recalculada — 3 tarefa(s) com forecast atualizado`
   - Se nenhuma tarefa tiver data flutuante impactada: `✅ Cronograma recalculado — sem impactos em cascata`

### 8.4 KPI de Forecast

Na barra de estatísticas (Stats Bar), quando houver tarefas afetadas por reprogramações automáticas de forecast, um card especial azul será exibido:
- **⚡ X Forecast:** Mostra exatamente quantas tarefas do projeto estão com suas datas alteradas dinamicamente devido ao atraso de predecessoras.

---

## 9. Indicadores e KPIs

Os KPIs aparecem automaticamente na barra de estatísticas **após salvar um baseline**.

### 9.1 SPI — Schedule Performance Index

| Valor | Significado | Cor |
|-------|-------------|-----|
| **≥ 1.0** | Projeto no prazo ou adiantado | 🟢 Verde |
| **0.8 - 0.99** | Leve atraso | 🟡 Amarelo |
| **< 0.8** | Atraso significativo | 🔴 Vermelho |

### 9.2 Desvio Médio

- Mostra a média de dias de desvio em relação ao baseline
- **+Xd** = atraso médio (vermelho)
- **-Xd** = adiantamento médio (verde)
- **0d** = no prazo perfeito

### 9.3 Tarefas Atrasadas

- Contador de tarefas cuja data de término **excede** a data prevista no baseline
- Aparece apenas quando há pelo menos 1 tarefa atrasada
- Exibido em vermelho para chamar atenção

### 9.4 Badges por Tarefa

Na lista de tarefas, cada tarefa com baseline mostra um badge individual:
- **`+5d`** (vermelho) — tarefa 5 dias atrasada em relação ao baseline
- **`-2d`** (verde) — tarefa 2 dias adiantada em relação ao baseline

Tarefas atrasadas também recebem uma **borda vermelha à esquerda** na lista.

---

## 10. Visualizações e Colunas

### 10.1 Seletor de Visão

No cabeçalho da lista de tarefas, use as abas de visão:

| Aba | Colunas Exibidas |
|-----|-----------------|
| **Pad** (Padrão) | #, Tarefa, %, Dias, Pred |
| **Plan** (Planejamento) | + Início Planejado, Fim Planejado |
| **Exec** (Execução) | + Início Real, Fim Real |
| **Full** (Completa) | Todas as colunas acima combinadas |

### 10.2 Persistência

A visão selecionada é salva no navegador e restaurada automaticamente na próxima sessão.

### 10.3 Redimensionamento

- Arraste o **divisor** entre a lista de tarefas e o gráfico para ajustar proporções
- A largura mínima se adapta automaticamente conforme a visão selecionada

---

## 11. Feriados e Calendário

### 11.1 Adicionar Feriados

1. Clique no ícone **"🗓️ Feriados"** no cabeçalho
2. No modal, insira a **Data** e o **Nome** do feriado
3. Clique em **"Adicionar"**

### 11.2 Efeito dos Feriados

- Dias marcados como feriados são **excluídos** do cálculo de dias úteis
- No gráfico, aparecem como **colunas destacadas** (similar a fins de semana)
- A duração das tarefas "pula" automaticamente feriados e fins de semana

### 11.3 Remover Feriados

- No modal de feriados, clique no **"🗑️"** ao lado do feriado para removê-lo

---

## 12. Tema e Personalização

### 12.1 Tema Claro/Escuro

- Clique no botão **"🌓"** no cabeçalho para alternar
- A preferência é salva automaticamente

### 12.2 Cores das Barras

As barras de tarefas alternam entre cores distintas para facilitar a leitura:
- Cada tarefa recebe uma cor da paleta predefinida
- Barras 100% completas ficam **verdes**
- Marcos (milestones) são **laranjas**

---

## 13. Exportação

### 13.1 Exportar como Imagem

1. Clique em **"Exportar Imagem"** no cabeçalho
2. O sistema captura toda a área do gráfico (incluindo partes não visíveis)
3. Um arquivo PNG é baixado automaticamente

> 💡 Para melhores resultados, ajuste o zoom para **Dia** antes de exportar.

---

## 14. Dúvidas Frequentes

### O projeto não carrega — o que faço?

1. Verifique se o arquivo `projeto.csv` existe na pasta selecionada
2. Confirme que o separador é **ponto-e-vírgula** (`;`) e não vírgula
3. Verifique se o nome do arquivo de tarefas no `projeto.csv` corresponde ao arquivo real

### O aviso amarelo "pasta não conectada" aparece — é grave?

Não é grave. Significa que o navegador perdeu a referência à pasta (isso acontece ao recarregar a página). Clique em **"Abrir Pasta"** ou **"Conectar"** para reconectar.

### Como defino datas de execução real?

1. Duplo-clique na tarefa
2. No modal, preencha **"Início Real"** e **"Fim Real"** no formato `DD/MM/YYYY`
3. As barras de execução real aparecerão no gráfico (ative o toggle **"Real"** se necessário)

### Posso ter múltiplos projetos na mesma pasta?

Sim. Basta listar múltiplos projetos no arquivo `projeto.csv`:
```csv
Nome;Gerente;Data_Inicio;Arquivo_Tarefas
Projeto Alpha;Ana;2026-01-15;alpha.csv
Projeto Beta;Carlos;2026-03-01;beta.csv
```

### Como atualizo o baseline após mudanças?

Basta clicar em **"📸 Salvar Baseline"** novamente. O sistema pedirá confirmação antes de sobrescrever o baseline anterior.

### Os KPIs não aparecem — por quê?

Os KPIs (SPI, Desvio Médio, Atrasadas) só aparecem **após salvar um baseline**. Sem baseline, não há referência para calcular desvios.

---

## 🔑 Atalhos Rápidos

| Ação | Como Fazer |
|------|-----------|
| Editar tarefa | Duplo-clique na linha ou barra |
| Alterar progresso | Slider no modal de edição |
| Zoom | Botões Dia / Semana / Mês no cabeçalho |
| Trocar tema | Botão 🌓 no cabeçalho |
| Reconectar pasta | Botão "Conectar" no aviso amarelo |

---

*Manual gerado para ProjectGantt v2.1 — Sprint 5 (Maio 2026)*
