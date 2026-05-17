# Guia de Integrações, Migração e Conectores de Dados

Este documento descreve as interfaces de exportação, importação e migração de dados do **ProjectGantt**, orientando sobre como integrar o sistema com planilhas corporativas (Excel/Google Sheets) e transferir dados entre diferentes estações de trabalho sem o uso de servidores.

---

## 1. Conectividade com Planilhas (Microsoft Excel / Google Sheets)

O formato de persistência principal das tarefas de cada projeto é o **CSV (Comma-Separated Values)**. Para garantir a compatibilidade universal com softwares de planilhas de terceiros (especialmente o Microsoft Excel em sistemas operacionais configurados em português), o sistema implementa recursos especializados de formatação.

### A. O Delimitador Dinâmico e Detecção Automática
O leitor lê planilhas geradas externamente suportando automaticamente dois delimitadores clássicos:
1. **Ponto e Vírgula (`;`):** Delimitador padrão adotado por sistemas em língua portuguesa (onde a vírgula é reservada para casas decimais).
2. **Vírgula (`,`):** Delimitador padrão internacional de planilhas.

O algoritmo em `parseCSV` analisa a primeira linha de cabeçalhos e define o separador de forma autônoma:
```javascript
const delim = lines[0].includes(';') ? ';' : ',';
```

### B. O Marcador de Ordem de Byte (BOM UTF-8)
O Microsoft Excel possui uma limitação histórica de não reconhecer codificação UTF-8 nativamente em arquivos CSV, corrompendo acentos e caracteres latinos (como "Início", "Duração", "Concluído").
Para solucionar isso, o ProjectGantt **obrigatoriamente injeta o caractere de controle BOM (`\ufeff`)** no primeiro byte de qualquer arquivo CSV salvo:
```javascript
await writable.write('\ufeff' + content);
```
Isso força o Microsoft Excel, LibreOffice e Google Sheets a abrirem o arquivo com decodificação UTF-8 perfeita, preservando todos os acentos e textos especiais sem necessidade de assistentes manuais de importação pelo usuário.

### C. Proteção contra Injeção de Fórmulas em CSV (CSV Injection Protection)
Como medida de segurança para auditorias de conformidade, ao persistir textos editados pelo usuário, o sistema protege contra execução de código malicioso em planilhas externas. A função `sanitizeCSV` acrescenta uma aspa simples de escape `'` se detectar que o campo inicia com caracteres de fórmula:
```javascript
function sanitizeCSV(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@|\t]/.test(val)) return "'" + val;
  return val;
}
```

---

## 2. Migração de Dados a Partir de Outros Softwares (MS Project / Jira)

Para migrar cronogramas existentes do **Microsoft Project**, **Jira** ou **Trello** para o ProjectGantt, basta exportar os dados dessas ferramentas em formato de tabela (Excel/CSV) e renomear as colunas para que coincidam com um dos aliases aceitos pelo motor de leitura.

### Aliases de Cabeçalhos Suportados:
Durante a abertura do arquivo CSV, a função `mapCSVRow` mapeia as colunas estrangeiras conforme a tabela abaixo:

| Propriedade JS Interna | Cabeçalho Oficial | Aliases Aceitos na Importação |
| :--- | :--- | :--- |
| `task` | `Tarefa` | `tarefa`, `name`, `nome`, `activity` |
| `duration` | `Duracao` | `dias`, `duracao`, `duration`, `dias_uteis` |
| `percent` | `Progresso` | `progresso`, `concluido`, `percentagem`, `percent` |
| `predecessor` | `Predecessora` | `predecessora`, `predecessor`, `id_predecessor` |
| `type` | `Tipo` | `tipo`, `type`, `vinculo` |
| `plannedStart` | `Data_Inicial_Planejada` | `planned_start`, `data_inicial_planejada`, `inicio_planejado` |
| `plannedEnd` | `Data_Final_Planejada` | `planned_end`, `data_final_planejada`, `termino_planejado` |
| `realStart` | `Data_Inicial_Real` | `actual_start`, `real_start`, `data_inicial_real` |
| `realEnd` | `Data_Final_Real` | `actual_end`, `real_end`, `data_final_real` |

> [!TIP]
> Se o arquivo CSV importado não contiver uma coluna `ID`, o ProjectGantt gerará automaticamente IDs sequenciais ordenados (1, 2, 3...) a partir da primeira linha de dados.

---

## 3. Transferência Manual de Dados entre Máquinas (Modo Fallback Cache)

Caso o usuário esteja utilizando o aplicativo em um navegador sem acesso à File System Access API (Safari ou Firefox) e precise transferir seus projetos para outro computador ou navegador, ele pode fazer isso facilmente por meio do conector de backup em localStorage.

### Roteiro de Backup Manual do Cache:
1. Pressionar `F12` para abrir o Console de Desenvolvedor do Navegador.
2. Na aba **Application** ou **Storage**, selecionar **LocalStorage**.
3. Localizar e copiar o conteúdo inteiro da chave `gantt_fs_index` (que lista as planilhas virtuais salvas).
4. Localizar e extrair a string ofuscada (iniciada com `v1:e:`) da chave correspondente ao projeto desejado (ex: `gantt_fs_meu_projeto.csv`).
5. No computador de destino, criar a mesma chave em localStorage e colar o conteúdo extraído. O ProjectGantt reconhecerá os dados reativos imediatamente.

---

## 4. Integrações Gráficas e Geração de Relatórios (PDF/PNG Canvas)

O ProjectGantt integra duas grandes bibliotecas open-source via CDN para produzir saídas gráficas em alta definição diretamente no cliente.

### A. Integração de Captura PNG (`html2canvas`)
O sistema converte os elementos do DOM HTML (especificamente a linha do tempo CSS do Gantt e as linhas da tabela) em um Canvas do HTML5.
* **Resolução e Dimensionamento:** O script calcula as dimensões físicas reais do elemento scrollável do Gantt para desenhar a imagem inteira, e não apenas a porção visível na viewport do monitor.
* **Uso Corporativo:** A imagem gerada é oferecida como download direto de arquivo PNG para o usuário incluir em relatórios corporativos.

### B. Integração de Relatórios em PDF (`jsPDF`)
O exportador em PDF não faz uma simples impressão de tela da página web. Em vez disso, compila um documento estruturado sob medida:
1. **Páginas Multi-Formato:** Ajusta automaticamente a orientação do PDF para Paisagem (Landscape) para acomodar a extensão horizontal da linha do tempo.
2. **Desenho de Vetores:** Converte os dados das tarefas em linhas de texto formatadas e blocos geométricos PDF que representam as barras de planejamento de forma nítida e sem perda de resolução ao aplicar zoom.
