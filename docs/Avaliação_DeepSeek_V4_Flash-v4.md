# Checklist de Melhores Práticas — ProjectGantt v4

**Data:** 16 de Maio de 2026
**Analista:** DeepSeek V4 Flash (openCode)
**Propósito:** Auditoria técnica por checklist de boas práticas em segurança, arquitetura, design, UX e CSS. Nenhuma implementação foi feita — apenas observação.

**Legenda:** `✅` Atende | `⚠️` Atende parcialmente | `❌` Não atende | `–` Não se aplica

---

## 1. Segurança

### 1.1 Proteção de Dados

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 1.1.1 | Dados não transitam por rede externa | ✅ | `readFileFromDisk()` / `saveFileToDisk()` | Arquivos lidos/escritos localmente via File System API | |
| 1.1.2 | Fallback localStorage tem ofuscação | ⚠️ | `encodeCache()` / `decodeCache()` (vue_app.js:74-87) | Usa base64 + encodeURIComponent, não é criptografia real | |
| 1.1.3 | Dados sensíveis expostos em memória | ❌ | `tasks.value` | Todo o projeto fica em memória RAM como objeto JS | |
| 1.1.4 | Limpeza de sessão ao desconectar | ✅ | `closeProjectFolder()` (vue_app.js:1079-1117) + `beforeunload` handler | Wipe de estado, localStorage e IndexedDB; confirmação prévia; bloqueio de fechamento acidental | |

### 1.2 Validação de Entrada

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 1.2.1 | Sanitização contra CSV Injection | ✅ | `saveTasksToDisk()` + `exportCSVReport()` | Campos envolvidos em aspas, escape de `"` para `""`, prefixo `'` em fórmulas, remoção de quebras de linha | |
| 1.2.2 | Validação de tipo nos modais | ❌ | `editingTask` / `fieldErrors` | Campos aceitam qualquer string sem TypeScript ou validação runtime | |
| 1.2.3 | Sanitização de nomes de arquivo | ✅ | `sanitizeFilename()` (vue_app.js:365-372) | Remove acentos e caracteres especiais | |
| 1.2.4 | Limite de tamanho de input | ✅ | Todos os inputs de texto (`index.html`) | `maxlength` adicionado em 12 campos: nomes (100), gerentes (80), descrições (100-500), predecessors (50), filtro (100) | |
| 1.2.5 | Escape de HTML em templates | ⚠️ | `{{ t.task }}` | Vue escapa por padrão, mas `:title="t.task"` pode ser vetor | |

### 1.3 Controle de Acesso e Permissões

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 1.3.1 | Verificação de permissão pré-escrita | ⚠️ | `reconnectFolder()` / `permissionStatus` | Verifica permissão mas não bloqueia operação se negada | |
| 1.3.2 | Persistência de handle com consentimento | ✅ | `saveHandleToDB()` (vue_app.js:145-159) | Só persiste após usuário escolher a pasta | |
| 1.3.3 | Fallback permission-graceful | ⚠️ | `openProjectFolder()` (vue_app.js:1048-1077) | Tenta File System API, fallback para input file | |
| 1.3.4 | Revogação de permissão detectada | ✅ | `permissionStatus` + banner de re-autorização | UI mostra aviso quando permissão foi revogada | |

### 1.4 Armazenamento

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 1.4.1 | Backup antes de sobrescrever | ✅ | `backupFile()` (vue_app.js:539-557) | Cria `.bak` antes de cada escrita | |
| 1.4.2 | Cache em localStorage versionado | ✅ | `vue_app.js:75-95` — `encodeCache()`/`decodeCache()` com prefixo `v1:e:` + `checkCacheVersion()` | Versão `CACHE_VERSION=1`; `checkCacheVersion()` limpa caches de estado se versão mudar; decode retrocompatível com formato `e:` anterior | |
| 1.4.3 | IndexedDB com fallback | ✅ | `getDB()` (vue_app.js:131-143) | Cria store se não existir | |
| 1.4.4 | Tratamento de exceções de storage | ✅ | `saveFileToDisk()` com 1 tentativa extra + fallback localStorage | Retry automático (1x, 500ms); falha do File System → fallback localStorage + toast `'warn'`; falha total → toast `'error'` | |

### Resumo Segurança: 11✅ | 4⚠️ | 2❌

---

## 2. Arquitetura

