# Diagrama de Estados do Sistema Vue (Reatividade)

Abaixo descrevemos o fluxo de estado da arquitetura Vue.js do projeto e seus vetores reativos.

## 1. Store State do `vue_app.js`

### Estados Booleanos e Status UI
- `hasFolder` (Boolean): Switch-chave para renderizar o Gantt ou exibir a Empty State Screen. Depende diretamente de `directoryHandle` possuir conteúdo válido ou local storage ativo.
- `permissionStatus` (String): Três posições possíveis: `'granted'`, `'prompt'` ou `'denied'`. Orienta a renderização de banners de restabelecimento.
- `show[Nome]Modal` (Boolean): Triggers ativados para sobreposições opacas na UI, impedindo fluxos adjacentes.

### Estado Central das Tarefas
- `tasks` (Array de Objetos): O reator nuclear do aplicativo. Qualquer alteração aqui reflete instantaneamente nas coordenadas x, y na interface.
  - Campos-Chave do Ciclo de Vida:
    - `duration`, `predecessor` (Inputs).
    - `start`, `end`, `dateSource` (Calculados/Efemeros).
    - `plannedStart`, `baselineStart`, `realStart` (Gravados Rigidamente).

### Cache e Fallbacks (Memória do Sistema)
```javascript
// Exemplo de como a cadeia interage
Tasks UI -> Proxy (Ref Vue) -> LocalStorage (JSON string) -> FileSystemAPI (CSV parse)
```
Se a fase do FileSystemAPI falhar, o Proxy e o LocalStorage mantêm a UX livre de quebras sistêmicas.

## 2. Re-renderização e Otimização do DOM
Devido à massiva quantidade de nós originados das barras (`ch-cell` e `bar`), a re-renderização (`buildTimeline`) foi projetada como um derivado secundário e programado:
1. Uma alteração ocorre no modal de tarefa.
2. `calculateSchedule()` altera apenas os atributos literais do array na memória ram.
3. `buildTimeline()` rastreia as datas min/max para injetar / podar dias das margens.
4. Por estar sob reatividade fina do Vue (`v-for` associado a `:key="t.id"`), apenas nós de gráficos efetivamente alterados são tocados (diff) na renderização nativa de browser.

## 3. Sincronismo da Barras Visuais
A área de gráfico usa variáveis calculadas inline para plotar barras em grid absoluta:
- `getBarLeft(task, index)`: Descobre a distância em Pixel calculando a diferença do dia da atividade com o dia `allDays[0]`.
- `getBarWidthPx(task)`: Transforma a variação de datas em Pixels lineares através do construto pre-definido `--col-w`.
- Animações CSS em propriedades limpas (`transform`, `opacity`, `width`) aliviam travamentos da thread UI delegando à GPU a animação de entrada (slide e rotacionamento de marcos).
