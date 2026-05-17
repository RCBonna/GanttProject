# Catálogo de Diagramas Arquiteturais e Operacionais

Este documento consolida os diagramas arquiteturais e os fluxos de dados do **ProjectGantt**, estruturados em conformidade com o padrão C4 Model e utilizando a sintaxe do Mermaid para facilitar a visualização direta e a evolução contínua da engenharia do software.

---

## 1. Visão Geral do Sistema (C4 Model - Nível 1 & 2)

O **ProjectGantt** opera inteiramente no espaço de isolamento do navegador do usuário final (Client-Side Sandboxing). O diagrama abaixo descreve o contexto do sistema e a relação do navegador com os recursos locais e externos.

```mermaid
graph TB
    User[Usuário / Gerente de Projetos] -->|Interage com a UI| WebUI[Apresentação & Layout: index.html]
    
    subgraph BrowserSandbox["Navegador do Usuário (Sandboxed Context)"]
        WebUI <-->|Mapeamento de Dados Reativos| Controller[Controlador & Estado Reativo: vue_app.js]
        WebUI <-->|Aplica Estilo & Grid Tokens| CSS[Design System: style.css]
        
        Controller <-->|Cálculos Síncronos em RAM| Engine[Gantt Engine / Scheduling Solver]
        
        subgraph StorageLayer["Camada de Armazenamento Local"]
            Controller <-->|1. Token DirectoryHandle| IDB[(IndexedDB Token Store)]
            Controller <-->|2. Fast Paint Cache| LS[(LocalStorage Cache)]
        end
    end
    
    subgraph LocalFileSystem["Sistema de Arquivos Local (SO)"]
        Disk[(Diretório de Trabalho / Portfólio)] <-->|3. Leitura e Gravação Direta| Controller
    end
    
    subgraph ExternalCDNs["Rede Externa (CDNs)"]
        VueJS[Vue.js v3 CDN] -.->|Carga de Script Inicial| WebUI
        HTML2C[html2canvas CDN] -.->|Carga de Script Inicial| WebUI
        jsPDF[jsPDF CDN] -.->|Carga de Script Inicial| WebUI
    end
```

---

## 2. Fluxo de Sequência: Ciclo de Salvamento Resiliente com Backups

Quando o usuário realiza qualquer alteração em tarefas, feriados ou metadados de projeto, o sistema aciona uma sequência estruturada para garantir a integridade física dos dados, gerando backups `.bak` antes de qualquer alteração destrutiva no disco.

```mermaid
sequenceDiagram
    participant UI as Interface Gráfica
    participant Ctrl as vue_app.js (saveTasksToDisk)
    participant LS as LocalStorage Cache
    participant Disk as Disco Físico (FSA API)

    UI->>Ctrl: Alteração Realizada (ex: Progresso de Tarefa)
    Ctrl->>Ctrl: Consolida alterações em formato string CSV
    
    Ctrl->>LS: Atualiza chave 'tasks' (Fast-Paint Cache encoded v1:e:)
    
    Note over Ctrl, Disk: Inicia Transação Resiliente de Disco
    
    Ctrl->>Disk: Verifica se arquivo original existe (ex: projeto.csv)
    alt Arquivo Original Existe
        Disk-->>Ctrl: Retorna Conteúdo Original
        Ctrl->>Disk: Cria arquivo projeto.csv.bak
        Ctrl->>Disk: Grava Conteúdo Original no backup e fecha stream
    end
    
    Ctrl->>Disk: Abre stream de escrita para projeto.csv (createWritable)
    Ctrl->>Disk: Escreve BOM UTF-8 + Conteúdo CSV Atualizado
    
    alt Sucesso na Escrita
        Disk-->>Ctrl: Stream Fechado com Sucesso (close)
        Ctrl-->>UI: Exibe Toast Verde: "Projeto salvo com sucesso"
    else Falha Física na Escrita (ex: Arquivo Bloqueado)
        Disk-->>Ctrl: Erro de Permissão / Bloqueio
        Ctrl->>LS: Grava réplica na chave de fallback 'gantt_fs_projeto.csv'
        Ctrl-->>UI: Exibe Toast Amarelo: "Falha física. Salvo em cache de segurança."
    end
```