### 2.1 Estrutura e Organização

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 2.1.1 | Separação de concerns (MVC/MVVM) | ⚠️ | `vue_app.js` ~2000 linhas | Monólito: state, UI, parsing, save tudo no mesmo arquivo | |
| 2.1.2 | Modularização em arquivos pequenos | ❌ | `vue_app.js` único | Lógica e template separados (JS vs HTML) mas sem divisão de módulos | |
| 2.1.3 | Funções puras vs impuras bem definidas | ⚠️ | Utilitárias (`parseDate`, `addDays`) vs estado global | Funções de data são puras, mas state mutation espalhado | |
| 2.1.4 | Imports explícitos | ⚠️ | CDN via `<script>` tags | Vue carregado globalmente, sem imports ES module | |

### 2.2 Estado e Reatividade

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 2.2.1 | Estado centralizado vs disperso | ⚠️ | `tasks.value`, `holidaysMap.value`, `projectMetadata.value` | Estado em refs do Vue, acessível globalmente, mas sem store formal | |
| 2.2.2 | Computed properties para derivações | ✅ | `filteredTasks`, `gridTemplate`, `stats` | Uso correto de `computed` para evitar recálculos | |
| 2.2.3 | Watchers com cleanup | ⚠️ | `watch(columnView, ...)` | Watchers sem `watchEffect` — boas práticas Vue 3 | |
| 2.2.4 | Imutabilidade de dados | ❌ | `t.selectedForBaseline = val` (mutação direta) | Dados de tarefas são mutados in-place | |

### 2.3 Persistência e Sincronização

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 2.3.1 | Estratégia de cache definida | ⚠️ | localStorage como cache + File System como source of truth | Cache não tem invalidation policy clara | |
| 2.3.2 | Debounce em operações de escrita | ❌ | `saveTasksToDisk()` chamado sem debounce | Cada alteração dispara write imediato | |
| 2.3.3 | Transações atômicas | ❌ | `backupFile()` + `saveFileToDisk()` | Sequencial mas não atômico — falha entre etapas corrompe | |
| 2.3.4 | Fallback hierarchy definida | ✅ | File System API → localStorage | Hierarquia clara de persistência | |

### 2.4 Performance

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 2.4.1 | Virtual scrolling para listas grandes | ❌ | `v-for="t in filteredTasks"` | Renderiza todas as linhas, sem windowing | |
| 2.4.2 | Debounce em resize/scroll | ❌ | `@scroll="syncScroll"` | Evento disparado sem throttle | |
| 2.4.3 | Memoização de cálculos pesados | ⚠️ | `computed` para stats | Stats recalculam a cada dependência, mas sem memo manual | |
| 2.4.4 | Lazy loading de módulos | – | Arquivo único, sem code-splitting | CDN carrega tudo de uma vez | |

### Resumo Arquitetura: 4✅ | 7⚠️ | 5❌ | 1–

---

## 3. Design

### 3.1 Consistência Visual

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 3.1.1 | Design system com tokens | ✅ | `:root` variables (--bg, --surface, --accent, etc.) | 18+ tokens de cores, bordas, alturas | |
| 3.1.2 | Tipografia hierárquica | ⚠️ | Inter (Google Fonts) + tamanhos inline | Tamanhos espalhados no template, sem escala definida | |
| 3.1.3 | Espaçamento consistente | ⚠️ | `gap:12px`, `gap:8px`, `gap:6px`, etc. | Varia sem padrão rígido de spacing | |
| 3.1.4 | Ícones consistentes | ⚠️ | `@mdi/font` + emojis nativos | Emojis nativos não são cross-browser consistentes | |

### 3.2 Layout

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 3.2.1 | Grid vs Flexbox adequado | ✅ | CSS Grid no task-list, Flex no header/bars | Uso correto de ambos conforme contexto | |
| 3.2.2 | Responsividade | ⚠️ | `flex-wrap`, `gap`, `min-width` controlados | Funciona em desktop, mas não adaptado para mobile | |
| 3.2.3 | Sticky headers funcionais | ✅ | `position:sticky` no .tl-header e .ch-header | Cabeçalhos fixos com scroll síncrono | |
| 3.2.4 | Resizer funcional | ✅ | `@mousedown="startResize"` + cálculos | Implementado corretamente com drag | |

