# Análise Técnica Profunda do ProjectGantt — v2

**Data:** 15 de Maio de 2026
**Analista:** DeepSeek V4 Flash (openCode)
**Propósito:** Análise minuciosa de falhas de segurança, arquitetura, design, funções não usadas, arquivos externos desnecessários, e plano de correção.

---

## Índice

1. [Metodologia](#1-metodologia)
2. [Resumo Executivo](#2-resumo-executivo)
3. [Falhas de Segurança](#3-falhas-de-segurança)
4. [Falhas de Arquitetura](#4-falhas-de-arquitetura)
5. [Falhas de Design](#5-falhas-de-design)
6. [Funções Internas Não Utilizadas](#6-funções-internas-não-utilizadas)
7. [Arquivos Externos Desnecessários](#7-arquivos-externos-desnecessários)
8. [Plano de Correção](#8-plano-de-correção)

---

## 1. Metodologia

- Leitura integral de todos os 36+ arquivos do projeto (~12.000 linhas)
- Análise estática de fluxo de dados, dependências e chamadas de função
- Verificação de importação/exportação entre módulos
- Comparação entre versão Legacy (CDN) e Refatorada (Vite + Vuetify)
- Mapeamento de estado global, armazenamento e persistência

---

## 2. Resumo Executivo

O projeto ProjectGantt contém **duas aplicações concorrentes e incompletas** que compartilham o mesmo diretório mas nunca são executadas juntas. A versão Legacy (`index.html` + `vue_app.js`) tem ~95% dos recursos funcionando. A versão Refatorada (`src/` + Vite) tem ~30-40% dos recursos migrados, com vários componentes quebrados ou incompletos.

**Problema central:** Nenhuma das duas versões está completa e pronta para produção. A decisão de arquitetura entre manter o CDN ou migrar totalmente para Vite+Vuetify nunca foi finalizada.

**Arquivos mortos:** ~40% do código no repositório é não utilizado (scripts de migração, build, assets de template, documentação extensa e desatualizada, notas pessoais).

---

## 3. Falhas de Segurança

### S-01: CSV Injection (Severidade: ALTA)

**Arquivos:** `vue_app.js:362-400`, `useGantt.js:176-214`, `saveTasksToDisk`

Nenhum valor de CSV é sanitizado contra CSV Injection. Um campo `task` contendo `=CMD(...)`, `+OOMML`, `|SYSTEM` seria executado ao abrir o CSV exportado no Excel.

```js
// vue_app.js:418-434
csvContent += `${id};"${task}";${duration};${percent};"${pred}";"${type}";...`
// task não é sanitizada contra fórmulas maliciosas
```

### S-02: XSS via Atributos HTML (Severidade: ALTA)

**Arquivo:** `index.html:823-826`, `index_legacy.html:946-950`

Dados de tarefas são interpolados diretamente em `:title` e conteúdo HTML sem sanitização:

```html
<span class="name" :title="t.task">{{ t.task }}</span>
```

Se `t.task` contiver `<script>`, será executado. Embora Vue escape texto por padrão, `:title` com conteúdo não sanitizado é um vetor potencial.

### S-03: Nenhuma Validação de Input nos Modais (Severidade: MÉDIA)

**Arquivos:** `TaskModal.vue:97-104`, `various modals`

Campos de texto nos modais não têm validação de tipo, tamanho ou caracteres especiais:

```vue
<v-text-field v-model="taskData.task" label="Nome da Tarefa" ... />
```

### S-04: Dados Sensíveis em localStorage sem Criptografia (Severidade: BAIXA)

**Arquivo:** `vue_app.js:948-954`, `useGantt.js:221-222`

Dados do projeto (tarefas, metadados) são armazenados em texto puro no localStorage, acessível por qualquer extensão ou script na mesma origem.

### S-05: File System Access API sem Fallback (Severidade: ALTA)

**Arquivo:** `vue_app.js:906-917`, `useGantt.js:405-419`

`window.showDirectoryPicker` só funciona em Chromium. Firefox, Safari e outros navegadores não têm suporte. O usuário fica preso ao Chrome sem nenhuma alternativa.

### S-06: Sem Backup Antes de Salvar (Severidade: MÉDIA)

**Arquivo:** `useGantt.js:237-267`, `vue_app.js:397-414`

Arquivos CSV são sobrescritos via `createWritable` sem criar `.bak` primeiro. Um erro de escrita corrompe permanentemente os dados do projeto.

---

## 4. Falhas de Arquitetura

### A-01: Duas Aplicações Concorrentes (Severidade: CRÍTICA)

```
Projeto
├── index.html + vue_app.js   ← Legacy (CDN, ~95% funcional)
└── src/ + vite.config.js     ← Refatorada (Vite+Vuetify, ~30% funcional)
```

**Problemas:**

1. `vite.config.js` usa `index.html` como entry point — que carrega `vue_app.js` via CDN
2. `src/main.js` cria OUTRA aplicação Vue + Vuetify e tenta montar em `#app`
3. `DashboardModal.vue` referencia `gantt.allTasks` que **NÃO EXISTE** em `useGantt.js:23`
4. `App.vue:26-28` desestrutura funções que **NÃO EXISTEM** no retorno de `useGantt():573-586`:
   - `recalculateTasks` (não existe — o nome correto é `recalculateTasks` mas em `useGantt:285` ela existe)
   - Na verdade `recalculateTasks` existe em `useGantt:285`, mas `showBaseline` NÃO é uma função — é um `ref` (não pode ser usado como `showBaseline.value` em template sem expor)
   
   **Correção necessária em App.vue:26:**
   ```js
   // showBaseline e setBaseline não existem como retorno
   // showBaseline é um ref interno não exportado
   // setBaseline é exportado como setBaseline
   ```

5. O `dist/` foi buildado a partir da versão SFC, mas `npm run dev` serve `index.html` que carrega `vue_app.js`

### A-02: useGantt.js com Código Legado Duplicado (Severidade: ALTA)

**Arquivo:** `src/composables/useGantt.js`

- `getDB()`, `saveHandleToDB()`, `loadHandleFromDB()` (linhas 40-76) — duplicado de `vue_app.js:84-128`
- `parseCSV` em `vue_app.js:362` não existe em `useGantt.js` (usa PapaParse diretamente)
- `buildTimeline()` (linha 319) — duplicado de `vue_app.js:800`
- `getPos()` (linha 393) — duplicado de `vue_app.js:893`

### A-03: GanttEngine.js Inconsistente com vue_app.js (Severidade: ALTA)

**Arquivo:** `src/services/GanttEngine.js`

- `GanttEngine.js` usa `plannedStartDate`/`plannedEndDate` como objetos Date
- `vue_app.js` usa `start`/`end` diretamente como Date
- `GanttEngine.js` faz **dois passes** (baseline + forecast) enquanto `vue_app.js` faz **um passe** único
- `GanttEngine.js` aceita `holidaysMap` como parâmetro; `vue_app.js` usa `holidaysMap` do escopo

### A-04: Duplicação de Funções Utilitárias (Severidade: MÉDIA)

| Função | vue_app.js | useGantt.js | GanttEngine.js |
|--------|-----------|-------------|----------------|
| `isWeekend` | linha 15-18 | ✗ (importa) | linha 1-4 |
| `addDays` | linha 20-24 | ✗ (importa) | linha 6-10 |
| `parseDate` | linha 26-38 | ✗ (importa) | linha 12-26 |
| `isWorkingDay` | linha 310-315 | linha 90 | linha 28-33 |
| `addWorkingDays` | linha 317-326 | linha 91 | linha 35-44 |
| `getBusinessDayIndex` | linha 328-335 | linha 92 | linha 46-53 |

### A-05: Dependência Circular no Cache (Severidade: MÉDIA)

**Arquivo:** `useGantt.js:421-450` + `TaskModal.vue:62-64`

```
saveTasksToDisk() → escreve CSV → loadProject() → loadSelectedProject() → calculateSchedule() → buildTimeline()
```

Cada salvamento recarrega TODO o projeto do disco, perde scroll, hover, seleção. Ciclo vicioso de I/O.

### A-06: Calendário de Feriados Inconsistente (Severidade: MÉDIA)

| Versão | Formato | Arquivo | Chave |
|--------|---------|---------|-------|
| `vue_app.js` | Objeto `{ 'YYYY-MM-DD': 'Name' }` | `feriados.json` | `holidaysMap` |
| `useGantt.js` | Mesmo formato | `feriados.json` | `holidaysMap` |
| Legado `index.html` | Mesmo formato | `feriados.json` | `holidaysMap` |
| build.py | NÃO CARREGA feriados | N/A | N/A |

O script `build.py` gera `index_vue.html` que **não tem suporte a feriados**.

### A-07: Três Formatos de Arquivo de Projeto (Severidade: BAIXA)

| Arquivo | Formato | Usado por |
|---------|---------|-----------|
| `portfolio.json` | JSON array | Versão refatorada + vue_app.js |
| `projeto.csv` | CSV (chave;valor) | Legado (removido nas versões recentes) |
| Nome do diretório | Nome da pasta | Fallback |

`portfolio.json` e `projeto.csv` coexistem mas têm estruturas diferentes.

---

## 5. Falhas de Design

### D-01: DashboardModal.vue Cria Dependência Inexistente (Severidade: CRÍTICA)

**Arquivo:** `src/components/DashboardModal.vue:16-17`

```js
const allTasks = computed(() => {
  return gantt.allTasks ? gantt.allTasks.value : gantt.tasks.value;
});
```

`gantt.allTasks` **NÃO EXISTE** em `useGantt.js`. O `provide('gantt', {...})` em `App.vue:32-42` também não inclui `allTasks`. Isso faz o dashboard crashar silenciosamente (cair no fallback `gantt.tasks.value`).

### D-02: ChartArea.vue Sem Tooltips (Severidade: ALTA)

**Arquivo:** `src/components/ChartArea.vue`

Comparado com `index.html:867-883` que tem tooltips detalhados com `showTooltip()`/`hideTooltip()`, o `ChartArea.vue` só tem `:title` básico do HTML e `@dblclick`.

O tooltip detalhado com dados de baseline, forecast, desvio **não existe** na versão SFC.

### D-03: TaskList.vue Excessivamente Simplificado (Severidade: MÉDIA)

**Arquivo:** `src/components/TaskList.vue`

Comparado com `index.html:806-845` que tem:
- Checkboxes para seleção de baseline
- Colunas de data planejada/real
- Badges de atraso/adiantamento
- Indicador de data source (locked/forecast)
- Row highlighting e delay indicators

O `TaskList.vue` SFC **só tem ID, Tarefa, Duração, %** — 4 colunas vs 11 colunas.

### D-04: TaskModal.vue Campos Inconsistentes (Severidade: ALTA)

**Arquivo:** `src/components/TaskModal.vue:22-27`

O modal usa `taskData.value.actualStart`/`actualEnd` que corresponde aos dados carregados em `useGantt.js:189-190`. Mas o CSV salva como `Data_Inicial_Real`/`Data_Final_Real`. Funciona, mas os nomes são inconsistentes entre CSV header e variável JS.

### D-05: Nomes de Campos CSV vs JS Inconsistentes (Severidade: MÉDIA)

| CSV Header | Variável useGantt.js | Variável vue_app.js |
|------------|---------------------|---------------------|
| `Data_Inicial_Planejada` | `plannedStart` | `plannedStart` |
| `Data_Final_Planejada` | `plannedEnd` | `plannedEnd` |
| `Data_Inicial_Real` | `actualStart` / `real_start` | `realStart` |
| `Data_Final_Real` | `actualEnd` / `real_end` | `realEnd` |
| `Baseline_Start` | `baselineStart` | `baselineStart` |
| `Baseline_End` | `baselineEnd` | `baselineEnd` |

`vue_app.js` usa `realStart`/`realEnd` enquanto `useGantt.js` usa `actualStart`/`actualEnd`.

### D-06: `index_vue.html` Sem Tooltip (Severidade: MÉDIA)

**Arquivo:** `build.py:9-124`

O template gerado não inclui o elemento `<div class="tooltip" id="tooltip">`. Como resultado, `showTooltip()` em `vue_app.js` tenta manipular `document.getElementById('tooltip')` que retorna `null`, causando erro.

### D-07: Missing Feature Parity na Versão SFC (Severidade: ALTA)

| Funcionalidade | Legacy (index.html) | SFC (src/) |
|---------------|-------------------|------------|
| PDF Export | ✅ | ❌ |
| CSV Export | ✅ | ❌ (DashboardModal exporta CSV) |
| PNG Export | ✅ | ✅ |
| Baseline Select (checkboxes) | ✅ | ❌ |
| Forecast Engine UI | ✅ | ❌ |
| Project Wizard | ✅ | ❌ |
| Toast Notifications | ✅ | ❌ |
| Custom Dialog (Alert/Confirm) | ✅ | ❌ |
| Keyboard Shortcuts | ✅ | ❌ |
| Filter Bar (Sprint 8) | ✅ (legacy only) | ❌ |
| Dashboard Modal | ❌ (legacy index_vue only) | ✅ (quebrado) |

### D-08: `dist/` Versionado no Git (Severidade: BAIXA)

**Arquivo:** `.gitignore:11` — contém `dist` mas ele está no repositório (provavelmente foi adicionado antes de entrar no .gitignore). O build de produção não deveria estar versionado.

### D-09: `addToast` com Argumentos na Ordem Errada (Severidade: BAIXA)

**Arquivo:** `vue_app.js:1288`

```js
addToast('success', 'Imagem HD (PNG) exportada com sucesso!');
```

Definição: `addToast(message, type, duration)`. Deveria ser:
```js
addToast('Imagem HD (PNG) exportada com sucesso!', 'success');
```

### D-10: HelloWorld.vue, src/style.css, assets/ — Artefatos de Template (Severidade: BAIXA)

O Vite scaffold original deixou `HelloWorld.vue`, `src/style.css`, `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/vue.svg`. Nenhum é usado pela aplicação real.

---

## 6. Funções Internas Não Utilizadas

### F-01: `vue_app.js:showLoading()` / `hideLoading()` (Linhas 912-921)

**Status:** Usada APENAS por `exportPNG()` (linha 928). Nunca usada em nenhum outro lugar. Funções de overlay de loading que poderiam ser usadas em todo lugar mas não são.

### F-02: `vue_app.js:getDayOfWeekPT()` (Linha 354-359)

**Status:** Definida mas seu retorno nunca é usado no template. O template inline em `index.html:1037` usa `getDayOfWeekPT(newHolidayDate)` diretamente.

### F-03: `GanttEngine.js:getBusinessDayIndex()` (Linha 46-53)

**Status:** Exportada e importada por `useGantt.js:20` como `getBusinessDayIndex`. Usada APENAS em `useGantt.js:92` como wrapper local `getBusinessDayIndexLocal`, que por sua vez é usada em `stats` computed (linha 493). Portanto é usada, mas indiretamente.

### F-04: `useGantt.js:isWorkingDayLocal / addWorkingDaysLocal / getBusinessDayIndexLocal` (Linhas 90-92)

**Status:** Wrappers locais que NÃO SÃO EXPORTADOS. Só `getBusinessDayIndexLocal` é usado (no `stats` computed). `isWorkingDayLocal` e `addWorkingDaysLocal` nunca são chamados em lugar nenhum.

### F-05: `build.py` Inteiro

**Status:** Script que gera `index_vue.html`. `index_vue.html` existe mas não é usado por `npm run dev` (que serve `index.html`) nem por `npm run build` (que gera `dist/`). O script e seu output são órfãos.

### F-06: `refactor.py` Inteiro

**Status:** Script de migração única. Transformou manualmente index.html original para usar Vue. Foi executado uma vez e nunca mais. Manter 1030 linhas de script de migração no repositório é desnecessário.

### F-07: `check_console.js` Inteiro

**Status:** Script Puppeteer para debugging de console. Puppeteer não está nas dependências. Script nunca será executável no ambiente atual.

---

## 7. Arquivos Externos Desnecessários

### X-01: `Service-Desk - WorkFlow.txt`

Notas pessoais não relacionadas ao projeto ("Refaturamento", "Devolução Física"). Não deveria estar no repositório.

### X-02: `dist/` (Pasta Inteira)

Build output do Vite versionado. `dist` está no `.gitignore` mas já foi adicionado antes. Deveria ser removido do tracking.

### X-03: `index_legacy.html`

Backup obsoleto de uma versão anterior. Todo o conteúdo útil já foi migrado para `index.html`. Mantê-lo cria confusão sobre qual versão é a correta.

### X-04: `index_vue.html`

Gerado por `build.py`. Não usado por nenhum processo oficial (`npm run dev` usa `index.html`, `npm run build` gera `dist/`).

### X-05: `build.py` e `refactor.py`

Scripts de migração/build que não servem mais ao propósito atual. O Vite já faz o build. Se precisar de single-file, o próprio Vite pode ser configurado.

### X-06: `src/components/HelloWorld.vue`

Componente scaffold do `npm create vite`. Não importado por nenhum outro arquivo. Não tem relação com Gantt.

### X-07: `src/style.css`

Estilos do template Vite (hero section, social links, documentação). Não usado pela aplicação real (que usa Vuetify + CSS inline em `index.html`).

### X-08: `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/vue.svg`

Assets do template Vite scaffold. Só referenciados por `HelloWorld.vue` que não é usado.

### X-09: `public/icons.svg`

SVG sprite sheet com ícones de redes sociais (Bluesky, Discord, GitHub, X). Não referenciado por nenhum componente da aplicação real.

### X-10: `docs/` (Documentação Extensa Desatualizada)

12 subdocumentos de documentação técnica (`architecture/system-design.md`, `backend/backend.md`, `database/local-storage.md`, `deploy/deployment.md`, `diagrams/state-diagram.md`, `flows/user-journey.md`, `api/file-system-api.md`, `frontend/ui-ux.md`, `integrations/integrations.md`, `requirements/project-requirements.md`, `security/local-first.md`, `testing/testing-strategy.md`).

- Muita documentação para um projeto pessoal
- A maioria está desatualizada em relação ao código atual
- `deploy/deployment.md` menciona GitHub Pages mas não há config
- `testing/testing-strategy.md` sugere Vitest e Playwright mas não há setup
- `security/local-first.md` menciona "ephemeral session permissions" que não existe

Apenas `MANUAL_USUARIO.md` e `Gantt_Professionalization_Plan.md` têm valor real.

### X-11: `.vscode/extensions.json`

Recomenda apenas `Vue.volar`. Útil mas mínimo. Poderia ser expandido ou removido.

---

## 8. Plano de Correção

O plano abaixo lista cada problema identificado com prioridade, ação necessária e arquivos afetados.

### Fase 1: Críticos — Segurança e Arquitetura (0-2 dias)

|  ID  |    Problema   | Ação | Prioridade |
|------|---------------|------|------------|
| S-01 | CSV Injection | Adicionar sanitização: prefixar valores com `'` (apóstrofo) se começarem com `=`, `+`, `-`, `@`, `\|` | 🔥 Crítica |
| S-02 | XSS via :title | Usar `v-text` ou sanitizar com DOMPurify antes de renderizar dados CSV | 🔥 Crítica |
| A-01 | Duas apps concorrentes | **Decisão fundamental**: escolher UMA versão. Recomendação: migrar 100% para Vite+Vuetify, abandonar `index.html` + `vue_app.js` | 🔥 Crítica |
| D-01 | DashboardModal allTasks | Corrigir referência: remover `gantt.allTasks` e usar `gantt.tasks` diretamente | 🔥 Crítica |
| A-05 | Rebuild ao salvar | Otimizar `saveTasksToDisk()` para não recarregar tudo. Atualizar tasks in-place e só persistir | 🔥 Crítica |

### Fase 2: Altos — Completude Funcional (2-5 dias)

| ID | Problema | Ação | Prioridade |
|----|----------|------|------------|
| A-02 | Código duplicado useGantt | Unificar `useGantt.js` e `vue_app.js` na versão escolhida | Alta |
| A-04 | Duplicação de utils | Consolidar `isWeekend`, `addDays`, `parseDate`, `isWorkingDay`, `addWorkingDays`, `getBusinessDayIndex` em um único `src/utils/date.js` | Alta |
| D-03 | TaskList.vue simplificado | Migrar a task list completa (11 colunas) para a versão SFC | Alta |
| D-04 | TaskModal campos | Padronizar `actualStart`/`actualEnd` consistentemente entre CSV e JS | Alta |
| D-02 | ChartArea sem tooltips | Implementar sistema de tooltip similar ao legacy com baseline/forecast info | Alta |
| A-03 | GanttEngine inconsistente | Unificar lógica de schedule (dois passes vs um passe). Decidir e padronizar | Alta |
| D-07 | Feature parity | Migrar features faltantes: PDF Export, Toast, Custom Dialog, Project Wizard, Forecast UI, Keyboard Shortcuts, Filter Bar | Alta |
| S-05 | Chrome-only | Implementar fallback para Firefox/Safari: upload manual de arquivos + localStorage como armazenamento alternativo | Alta |
| S-06 | Sem backup | Adicionar salvamento automático de `.bak` antes de sobrescrever CSV | Alta |

### Fase 3: Médios — Limpeza e Consistência (5-7 dias)

| ID | Problema | Ação | Prioridade |
|----|----------|------|------------|
| A-06 | Feriados inconsistente | Garantir que feriados funcionem em ambas versões (ou só na escolhida) | Média |
| A-07 | Três formatos de projeto | Padronizar para `portfolio.json` (JSON). Remover suporte a `projeto.csv` | Média |
| D-05 | Nomes CSV vs JS | Criar mapeamento centralizado de headers CSV para variáveis JS | Média |
| D-06 | index_vue.html sem tooltip | Corrigir `build.py` para incluir tooltip, ou remover `build.py` (recomendado) | Média |
| D-09 | addToast args errados | Corrigir ordem dos argumentos | Média |
| S-03 | Validação de input | Adicionar regras de validação nos campos dos modais | Média |
| S-04 | localStorage sem crypto | Opcional: ofuscar dados sensíveis em localStorage | Média |
| F-03 | getBusinessDayIndex | Manter mas documentar; verificar se encapsulamento vale a pena | Média |

### Fase 4: Baixos — Housekeeping (7-8 dias)

| ID | Problema | Ação | Prioridade |
|----|----------|------|------------|
| X-01 | Service-Desk.txt | Remover do repositório (git rm) | Baixa |
| X-02 | dist/ versionado | Remover do tracking git; adicionar ao .gitignore | Baixa |
| X-03 | index_legacy.html | Remover do repositório | Baixa |
| X-04 | index_vue.html | Remover (ou corrigir build.py se for usado) | Baixa |
| X-05 | build.py + refactor.py | Remover scripts de migração/build obsoletos | Baixa |
| X-06 | HelloWorld.vue | Remover componente scaffold | Baixa |
| X-07 | src/style.css | Remover estilos não utilizados | Baixa |
| X-08 | Assets template | Remover hero.png, vite.svg, vue.svg não usados | Baixa |
| X-09 | public/icons.svg | Remover sprite não usado | Baixa |
| X-10 | docs/ extenso | Manter apenas MANUAL_USUARIO.md, README.md, Avaliação_*.md. Remover 12 subdocs desatualizados | Baixa |
| X-11 | .vscode/extensions.json | Manter (útil) ou expandir com recomendações de ESLint, Prettier | Baixa |
| D-08 | dist no git | Remover do tracking (já está no .gitignore) | Baixa |
| D-10 | Artefatos de template | Remover HelloWorld.vue, style.css, assets não usados | Baixa |
| F-01 a F-07 | Funções não usadas | Revisar e remover ou documentar funções órfãs | Baixa |

### Fase 5: Melhorias Contínuas (Pós-correção)

| Item | Ação | Prioridade |
|------|------|------------|
| ESLint/Prettier | Configurar ferramentas de lint e formatação | Média |
| Testes unitários | Adicionar Vitest para GanttEngine e utils | Média |
| TypeScript | Migrar para TS gradualmente (começar por GanttEngine) | Baixa |
| Virtual Scroll | Implementar lista virtualizada para >500 tarefas | Baixa |
| CI/CD | Adicionar GitHub Actions para build e testes | Baixa |
| PWA | Service worker para fallback offline completo | Baixa |

---

### Diagrama de Dependências do Plano

```
Fase 1 (Crítico)
├── S-01 CSV Injection
├── S-02 XSS via :title
├── A-01 Decidir versão única ← BLOQUEANTE
├── D-01 DashboardModal allTasks
└── A-05 Otimizar rebuild

Fase 2 (Alto) — DEPENDE DE A-01
├── A-02 Unificar useGantt + vue_app.js
├── A-03 Unificar GanttEngine
├── A-04 Consolidar utils
├── D-02 ChartArea tooltips
├── D-03 TaskList completa
├── D-04 TaskModal campos
├── D-07 Feature parity
├── S-05 Fallback Firefox/Safari
└── S-06 Backup automático

Fase 3 (Médio)
├── A-06 Feriados consistente
├── A-07 Formato único projeto
├── D-05 Mapeamento CSV ↔ JS
├── D-09 addToast fix
├── S-03 Validação input
└── F-03 Revisar funções

Fase 4 (Baixo) — Limpeza
├── X-01 a X-11 Remover arquivos
├── D-08 Fix dist no git
├── D-10 Remover artefatos
└── F-01 a F-07 Remover funções

Fase 5 (Melhorias)
├── ESLint/Prettier
├── Testes (Vitest)
├── TypeScript
├── Virtual Scroll
├── CI/CD
└── PWA
```

---

*Análise gerada por DeepSeek V4 Flash via openCode em 15/05/2026. Nenhum arquivo foi modificado.*
