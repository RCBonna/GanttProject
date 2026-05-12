# Banco de Dados e Armazenamento (Storage Local)

## 1. O Conceito de Banco de Dados de Arquivos
Sendo um sistema **Local-First**, os dados primários do usuário não estão em um banco de dados hospedado em nuvem. O banco de dados do **ProjectGantt** é fisicamente compreendido pelo conjunto de arquivos CSV localizados dentro da pasta designada pelo próprio usuário.

### 1.1 Estrutura Esperada na Pasta
```text
/Qualquer-Pasta-Do-Usuario
├── projeto.csv    (Tabela de Metadados do Projeto)
├── feriados.csv   (Tabela Auxiliar de Exceções de Calendário)
└── tarefas.csv    (Tabela Principal - Nome configurável via projeto.csv)
```

## 2. Estrutura do Dicionário de Dados (tarefas.csv)
Os dados persistidos têm o seguinte schema relacional gravado no CSV (com delimitador autodetectável `,` ou `;`):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `ID` | Integer | Identificador primário da tarefa (obrigatório numérico e único). |
| `Tarefa` | String | Nome descritivo da tarefa. |
| `Duracao` | Integer | Quantidade de dias úteis projetados (0 = Marco/Milestone). |
| `Progresso` | Integer | Valor entre 0 e 100 indicando a conclusão da atividade. |
| `Predecessora` | String | IDs separados por vírgula (Ex: `1,2`). |
| `Tipo` | String | Relacionamento da dependência (Ex: `FS` ou `SS`). |
| `Data_Inicial_Real` | ISO Date | Dia real de início da execução. |
| `Data_Final_Real` | ISO Date | Dia real da entrega final. |
| `Data_Inicial_Planejada` | ISO Date | Trava (lock) do usuário na data inicial para impedir recálculo. |
| `Data_Final_Planejada` | ISO Date | Trava (lock) do usuário na data final. |
| `Data_Inicial_Baseline` | ISO Date | Instante de tempo gravado durante o último snapshot de Baseline. |
| `Data_Final_Baseline` | ISO Date | Data final gravada no último snapshot de Baseline. |
| `Baseline_Data` | ISO Date | Qual dia o usuário tomou a fotografia do cronograma. |

## 3. Bancos de Dados Auxiliares no Navegador
Para suprir necessidades vitais de experiência de usuário, o app integra duas tecnologias web nativas para armazenamento invisível ao File System:

### 3.1 IndexedDB (`GanttProjectDB`)
Foi criado um banco de dados NoSQL dentro do navegador do usuário especificamente para guardar o ponteiro serializado do acesso à pasta do usuário (`FileSystemDirectoryHandle`). Isso evita que o usuário tenha que clicar em "Abrir Pasta" e re-selecionar o diretório no computador toda vez que a página é carregada. O handle é recuperado, e se tiver permissão (ou após pedir autorização silenciosa), restaura os CSVs automaticamente.

### 3.2 LocalStorage
Usado como um Cache L1. Ao carregar a aplicação, caso o IndexedDB falhe ou a permissão seja negada temporariamente, o sistema renderiza a tela com base nos dados do LocalStorage, permitindo que o usuário interaja em modo offline total e evitando as desagradáveis "Telas em Branco". Além disso, guarda configurações visuais como: largura do menu lateral, tema e status das abas visíveis do Gantt.
