# Design de Arquitetura do Sistema

## 1. Visão Geral
O **ProjectGantt** é uma aplicação Single Page Application (SPA) moderna, desenhada sob o paradigma **Local-First**. Isso significa que a aplicação não depende de servidores em nuvem para processar ou armazenar dados. Toda a lógica de negócios e persistência ocorrem diretamente no navegador do usuário e em seu sistema de arquivos local.

## 2. Tecnologias Core
- **Framework UI:** Vue.js 3 (Composition API via Global Build / CDN)
- **Estilização:** CSS3 Vanilla, utilizando CSS Variables (Custom Properties) para theming dinâmico (Light/Dark mode) e design tokens.
- **Armazenamento / Persistência:**
  - `File System Access API`: Para leitura e escrita direta em arquivos `.csv` na máquina do usuário.
  - `IndexedDB`: Utilizado via wrapper nativo para armazenar os handles (`FileSystemDirectoryHandle`) de diretórios, garantindo reconexão em sessões futuras.
  - `LocalStorage`: Cache em memória quente para renderização otimista (UI não trava enquanto o sistema de arquivos responde).
- **Exportação Gráfica:** `html2canvas` para conversão do DOM do Gráfico de Gantt em imagem PNG.

## 3. Paradigma Local-First Serverless
Ao contrário de arquiteturas clássicas (Cliente-Servidor), a arquitetura do ProjectGantt pode ser definida como **Cliente-Sistema de Arquivos**.
1. O usuário concede permissão a uma pasta.
2. A aplicação usa Vue.js para parsear os arquivos `.csv` existentes na pasta.
3. As alterações na interface refletem no estado reativo do Vue.
4. Qualquer alteração (nova tarefa, nova data) aciona uma gravação síncrona no arquivo CSV via `FileSystemWritableFileStream`.

## 4. Gerenciamento de Estado
A aplicação adota um estado centralizado dentro da função `setup()` do `Vue.createApp()`. As variáveis mais importantes são:
- `tasks`: Lista reativa principal das tarefas.
- `projectMetadata`: Informações do projeto ativo.
- `holidaysMap`: Dicionário de feriados locais para cálculo de dias úteis.
- `directoryHandle`: Referência de ponteiro seguro para a pasta local conectada.

## 5. Dívida Técnica & Riscos Arquiteturais Atuais
- **Escalabilidade do Arquivo Central (`vue_app.js`):** Atualmente, toda a lógica de estado, parser CSV, renderização e cálculo de cronograma está acoplada em um único arquivo de script extenso. A refatoração para um empacotador formal (como Vite) usando SFCs (Single File Components) como já vislumbrado na pasta `/src` seria o próximo passo evolutivo para melhorar a manutenção.
- **Limitação de Navegadores:** O uso da `File System Access API` restringe a funcionalidade principal da aplicação ao ecossistema Chromium (Google Chrome, Edge, Opera, Brave). Navegadores como Firefox e Safari não suportam a escrita local desta forma, forçando a aplicação a operar apenas em modo "Somente Leitura/Exportação".