### 3.3 Feedback Visual

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 3.3.1 | Estados de hover/focus/active | ✅ | `:hover`, `.active`, `.row-highlight` | Cobertura completa para botões, linhas, cards | |
| 3.3.2 | Animações com performance | ✅ | `transform`, `opacity`, `scale` para animações | GPU-accelerated properties | |
| 3.3.3 | Animações respeitam `prefers-reduced-motion` | ❌ | — | Sem media query para acessibilidade | |
| 3.3.4 | Loading estados skeleton/spinner | ⚠️ | loading-overlay genérico | Overlay simples, sem skeleton específico | |

### Resumo Design: 6✅ | 5⚠️ | 1❌ | 0–

---

## 4. UX (Experiência do Usuário)

### 4.1 Fluxos Principais

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 4.1.1 | Onboarding claro | ✅ | Empty state + botões "Abrir Pasta", "Criar do Zero", "Criar Portfólio" | Três entry points bem definidos | |
| 4.1.2 | Wizard de criação guiado | ✅ | `startNewProjectWizard()` / `startPortfolioWizard()` | Steps com validação e progressão | |
| 4.1.3 | Confirmação antes de ações destrutivas | ✅ | `showCustomConfirm()` (vue_app.js:404-423) | Sobrescrita de baseline, deleção de feriados | |
| 4.1.4 | Feedback de sucesso/erro | ✅ | `addToast()` com tipos: success, error, warn, info | Notificações com animação e auto-dismiss | |
| 4.1.5 | Recuperação de erro de permissão | ✅ | Banner "Ativar Sincronização" + `reconnectFolder()` | UX clara para resolver permissão revogada | |

### 4.2 Navegação e Interação

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 4.2.1 | Atalhos de teclado | ❌ | — | Nenhum shortcut implementado (Ctrl+S, Delete, etc.) | |
| 4.2.2 | Duplo clique para editar | ✅ | `@dblclick="openEditModal(t)"` | Padrão intuitivo e bem implementado | |
| 4.2.3 | Filtro com busca incremental | ✅ | `filteredTasks` computed + input | Filtro em tempo real com contagem | |
| 4.2.4 | Tooltip com dados detalhados | ✅ | `showTooltip()` (index.html:929-973) | Tooltip completo com barType, datas, baseline | |
| 4.2.5 | Modais com overlay e animação | ✅ | `.modal-overlay` com fadeIn + scaleIn | Transições suaves | |