---

## 3. Máquina de Estados das Datas das Tarefas (`dateSource`)

A inteligência de simulação de cronogramas reside na classificação de estados temporais das tarefas. Cada atividade tem um estado definido dinamicamente pela propriedade `dateSource`:

```mermaid
stateDiagram-v2
    [*] --> Calculated : Inserção de Tarefa Inicial
    
    Calculated --> Locked : Usuário preenche "Data Inicial Planejada" ou "Data Final Planejada" manualmente
    Locked --> Calculated : Usuário limpa as restrições manuais de datas planejadas
    
    Calculated --> Forecast : Predecessora atrasa (realEnd > plannedEnd) ou avança realStart
    Forecast --> Calculated : Predecessora retorna ao planejamento original ou é removida
    
    Forecast --> Locked : Usuário edita e trava datas planejadas manualmente
    Locked --> Forecast : Usuário remove travas e predecessora continua em atraso
    
    state Calculated {
        [*] --> PlanStart : Usa Data Inicial do Projeto
        PlanStart --> DependencyFS : Possui predecessor FS
        PlanStart --> DependencySS : Possui predecessor SS
    }
    
    state Forecast {
        [*] --> ProjectedStart : Calcula atraso acumulado da predecessora
        ProjectedStart --> AdjustedWorkingDay : Desloca finais de semana e feriados
    }
```

---

## 4. Fluxo Topológico de Resolução de Ciclos de Dependências

Para evitar travamento de renderização e estouro de pilha por loops infinitos de recursividade nas dependências das tarefas, a função de ordenação topológica executa uma detecção ativa via DFS (Depth-First Search) mantendo um registro no `Set` de nós ativos no caminho visitado.

```mermaid
flowchart TD
    Start([Iniciar Resolução da Tarefa T]) --> CheckCycle{T.id já está no visited Set?}
    
    CheckCycle -->|Sim: Ciclo Detectado!| BreakCycle[Atribui T.start = Data Mestre do Projeto]
    BreakCycle --> MarkCalc[Define T.dateSource = 'calculated']
    MarkCalc --> Return[Retornar e Retroceder]
    
    CheckCycle -->|Não| AddSet[Adicionar T.id no visited Set]
    AddSet --> GetPreds{T possui predecessores?}
    
    GetPreds -->|Não| CalcDirect[T.start = Data Inicial do Projeto]
    GetPreds -->|Sim| ResolvePreds[Resolver Predecessores recursivamente]
    
    ResolvePreds --> CalcPreds[Calcular T.start baseado na maior data de término projetada dos predecessores]
    
    CalcDirect --> AdjustHolidays[Ajustar data para próximo dia útil se coincidir com finais de semana ou feriados]
    CalcPreds --> AdjustHolidays
    
    AdjustHolidays --> CalcEnd[T.end = T.start + T.duration - 1 dia útil]
    CalcEnd --> RemoveSet[Remover T.id do visited Set]
    RemoveSet --> Return
```

---

## 5. Arquitetura da Tabela do Grid de Renderização Reativo

Este diagrama ilustra a sincronicidade perfeita do grid horizontal CSS com a tabela lateral de dados das tarefas. O resizer dinâmico ajusta as larguras mantendo a reatividade intacta.

```mermaid
graph LR
    SubContainer[Container Principal do Gantt] --> Tabela[Tabela Lateral: Lista de Tarefas]
    SubContainer --> Resizer[Div Resizer: Barra de Arraste Lateral]
    SubContainer --> Grid[Grid Horizontal: Linha do Tempo]
    
    Resizer -->|Evento: onMouseDown| DragHandler[Manipulador de Arraste em vue_app.js]
    DragHandler -->|Atualiza| TaskListWidth[taskListWidth ref]
    TaskListWidth -->|Aplica Width inline em px| Tabela
    TaskListWidth -->|Salva no LocalStorage| Cache[Armazenamento Local]
    
    Grid -->|ZoomLevel: day / week / month| Header[Linha do Tempo: Cabeçalho com Meses e Dias]
    Grid -->|Renderiza Barras| Timeline[Barras de Planejamento, Execução Real e Baseline]
```
