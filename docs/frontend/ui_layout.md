# Interface Gráfica e Layout Reativo (Frontend)

Este documento detalha o funcionamento técnico da interface visual do **ProjectGantt**, cobrindo o gerenciamento de estados com Vue 3 CDN, o sistema de dimensionamento responsivo das colunas, sincronizações de rolagem e os componentes interativos do dashboard.

---

## 1. Estrutura Monolítica Reativa com Vue 3 CDN

A interface do ProjectGantt baseia-se em uma arquitetura declarativa monolítica leve, implementada diretamente em `vue_app.js` e montada sobre a estrutura DOM de `index.html`. A ausência de compilação ou transpilação assegura inicialização imediata e flexibilidade de execução local.

### Estado Global Reativo (Setup Properties)
O estado geral do dashboard é mantido de forma unificada no método `App.setup()` do aplicativo Vue. As principais propriedades controladoras são:

| Estado Reativo | Tipo de Dado | Função |
|---|---|---|
| `tasks` | `Ref<Array>` | Armazena a lista oficial e enriquecida de todas as atividades do projeto atual. |
| `filteredTasks` | `Computed<Array>` | Filtra a lista de tarefas reativamente com base no texto inserido na caixa de busca. |
| `projectMetadata` | `Ref<Object>` | Metadados do projeto ativo (Nome, Gerente, Data Inicial, Arquivo de Tarefas, Cor do Tema). |
| `holidaysMap` | `Ref<Object>` | Mapa de busca direta (`hashmap`) relacionando datas ISO `YYYY-MM-DD` com as descrições dos feriados. |
| `zoomLevel` | `Ref<String>` | Define a escala horizontal ativa do Gantt (`'day'`, `'week'`, `'month'`). |
| `toasts` | `Ref<Array>` | Lista reativa contendo os avisos micro-interativos em fila exibidos no canto da tela. |
| `customDialog` | `Ref<Object>` | Configuração ativa do modal de aviso ou confirmação customizado corporativo. |

---

## 2. Grid Responsivo e Modos de Visualização das Colunas

Para se ajustar de forma fluida a telas de diferentes resoluções, o sistema oferece quatro **Modos de Visualização de Colunas** (`columnView`). O grid de exibição da tabela de tarefas adapta-se dinamicamente por meio de estilos CSS injetados dinamicamente reativamente.

### Configuração do Grid CSS Reativo (`gridTemplate`)
O tamanho e quantidade de colunas da tabela lateral do Gantt são configurados via cálculo no Vue 3 pela propriedade reativa `gridTemplate`:

* **Modo Padrão (`padrao`):** Configuração compacta para telas menores.
  * *Template:* `'30px 36px minmax(30px, 1fr) 45px 45px 45px 45px'`
  * *Colunas:* ID, Seleção de Linha, Nome da Tarefa, Duração, Progresso, Predecessora, Tipo.
* **Modo Planejamento (`planejamento`) / Execução (`execucao`):** Exibe datas planejadas/reais estimadas.
  * *Template:* `'30px 36px minmax(30px, 1fr) 45px 45px 45px 45px 85px 85px'`
  * *Colunas:* Colunas Padrão + Duas colunas adicionais para datas (Início Planejado/Real e Fim Planejado/Real).
* **Modo Completo (`completo`):** Exibe a totalidade de campos técnicos de engenharia de cronograma.
  * *Template:* `'30px 36px minmax(30px, 1fr) 45px 45px 45px 45px 85px 85px 85px 85px'`
  * *Colunas:* Colunas Padrão + Datas Planejadas + Datas Reais.

### Restrição de Largura Mínima Lateral (`minTaskListWidth`)
Para impedir que a tabela colapse ou esconda o nome das tarefas em monitores pequenos, a largura da barra lateral é limitada a limites mínimos computados de forma rígida conforme o modo ativo:

$$\text{Largura Mínima} = \begin{cases} 
325\text{px}, & \text{se } \text{columnView} = \text{'padrao'} \\
495\text{px}, & \text{se } \text{columnView} \in \{\text{'planejamento'}, \text{'execucao'}\} \\
665\text{px}, & \text{se } \text{columnView} = \text{'completo'} 
\end{cases}$$

