# Lógica e Regras de Negócio de Agendamento (Gantt Engine)

## 1. O Motor de Agendamento (`calculateSchedule`)
O **ProjectGantt** implementa um motor local assíncrono projetado para calcular as datas de todas as tarefas com base em suas precedências lógicas. O cálculo ignora feriados definidos pelo usuário e fins de semana.

## 2. Parâmetros de Entrada da Tarefa
Para que uma tarefa seja processada, ela precisa de:
- **Duração (`duration`):** Em dias úteis. (0 dias representa um Marco / Milestone).
- **Predecessoras (`predecessor`):** IDs de tarefas que ditam o início.
- **Tipo de Relação (`type`):**
  - `FS` (Finish-to-Start): A tarefa sucessora começa no dia útil imediatamente após a conclusão da predecessora. (Padrão)
  - `SS` (Start-to-Start): A sucessora se alinha para começar no mesmo dia que a predecessora.
- **Datas de Execução (`realStart`, `realEnd`):** Opcionais. Sobrepõem-se no cálculo do cronograma e geram atrasos em cascata.
- **Datas Fixadas (Locked):** O usuário pode fixar datas planejadas. O sistema respeita as tags fixas e não as sobrescreve.

## 3. Algoritmo de Cascata
O cálculo opera resolvendo dependências hierárquicas.
1. O motor lê todas as dependências (`predecessor`) listadas em string e tenta transformá-las em um Array numérico.
2. É feita a iteração do "mais restritivo". Se a tarefa B depende de A, e A terminar na sexta-feira, o início de B saltará o fim de semana e iniciará na segunda-feira.
3. Função `addWorkingDays(start, n)` avança o relógio avaliando a cada iteração:
   - É fim de semana (`isWeekend`)? Se sim, pula.
   - A string ISO `YYYY-MM-DD` consta no dicionário `holidaysMap`? Se sim, pula.

## 4. O Sistema de Previsão ("Forecast")
Integrado na Sprint 5, o sistema implementa cálculo de datas reais contra datas planejadas.
Se uma tarefa predecessora tiver um "Início Real" mais tardio do que o Início Planejado, a sua sucessora terá a `dateSource` classificada como `forecast` (Previsão). A UI sinalizará que, pelo atraso atual das predecessoras, a tarefa atual será adiada.

## 5. Fotografia da Linha de Base (Baseline)
O usuário pode disparar a função `saveBaseline()`. Isso tira um instantâneo das datas calculadas atuais (`start`, `end`) e grava em dois campos rígidos no CSV (`Baseline_Start`, `Baseline_End`). Essa base serve como parâmetro estático para comparação de desempenho do projeto, exibindo barras em tons cinzas no fundo do gráfico.

## 6. KPIs (Key Performance Indicators)
O motor calcula automaticamente indicadores:
- **SPI (Schedule Performance Index):** Percentual concluído versus percentual que deveria estar concluído na data atual.
- **Atraso Médio:** Calcula a variação de dias entre as datas de Baseline e as datas Atuais/Previsão de todas as tarefas.
