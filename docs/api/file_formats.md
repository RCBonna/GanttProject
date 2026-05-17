# APIs Locais e Especificação de Formatos de Arquivos

Este documento fornece as especificações de dados dos arquivos locais armazenados no diretório do usuário do **ProjectGantt**. Por ser uma aplicação Local-First, estes arquivos compõem a "API Local" de comunicação e banco de dados físico da aplicação.

---

## 1. Mapeamento do Portfólio: `portfolio.json`

O arquivo `portfolio.json` atua como o registro mestre de projetos (Catálogo de Projetos) gerenciados dentro do diretório de trabalho selecionado.

### Estrutura de Dados:
Trata-se de uma matriz (array) JSON contendo objetos de metadados de projeto.

### Exemplo de Conteúdo:
```json
[
  {
    "name": "Projeto de Software Premium",
    "startDate": "2026-05-15",
    "manager": "Eng. Roberto Bonna",
    "tasksFile": "projeto_de_software_premium.csv",
    "color": "#6c5ce7"
  },
  {
    "name": "Obra Residencial Alphaville",
    "startDate": "2026-06-01",
    "manager": "Arq. Ana Silva",
    "tasksFile": "obra_residencial_alphaville.csv",
    "color": "#0984e3"
  }
]
```

### Especificação de Atributos:
* `name` (String): Nome de exibição corporativo do projeto.
* `startDate` (String): Data de início do projeto no formato ISO `YYYY-MM-DD`. Define o marco inicial absoluto para tarefas sem predecessoras.
* `manager` (String): Nome do gerente responsável pelo planejamento (opcional).
* `tasksFile` (String): Nome do arquivo físico CSV correspondente às tarefas daquele projeto. Este nome é higienizado pelo sistema (substituindo acentos e caracteres especiais por sublinhados `_`).
* `color` (String): Cor de destaque em representação hexadecimal utilizada para renderizar a barra de planejamento ativo daquele projeto específico.

---

## 2. Mapa de Feriados: `feriados.json`

O arquivo `feriados.json` armazena os feriados e dias não úteis considerados na agenda de cálculo do cronograma de atividades.

### Estrutura de Dados:
A aplicação é retrocompatível com dois formatos de entrada de dados para facilitar importações externas manuais.

#### Formato 1: Mapa Chave-Valor (Padrão de Escrita da Aplicação)
```json
{
  "2026-01-01": "Confraternização Universal (Ano Novo)",
  "2026-04-21": "Tiradentes",
  "2026-05-01": "Dia do Trabalho",
  "2026-09-07": "Independência do Brasil",
  "2026-10-12": "Nossa Senhora Aparecida",
  "2026-11-02": "Finados",
  "2026-11-15": "Proclamação da República",
  "2026-12-25": "Natal"
}
```

#### Formato 2: Matriz de Objetos (Retrocompatibilidade de Leitura)
```json
[
  { "data": "2026-01-01", "nome": "Ano Novo" },
  { "date": "2026-04-21", "name": "Tiradentes" }
]
```

Durante a inicialização da aplicação, o interpretador lê qualquer uma das estruturas acima e a consolida internamente sob um mapa de busca reativo chaveado (`holidaysMap.value`).

---

## 3. Planilha de Tarefas: `<nome_do_projeto>.csv`

Cada projeto mapeado no portfólio possui sua própria planilha de dados no formato de arquivo CSV (valores separados por ponto e vírgula). O delimitador preferencial de escrita é o ponto e vírgula `;`, porém o leitor suporta detecção automática para vírgula `,`.

### Campos Escritos Oficialmente (`CSV_WRITE_FIELDS`)
Durante o salvamento das alterações, a aplicação grava exatamente 13 colunas estruturadas conforme a tabela abaixo:

| Cabeçalho CSV | Chave Interna JS | Tipo de Dado | Descrição do Campo |
|---|---|---|---|
| **`ID`** | `id` | Inteiro (Auto-incremento) | Identificador numérico exclusivo da tarefa. |
| **`Tarefa`** | `task` | String | Nome descritivo da atividade do cronograma. |
| **`Duracao`** | `duration` | Inteiro | Tempo estimado da tarefa em **dias úteis**. |
| **`Progresso`** | `percent` | Inteiro ($0$ a $100$) | Grau de conclusão percentual da tarefa. |
| **`Predecessora`** | `predecessor` | String | IDs das tarefas predecessoras (ex: `"1"` ou `"1,2"`). |
| **`Tipo`** | `type` | String (`"FS"` ou `"SS"`) | Vínculo de dependência: Finish-to-Start ou Start-to-Start. |
| **`Data_Inicial_Real`** | `realStart` | Data (`YYYY-MM-DD`) | Registro do início real do trabalho físico. |
| **`Data_Final_Real`** | `realEnd` | Data (`YYYY-MM-DD`) | Registro da conclusão real do trabalho físico. |
| **`Data_Inicial_Planejada`**| `plannedStart` | Data (`YYYY-MM-DD`) | Trava de cálculo: fixa a data de início da tarefa. |
| **`Data_Final_Planejada`** | `plannedEnd` | Data (`YYYY-MM-DD`) | Trava de cálculo: fixa a data de término da tarefa. |
| **`Data_Inicial_Baseline`** | `baselineStart` | Data (`YYYY-MM-DD`) | Linha de Base: Início original do snapshot. |
| **`Data_Final_Baseline`** | `baselineEnd` | Data (`YYYY-MM-DD`) | Linha de Base: Término original do snapshot. |
| **`Baseline_Data`** | `baselineDate` | Data (`YYYY-MM-DD`) | Registro do dia de criação do snapshot da Linha de Base. |

---

## 4. Retrocompatibilidade de Cabeçalhos (Mapeamento de Leitura)

Para aceitar arquivos preenchidos manualmente pelo usuário em ferramentas externas (como Microsoft Excel ou Google Sheets), o motor de leitura do leitor mapeia dinamicamente diferentes aliases (sinônimos) para a mesma propriedade interna do sistema:

```javascript
const CSV_READ_ALIASES = {
  task: ['tarefa', 'name'],
  percent: ['progresso', 'concluido', 'percentagem'],
  duration: ['dias', 'duracao'],
  predecessor: ['predecessora'],
  type: ['tipo'],
  plannedStart: ['data_inicial_planejada', 'planned_start'],
  plannedEnd: ['data_final_planejada', 'planned_end'],
  realStart: ['data_inicial_real', 'actual_start', 'real_start'],
  realEnd: ['data_final_real', 'actual_end', 'real_end'],
  baselineStart: ['data_inicial_baseline', 'baseline_start'],
  baselineEnd: ['data_final_baseline', 'baseline_end'],
  baselineDate: ['baseline_data', 'baseline_date']
};
```

### Algoritmo de Mapeamento Receptivo (`mapCSVRow`):
1. A planilha é aberta e suas linhas são fatiadas usando o delimitador detectado.
2. Cada cabeçalho lido é convertido para letras minúsculas e limpo de espaços laterais.
3. Para cada coluna mapeada na especificação, o sistema busca na linha se existe algum alias correspondente preenchido.
4. Se encontrado, transfere o valor para a chave JavaScript correspondente. Se não houver, assume uma string vazia `""` ou o valor por omissão (default).
5. O sistema garante que se a planilha não declarar uma coluna `ID`, o indexador atribui uma contagem autoincrementável ordenada iniciando em 1.