O resizer da tabela de tarefas salva dinamicamente a preferência do usuário em localStorage via chave `'taskListWidth'`.

---

## 3. Sincronização Horizontal de Rolagem (Scroll Linkage)

Um dos maiores desafios em gráficos Gantt monolíticos sem o uso de bibliotecas de terceiros pesadas é alinhar a rolagem horizontal do cabeçalho da linha do tempo (`gantt-header-wrapper`) com o painel do grid de barras (`gantt-body-wrapper`).

O ProjectGantt soluciona isso implementando uma **rolagem acoplada bidirecional** por meio de interceptores de eventos de scroll no DOM.

### Algoritmo de Sincronização no Controle:
1. No método `onMounted`, o sistema captura os elementos DOM `headerWrapper` e `bodyWrapper`.
2. Adiciona ouvintes de eventos (`scroll`) a ambos os containers.
3. Para mitigar o efeito de "loop de eventos de rolagem infinita" (onde rolar o corpo aciona a rolagem do cabeçalho que tenta rolar o corpo de volta), o sistema implementa uma flag de controle simples chamada `isScrolling`:

```javascript
let isScrolling = false;

bodyWrapper.addEventListener('scroll', () => {
  if (isScrolling) { isScrolling = false; return; }
  isScrolling = true;
  headerWrapper.scrollLeft = bodyWrapper.scrollLeft;
});

headerWrapper.addEventListener('scroll', () => {
  if (isScrolling) { isScrolling = false; return; }
  isScrolling = true;
  bodyWrapper.scrollLeft = headerWrapper.scrollLeft;
});
```

---

## 4. Escala Temporal Horizontal e Zoom Dinâmico

O cálculo do cabeçalho do Gantt e a posição em pixels de cada barra de tarefa são orientados pela função `buildTimeline()`, que mapeia as atividades do cronograma para definir os limites inicial (`minT`) e final (`maxT`) da linha do tempo.

### Níveis de Zoom e Dimensionamento das Colunas:
A largura em pixels de cada coluna (`colWidth`) varia conforme o nível de zoom ativo:

* **Dia (`day`):** Cada coluna representa 1 dia do calendário.
  * *Largura:* $30\text{px}$ por dia.
  * *Cabeçalho:* Exibe mês/ano no topo e o dia numérico/sigla do dia da semana abaixo.
* **Semana (`week`):** Cada coluna representa 1 semana cheia.
  * *Largura:* $60\text{px}$ por semana.
  * *Cabeçalho:* Exibe a identificação da semana (`S1`, `S2`, ...) e a data inicial da semana (`DD/MM`).
* **Mês (`month`):** Cada coluna representa 1 mês comercial.
  * *Largura:* $100\text{px}$ por mês.
  * *Cabeçalho:* Exibe o mês textual (`Jan`, `Fev`, ...) e o ano correspondente.

### Conversão de Datas para Coordenada Pixel (`getPos`):
A posição horizontal ($X$) de uma data na linha do tempo é determinada reativamente:

$$\text{X (Pixels)} = \begin{cases} 
\text{dayIndex} \times 30, & \text{se } \text{zoomLevel} = \text{'day'} \\
\left(\frac{\text{dayIndex}}{7}\right) \times 60, & \text{se } \text{zoomLevel} = \text{'week'} \\
(\text{monthsDiff} \times 100) + \left(\frac{\text{diaInMonth}}{30} \times 100\right), & \text{se } \text{zoomLevel} = \text{'month'}
\end{cases}$$

---

## 5. Tooltips de Informação Detalhada

Ao passar o mouse sobre qualquer barra de tarefa (seja a barra real, planejada ou baseline), o sistema intercepta as coordenadas geográficas do cursor e aciona um balão reativo interativo (`tooltip`).

### Informações Exibidas no Tooltip:
* Nome da tarefa e identificação única.
* Duração em dias úteis e percentual de conclusão.
* Tipo de predecessora e vínculo técnico (FS/SS) com outras atividades.
* Datas de Início e Fim (calculadas, reais e baseline).
* Identificação dinâmica do tipo de barra sob foco (com cores correspondentes ao tema do projeto).