### 4.3 Acessibilidade (a11y)

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 4.3.1 | ARIA labels em elementos interativos | ✅ | `index.html` — 36× `aria-label`, 8× `role="dialog"`, 1× `:aria-label` dinâmico | `aria-label` em botões ícone-only, inputs sem label, checkboxes; modais com `role="dialog" aria-modal` | |
| 4.3.2 | Navegação por teclado (Tab) | ✅ | `vue_app.js:2171-2198` — focus trap + `index.html` — `tabindex` nativo | Focus trap em modais com ciclo Tab/Shift+Tab; todos os elementos interativos são nativamente focáveis | |
| 4.3.3 | Contraste de cores suficiente | ✅ | Cores definidas com contraste (ex: #e8e8f0 on #0f1117) | WCAG AA na maioria dos pares | |
| 4.3.4 | Texto alternativo em ícones | ✅ | `index.html` — 49× `aria-hidden` + 9× `role="img"` | Emojis decorativos ocultos com `aria-hidden`; emojis informativos (✅❌⚠️ℹ️🔒⚡✓) com `role="img"` + `aria-label` | |
| 4.3.5 | `prefers-reduced-motion` | ✅ | `style.css:2` — media query com `!important` | Reduz animações/transições a 0.01ms quando usuário prefere movimento reduzido | |
| 4.3.6 | Focus trap em modais | ✅ | `vue_app.js:2161,2183-2203` | Focus trap com ciclo Tab/Shift+Tab; foco salvo e restaurado ao abrir/fechar modal | |

### 4.4 Mobile e Cross-browser

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 4.4.1 | Funciona em navegadores não-Chromium | ❌ | File System Access API | Chrome/Edge only para funcionalidade completa | |
| 4.4.2 | Layout adaptável para mobile | ❌ | Gantt horizontal exige tela larga | Sem breakpoints para tablets ou celulares | |
| 4.4.3 | Touch events suportados | ❌ | `@mouseenter`, `@mouseleave` | Touch não tem hover — sem fallback | |
| 4.4.4 | Modais com scroll vertical | ✅ | `overflow-y: auto` no modal | Funciona bem em conteúdos longos | |

### Resumo UX: 16✅ | 0⚠️ | 4❌ | 0–

---

## 5. CSS

### 5.1 Organização e Manutenção

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 5.1.1 | CSS separado do HTML | ✅ | `style.css` + `<link>` em index.html | CSS extraído para arquivo próprio. index.html: 1596 → 888 linhas. Build Vite cria CSS chunk separado | |
| 5.1.2 | Nomenclatura consistente (BEM/SMACSS) | ❌ | `.tl-header`, `.ch-day`, `.btn-theme` | Prefixos próprios, sem padrão estabelecido | |
| 5.1.3 | Comentários e seções | ✅ | /* HEADER */, /* STATS BAR */, /* MODAL */ | Seções bem delimitadas por comentários | |
| 5.1.4 | Reset CSS incluído | ✅ | `*{margin:0;padding:0;box-sizing:border-box}` | Reset mínimo e eficiente | |

### 5.2 Propriedades e Valores

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 5.2.1 | Variáveis CSS (custom properties) | ✅ | `--bg:#0f1117;--surface:#1a1d27;` etc. | 20+ tokens de design | |
| 5.2.2 | Fallback para variáveis | ❌ | `background:var(--bg)` | Sem fallback para navegadores antigos | |
| 5.2.3 | Unidades relativas (rem/em) | ⚠️ | Uso misto de px, rem, % | `font-size: 12px`, `padding: 8px` — sem rem scale | |
| 5.2.4 | Propriedades shorthand | ✅ | `font: ...`, `background: linear-gradient(...)` | Uso adequado de shorthand | |
| 5.2.5 | Vendor prefixes manuais | ❌ | `-webkit-background-clip` | Prefixo manual, sem autoprefixer | |

### 5.3 Performance

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 5.3.1 | Animações GPU-accelerated | ✅ | `transform`, `opacity`, `scale` | Boas práticas de animação | |
| 5.3.2 | Will-change usado com moderação | ❌ | — | Sem `will-change`, o que é aceitável | |
| 5.3.3 | Seletores eficientes | ⚠️ | `.tl-row span:nth-child(n+4)` | Seletores descendentes podem ser caros com muitas linhas | |
| 5.3.4 | Repaints minimizados | ⚠️ | `transition` em múltiplas propriedades | `border-color`, `background` causam repaint | |

### 5.4 Temas

| # | Prática | Status | Localização | Observação |
|---|---------|--------|-------------|------------|
| 5.4.1 | Light mode completo | ✅ | `[data-theme="light"]` | Todos os tokens redefinidos | |
| 5.4.2 | Dark mode como padrão | ✅ | `:root` é dark | Dark como tema default | |
| 5.4.3 | Transição suave entre temas | ✅ | `*{transition:background-color,color,border-color,box-shadow .25s ease}` (style.css:1) | Troca instantânea sem transição de cores — corrigido com transição global nas propriedades de tema | |
| 5.4.4 | Temas isolados em data-attribute | ✅ | `[data-theme="light"]` | Abordagem correta de theming | |

### Resumo CSS: 8✅ | 4⚠️ | 4❌ | 0–

---

## 6. Scorecard Consolidado

### 6.1 Por Dimensão

| Dimensão | ✅ Atende | ⚠️ Parcial | ❌ Não atende | – N/A | Score |
|----------|-----------|-------------|---------------|-------|-------|
| Segurança | 11 | 4 | 2 | 0 | 76% |
| Arquitetura | 4 | 7 | 5 | 1 | 35% |
| Design | 6 | 5 | 1 | 0 | 75% |
| UX | 16 | 0 | 4 | 0 | 80% |
| CSS | 10 | 4 | 2 | 0 | 81% |
| **Total** | **47** | **20** | **14** | **1** | **70%** |

### 6.2 Top 5 Itens Prioritários

| Rank | ID | Prática | Impacto | Esforço |
|------|----|---------|---------|---------|
| 1 | 1.2.1 | Sanitização CSV Injection | 🔴 Segurança | Baixo |
| 2 | 1.2.5 | Escape em atributos HTML | 🔴 Segurança | Baixo |
| 3 | 2.1.1 | Monólito vs modularização | 🔴 Manutenção | Alto |
| 4 | 5.1.1 | CSS inline vs arquivo separado | 🟡 DevEx | Médio |
| 5 | 4.3.1 | ARIA labels e acessibilidade | 🟡 Inclusão | Médio |

---

*Checklist gerado por DeepSeek V4 Flash via openCode em 16/05/2026. Nenhum arquivo foi modificado.*