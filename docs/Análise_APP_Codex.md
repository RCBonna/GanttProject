# Auditoria Completa e Profunda do ProjectGantt

Data da auditoria: 18/05/2026  
Escopo: análise estática do repositório local, execução de `npm test`, `npm run build`, `npm ls --depth=0` e `npm audit --json` com `NODE_OPTIONS=--use-system-ca`.  
Projeto analisado: `C:\Users\rcbon\OneDrive\Apps\ProjectGantt`

## 1. Resumo Executivo

O ProjectGantt é uma aplicação web local-first para planejamento, acompanhamento e baseline de projetos com gráfico de Gantt interativo. O produto resolve um problema real: permitir que um gerente de projeto mantenha cronogramas, baseline, progresso, feriados, portfólio e relatórios sem depender de servidor central ou banco remoto. A estratégia de privacidade local-first é coerente com o domínio e reduz bastante a superfície de ataque tradicional de SaaS.

O projeto, porém, ainda está em maturidade intermediária. A interface e as regras de negócio evoluíram bastante, mas a implementação principal está concentrada em um monólito frontend (`vue_app.js` com 2.537 linhas e `index.html` com 1.032 linhas). Há um início positivo de extração para `src/engine.js` e testes unitários, mas a aplicação em produção ainda carrega Vue, html2canvas e jsPDF por CDN e carrega `vue_app.js` como script clássico, fora do bundle do Vite. Isso limita tree shaking, versionamento real, testes de integração e hardening de supply chain.

O risco mais urgente é de segurança de dependências: `npm audit` acusa vulnerabilidade crítica direta em `jspdf@2.5.2`, incluindo avisos de path traversal/LFI, PDF injection, HTML injection e DoS. Como o app usa `jsPDF` diretamente em `vue_app.js:1966-2094`, a exposição existe na funcionalidade de exportação PDF. O segundo risco importante é a falsa sensação de criptografia: existe AES-GCM, mas a senha usada para descriptografar é armazenada no próprio `localStorage` (`vue_app.js:166-177`), o que protege pouco contra XSS, extensão maliciosa ou acesso ao mesmo perfil de navegador.

Veredito: é um bom protótipo/produto local-first em nível Pleno, com bons sinais de evolução para Sênior, mas ainda não é enterprise-grade. A aplicação é útil e tem base funcional, porém precisa modularizar frontend, corrigir dependências vulneráveis, fechar gaps de segurança, padronizar build/deploy e ampliar testes antes de ser tratada como SaaS corporativo escalável.

## 2. Evidências Técnicas Coletadas

| Item | Resultado |
|---|---|
| Linguagem principal | JavaScript, HTML, CSS |
| Framework principal | Vue 3 |
| Build tool | Vite 8.0.10 |
| UI stack declarada | Vue, CSS custom, dependências Vuetify/@mdi não usadas diretamente no HTML analisado |
| Persistência | File System Access API, IndexedDB para handle, localStorage como fallback/cache |
| Backend | Apenas servidor estático Node em `server.js`; não há API backend de negócio |
| Banco de dados | Não há banco tradicional; IndexedDB/localStorage/navegador e arquivos CSV/JSON |
| Testes | `node:test` para `src/engine.js` |
| Resultado dos testes | 51 testes passaram |
| Resultado do build | Build passou, mas `vue_app.js` não foi bundlado |
| Vulnerabilidades npm | 1 crítica direta em `jspdf`, 1 moderada transitiva em `dompurify` |
| CI/CD | Não encontrado |
| Docker/Kubernetes | Não encontrado |
| Arquivos centrais | `index.html`, `vue_app.js`, `style.css`, `src/engine.js`, `server.js` |

Comandos executados:

```bash
npm test
npm run build
npm ls --depth=0
$env:NODE_OPTIONS='--use-system-ca'; npm audit --json
```

Resultado de qualidade automatizada:

| Verificação | Status | Observação |
|---|---:|---|
| Testes unitários | Aprovado | 51/51 passando |
| Build Vite | Aprovado com alerta | `vue_app.js` não é bundlado sem `type="module"` |
| Auditoria npm | Reprovado | `jspdf@2.5.2` crítico, `dompurify@2.5.9` moderado transitivo |
| Busca por `innerHTML`, `v-html`, `eval`, `new Function` | Bom | Não há uso direto detectado |
| Busca por secrets óbvios | Parcialmente bom | Não foram encontrados tokens reais, mas há senha/cache em localStorage |

## 3. Visão Geral do Projeto

### Objetivo do sistema

O sistema tem como objetivo gerenciar projetos e portfólios localmente, com:

- criação de projetos e portfólios;
- abertura de pasta local;
- importação/exportação de arquivos CSV/JSON;
- cronograma Gantt;
- cálculo de datas planejadas e forecast;
- linha de base;
- feriados;
- indicadores como progresso, SPI, desvio médio, tarefas atrasadas e forecast;
- exportação PNG, PDF e CSV.

### Tipo de aplicação

É uma SPA local-first, orientada a navegador desktop, com forte dependência da File System Access API. Em navegadores que não suportam essa API, há fallback para localStorage e importação manual.

### Arquitetura utilizada

Arquitetura real observada:

- frontend SPA em Vue 3 global;
- template HTML grande em `index.html`;
- lógica principal em Composition API dentro de `vue_app.js`;
- CSS global em `style.css`;
- engine extraído em `src/engine.js` para testes;
- servidor Node estático opcional em `server.js`;
- armazenamento em arquivos CSV/JSON, IndexedDB e localStorage.

Arquitetura desejada/documentada:

- local-first;
- camada de persistência no navegador;
- engine de cronograma;
- UI Gantt.

Gap: a arquitetura desejada já aparece em documentação e parcialmente em `src/engine.js`, mas a implementação runtime ainda mantém duplicação da engine dentro de `vue_app.js`.

### Stack tecnológica

| Tecnologia | Uso atual | Avaliação |
|---|---|---|
| Vue 3 | Reatividade e UI | Boa escolha, mas uso global por CDN reduz maturidade de build |
| Vite | Build/dev server | Boa escolha, subutilizada |
| Node HTTP | Servidor local estático | Simples e adequado para uso local, limitado para produção |
| File System Access API | Persistência local | Excelente para Chromium/local-first, frágil para Safari/Firefox |
| IndexedDB | Persistência de directory handle | Boa abordagem |
| localStorage | Cache/fallback | Conveniente, mas limitado e sensível |
| html2canvas | Exportação PNG | Adequado, pode ser pesado |
| jsPDF | Exportação PDF | Funcional, mas versão atual é risco crítico |
| PapaParse | Dependência declarada | Não observada no parser runtime principal, oportunidade de substituir parser manual |
| Vuetify/@mdi | Dependências declaradas | Não parecem integradas no app atual, possível peso/ruído |

### Organização do código

Estrutura observada:

```text
ProjectGantt/
  index.html
  vue_app.js
  style.css
  server.js
  src/
    engine.js
  tests/
    engine.test.js
  docs/
    architecture/
    backend/
    database/
    deploy/
    security/
    testing/
    ...
```

Ponto forte: existe documentação técnica ampla em `docs/`.  
Ponto fraco: a implementação ainda não acompanha a mesma separação arquitetural da documentação.

### Nível de maturidade

Maturidade geral: Pleno.

Justificativa:

- acima de protótipo simples, pois tem persistência, baseline, forecast, exportações, testes e docs;
- abaixo de Sênior/enterprise, pois há monólito frontend, dependência vulnerável crítica, build incompleto, ausência de CI/CD, ausência de E2E e arquitetura ainda pouco modular.

## 4. Pontos Fortes

| Área | Ponto forte | Evidência |
|---|---|---|
| Produto | Resolve fluxo real de Gantt local-first | README e UI em `index.html` |
| Privacidade | Não exige backend central para dados do usuário | File System Access API/localStorage |
| XSS básico | Não usa `v-html`, `innerHTML`, `eval` ou `Function` | Busca estática |
| CSP/SRI | Há CSP meta e SRI em scripts CDN | `index.html:6`, `index.html:10-12` |
| Testabilidade emergente | Engine extraída e testada | `src/engine.js`, `tests/engine.test.js` |
| Proteção CSV | Mitigação de CSV injection em exportação | `src/engine.js:51-61`, `vue_app.js:792-795` |
| Persistência resiliente | Backup antes de sobrescrever | `vue_app.js:730-755` |
| UX | Modais, toasts, atalhos, filtros, baseline e visual Gantt | `index.html`, `style.css`, `vue_app.js` |
| Acessibilidade parcial | Vários `aria-label`, focus trap e reduced motion | `index.html`, `vue_app.js:2402-2428`, `style.css:2` |

## 5. Pontos Fracos

| Área | Ponto fraco | Impacto |
|---|---|---|
| Arquitetura | `vue_app.js` concentra quase toda a aplicação | Baixa manutenibilidade, alto risco de regressão |
| Build | App principal não é bundlado pelo Vite | Sem tree shaking real, sem pipeline moderno completo |
| Segurança | `jspdf@2.5.2` vulnerável crítico | Risco alto em exportação PDF |
| Segurança | Criptografia armazena senha no próprio localStorage | Proteção fraca contra ameaças reais |
| UX/Frontend | Muito CSS inline e HTML massivo | Dificulta consistência, responsividade e manutenção |
| CSV | Parser manual limitado | Quebra com aspas escapadas, multiline e arquivos grandes |
| Testes | Só engine tem cobertura automatizada | UI, persistência, exportação e fluxos críticos sem regressão |
| DevOps | Sem CI/CD, Docker, deploy formal, rollback | Baixa prontidão enterprise |
| Performance | Renderização Gantt O(tarefas x dias) no DOM | Pode degradar em projetos longos/grandes |
| SEO | SPA local sem SSR/sitemap/metadata rica | Aceitável para ferramenta local, fraco para produto web público |

## 6. Análise de Arquitetura

### Arquitetura Frontend

O frontend é baseado em Vue 3 Composition API, mas usa o build global via CDN:

```html
<script src="https://unpkg.com/vue@3.5.32/dist/vue.global.prod.js" ...></script>
<script src="./vue_app.js"></script>
```

Evidência: `index.html:10-12` e `index.html:1030`.

Esse padrão funciona, mas entra em conflito com a presença de Vite e `@vitejs/plugin-vue`. O build avisou:

```text
<script src="./vue_app.js"> in "/index.html" can't be bundled without type="module" attribute
```

Impactos:

- Vite não empacota a lógica principal;
- dependências ficam duplicadas entre `package.json` e CDN;
- SRI ajuda, mas não substitui supply chain controlada via lockfile;
- menos oportunidades de code splitting e tree shaking;
- testes de componentes ficam difíceis.

### Arquitetura Backend

Não há backend de negócio. `server.js` é servidor estático local:

```js
const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(ROOT))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
```

Evidência: `server.js:25-35`.

Avaliação:

- adequado para localhost;
- não oferece autenticação, API, rate limit, compressão ou observabilidade;
- proteção de path traversal existe, mas deve ser reforçada com `decodeURIComponent`, remoção de querystring e `path.relative`;
- headers são mínimos.

### Separação de responsabilidades

Separação atual:

- `index.html`: template e estrutura visual;
- `style.css`: estilo global;
- `vue_app.js`: estado, domínio, persistência, UI behavior, exportações, validação, keyboard, toasts, wizards;
- `src/engine.js`: parte da lógica pura;
- `server.js`: servir arquivos.

Problema principal: `vue_app.js` mistura muitas responsabilidades.

Exemplos de responsabilidades no mesmo arquivo:

- criptografia/cache: `vue_app.js:120-228`;
- parser CSV: `vue_app.js:630-662`;
- persistência: `vue_app.js:664-810`;
- engine de cronograma duplicada: `vue_app.js:1085-1171`;
- exportação PDF/CSV/PNG: `vue_app.js:1952-2135`;
- teclado e acessibilidade: `vue_app.js:2388-2468`.

### Modularização

Há um passo correto com `src/engine.js`, mas ele não é consumido pelo app principal. A mesma lógica de datas, CSV e cronograma aparece duplicada em `vue_app.js` e `src/engine.js`.

Exemplo bom:

```js
export function calculateSchedule(taskList, startDateStr, holidaysSet = {}) {
  const map = {};
  const projStart = parseDate(startDateStr) || new Date();
  const isWorkingDay = createWorkingDayChecker(holidaysSet);
  const addWorkingDays = createAddWorkingDays(holidaysSet);
```

Evidência: `src/engine.js:116-120`.

Exemplo problemático:

```js
const calculateSchedule = (taskList, startDateStr) => {
  const map = {};
  const projStart = parseDate(startDateStr) || new Date();
```

Evidência: `vue_app.js:1085-1088`.

Risco: testes passam na engine extraída, mas o runtime pode divergir se `vue_app.js` for alterado sem sincronizar `src/engine.js`.

### Acoplamento e coesão

Acoplamento alto:

- UI depende diretamente de formato CSV e localStorage;
- exportação PDF lê estado global;
- persistência chama `loadProject`, `addToast`, `projectMetadata` e `tasks`;
- teclado dispara ações de domínio diretamente.

Coesão parcial:

- `src/engine.js` é coeso;
- `server.js` é coeso;
- `vue_app.js` é um "God module".

### SOLID e Clean Architecture

| Princípio | Avaliação |
|---|---|
| SRP | Fraco no `vue_app.js`, bom no `src/engine.js` |
| OCP | Baixo: novas exportações/persistências exigem mexer em arquivo central |
| LSP | Não aplicável diretamente |
| ISP | Não há interfaces formais |
| DIP | Fraco: UI depende de implementações concretas de localStorage/File System |

Clean Architecture não está implementada. Existe domínio puro emergente, mas faltam camadas claras:

- `domain/scheduling`;
- `infra/filesystem`;
- `infra/cache`;
- `ui/components`;
- `application/use-cases`;
- `exporters/pdf/csv/png`.

### DDD

O domínio possui entidades/conceitos claros:

- Projeto;
- Portfólio;
- Tarefa;
- Baseline;
- Forecast;
- Feriado;
- Dependência;
- Relatório.

Mas esses conceitos ainda não estão modelados como módulos ou tipos. Estão representados como objetos soltos e propriedades dinâmicas.

### MVC/MVVM

O app se aproxima de MVVM pelo uso de Vue:

- View: `index.html`;
- ViewModel: `setup()` em `vue_app.js`;
- Model: objetos `tasks`, `projectMetadata`, `holidaysMap`.

Problema: ViewModel também executa infraestrutura, parser, exportação e domínio.

### API design e versionamento

Não há API REST/GraphQL. O contrato principal são arquivos locais:

- CSV de tarefas;
- JSON de portfólio;
- JSON de feriados;
- localStorage keys.

Há documentação em `docs/api/file_formats.md`, o que é positivo. Porém falta versionamento formal do schema de arquivos e migration strategy robusta. `CACHE_VERSION = 1` existe (`vue_app.js:105-116`), mas cobre cache local e não schemas de projeto.

### Gargalos arquiteturais

| Gargalo | Severidade | Recomendação |
|---|---:|---|
| Monólito `vue_app.js` | Alta | Dividir em módulos e componentes Vue SFC |
| Duplicação `src/engine.js` vs `vue_app.js` | Alta | App deve importar a engine testada |
| Build Vite incompleto | Alta | Migrar `vue_app.js` para módulo e dependências npm |
| Persistência acoplada à UI | Média | Criar repositórios/adapters |
| CSV manual | Média | Usar PapaParse, já declarado |
| Estado global único | Média | Criar store composable ou Pinia |
| DOM Gantt sem virtualização | Média | Virtualizar linhas/colunas para grandes projetos |

## 7. Segurança Cybersecurity

### Matriz de vulnerabilidades

| ID | Severidade | Vulnerabilidade | Evidência | Impacto | Probabilidade | Recomendação |
|---|---|---|---|---|---|---|
| S-01 | CRÍTICA | `jspdf@2.5.2` vulnerável | `npm audit`; `package-lock.json:749-755`; uso em `vue_app.js:1966-2094` | PDF injection, DoS, HTML injection, LFI/path traversal conforme advisories npm | Média | Atualizar `jspdf` para versão corrigida, testar exportação, considerar isolamento da geração |
| S-02 | ALTA | Criptografia local armazena senha no localStorage | `vue_app.js:166-177` | Qualquer script/extensão na origem consegue obter senha e dados | Alta | Não persistir senha; pedir passphrase em runtime ou usar WebAuthn/credential storage seguro |
| S-03 | ALTA | CSP permite `unsafe-eval` e `unsafe-inline` | `index.html:6` | Reduz defesa contra XSS; inline styles/event handlers e eval ficam permitidos | Média | Migrar para bundle local sem eval, remover inline styles, usar nonce/hash |
| S-04 | ALTA | Supply chain via CDN para Vue/html2canvas/jsPDF | `index.html:10-12` | Dependência externa em runtime; indisponibilidade ou troca de origem afeta app | Média | Bundlar dependências via npm/lockfile; manter SRI só se CDN for inevitável |
| S-05 | MÉDIA | Servidor estático com normalização frágil de URL | `server.js:27-31` | Querystring quebra resolução; prefix check com `startsWith` é padrão frágil | Baixa | Usar `new URL`, decode, `path.relative` e negar `..` |
| S-06 | MÉDIA | Parser CSV manual | `vue_app.js:630-662` | Pode interpretar arquivo malformado incorretamente; risco de corrupção/injeção de dados | Média | Usar PapaParse com opções robustas e limites de tamanho |
| S-07 | MÉDIA | localStorage como fallback de dados completos | `vue_app.js:721-780`, `808`, `862`, `907` | Exposição a extensões, scripts na origem, limite de quota, persistência indefinida | Média | IndexedDB criptografado, limpeza explícita, TTL e export seguro |
| S-08 | MÉDIA | Logs de diagnóstico com nomes/tamanhos de arquivos | `vue_app.js:667-679`, `953-983`, `1030-1032` | Vazamento local de metadados em console e suporte remoto | Média | Remover logs em produção ou usar logger com nível |
| S-09 | MÉDIA | Ausência de headers modernos no servidor local | `server.js:61-65` | Falta COOP/COEP/Referrer-Policy/Permissions-Policy/CSP header | Baixa | Adicionar cabeçalhos e mover CSP para header |
| S-10 | BAIXA | Sem autenticação/RBAC | Arquitetura local-first sem usuários | Aceitável localmente; inviável para SaaS multiusuário | Baixa | Se virar SaaS, desenhar auth, RBAC, tenant isolation |
| S-11 | BAIXA | Sem rate limiting | Sem backend de API | Pouco relevante localmente | Baixa | Necessário apenas em backend futuro |
| S-12 | BAIXA | Clickjacking mitigado parcialmente | `server.js:64`, mas meta HTML não define frame-ancestors | Localhost protegido pelo header; hospedagem estática precisa CSP header | Baixa | Usar `frame-ancestors 'none'` em CSP real |

### OWASP Top 10

| Categoria | Status | Análise |
|---|---|---|
| A01 Broken Access Control | Não aplicável no modo local; risco futuro | Sem usuários/roles. Se SaaS, precisa RBAC e isolamento por tenant |
| A02 Cryptographic Failures | Parcialmente presente | AES-GCM correto, mas senha em localStorage elimina parte da proteção |
| A03 Injection | Parcialmente mitigado | Vue escaping protege HTML; CSV injection mitigada; parser manual ainda é risco de dados |
| A04 Insecure Design | Parcial | Local-first é bom, mas build/CDN/cache/criptografia precisam threat model formal |
| A05 Security Misconfiguration | Presente | CSP com `unsafe-*`, headers incompletos, sem pipeline de hardening |
| A06 Vulnerable Components | Presente crítico | `jspdf@2.5.2` crítico |
| A07 Identification/Auth Failures | Não aplicável local; risco futuro | Sem autenticação |
| A08 Software/Data Integrity Failures | Presente | CDN em runtime, dependências vulneráveis, sem CI audit gate |
| A09 Logging/Monitoring Failures | Presente | Sem observabilidade real; logs locais soltos |
| A10 SSRF | Não aplicável | Sem backend/fetch remoto relevante |

### XSS

Pontos positivos:

- não foram encontrados `v-html`, `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval` ou `new Function`;
- Vue faz escaping por padrão em `{{ t.task }}` e similares;
- há CSP, ainda que permissiva.

Riscos remanescentes:

- CSP com `unsafe-eval` e `unsafe-inline` reduz defesa em profundidade;
- scripts CDN aumentam risco de supply chain;
- se futuras features introduzirem HTML em descrições, o projeto já carrega `dompurify` transitivo vulnerável via jsPDF.

### CSRF

Não aplicável no estado atual, pois não há sessão ou backend com cookies. Se a aplicação evoluir para SaaS, CSRF volta a ser relevante para endpoints mutáveis autenticados.

### SQL Injection / NoSQL Injection

Não aplicável. Não há SQL/NoSQL backend.

### Command Injection / RCE

Não foi encontrado uso de shell no app web. O servidor Node apenas lê arquivos estáticos. RCE não aparece como vetor direto no código atual.

### SSRF

Não aplicável. Não há fetch de URLs arbitrárias no backend.

### Clickjacking

Mitigado no servidor local por:

```js
'X-Frame-Options': 'DENY',
```

Evidência: `server.js:64`.

Mas a proteção não existe necessariamente se o app for publicado em hospedagem estática sem esse header. A CSP meta também não inclui `frame-ancestors`, e `frame-ancestors` não é suportado via meta em todos os cenários como política efetiva de navegação. Recomenda-se definir CSP em header no servidor/CDN.

### CORS

Não há backend com CORS. Sem risco atual.

### Secrets e chaves hardcoded

Não foram encontrados tokens reais. Porém:

```js
function enableEncryption(password) {
  localStorage.setItem(CACHE_ENCRYPTION_KEY, 'true');
  localStorage.setItem(CACHE_ENCRYPTION_SALT, password);
}
```

Evidência: `vue_app.js:166-169`.

O nome `CACHE_ENCRYPTION_SALT` é enganoso: o valor armazenado é a senha, não só um salt. Isso é vulnerabilidade de desenho.

### JWT/OAuth/Sessão

Não aplicável. Não há autenticação.

### Controle de acesso/RBAC

Não aplicável no app local. Para uso corporativo compartilhado, é um grande gap.

### Rate limiting

Não aplicável sem API. Para produção SaaS, ausente.

### Headers HTTP

Headers existentes:

```js
'X-Content-Type-Options': 'nosniff',
'X-Frame-Options': 'DENY',
```

Evidência: `server.js:61-65`.

Headers recomendados:

- `Content-Security-Policy` via header;
- `Referrer-Policy: no-referrer`;
- `Permissions-Policy` restringindo APIs;
- `Cross-Origin-Opener-Policy`;
- `Cross-Origin-Resource-Policy`;
- `Cache-Control` apropriado para assets;
- `Strict-Transport-Security` apenas se HTTPS.

### Cookies

Não há cookies de sessão. Bom para superfície atual.

### Uploads/importação de arquivos

Há importação via input:

```js
input.accept = '.csv,.json';
input.multiple = true;
input.webkitdirectory = true;
```

Evidência: `vue_app.js:691-695`.

Riscos:

- sem limite de tamanho;
- sem validação profunda de schema;
- parser CSV manual;
- JSON potencialmente grande pode travar UI;
- erro de importação pode contaminar localStorage/cache.

Recomendação: validar tamanho, extensão, MIME quando possível, schema e número máximo de tarefas/dias.

## 8. Qualidade do Código

### Legibilidade

O código é compreensível, mas o volume concentrado prejudica leitura. `vue_app.js` tem 2.537 linhas, com múltiplos contextos em sequência. Há bons comentários seccionando áreas, mas comentários não substituem módulos.

### Clareza e simplicidade

Pontos bons:

- helpers de data são simples;
- engine extraída é legível;
- testes são claros;
- `safeColor` limita cores a hex seguro.

Exemplo bom:

```js
export function safeColor(val, fallback = SAFE_FALLBACK_COLOR) {
  return isValidColor(val) ? val : fallback;
}
```

Evidência: `src/engine.js:106-111`.

Pontos fracos:

- muitas responsabilidades no `setup()`;
- funções longas de criação de projeto/portfólio/exportação;
- estilos inline em `index.html`;
- duplicação entre `src/engine.js` e `vue_app.js`.

### Complexidade ciclomática

Maior risco:

- `calculateSchedule` recursivo com ramificações de predecessor, realStart/realEnd, tipo FS/SS, ciclo, feriados;
- wizards de projeto/portfólio;
- `loadProject` e `saveFileToDisk`;
- `handleGlobalKeydown`.

Exemplo de função com complexidade relevante:

```js
if (t.type === 'SS') {
  const refStart = predRealStart || new Date(pred.start);
  if (predRealStart) usedForecast = true;
  if (refStart > maxStart) maxStart = refStart;
} else {
  let refEnd;
  if (predRealEnd) {
    refEnd = addWorkingDays(predRealEnd, 1);
```

Evidência: `vue_app.js:1137-1147`.

### Duplicação

Duplicação crítica:

- `parseDate`, `getLocalISOString`, `sanitizeCSV`, `safeColor`, `calculateSchedule` aparecem em `src/engine.js` e `vue_app.js`.

Impacto: os testes exercitam `src/engine.js`, mas a UI usa implementação própria duplicada.

### Tratamento de erros

Há vários `try/catch` e toasts, o que é positivo. Mas há `catch {}` silencioso:

- `vue_app.js:686`;
- `vue_app.js:704`;
- `vue_app.js:1453`;
- `vue_app.js:1509`.

Risco: erros reais ficam invisíveis e dificultam suporte.

### Logs

Há logs de debug em produção:

```js
console.log('[readFileFromDisk] filename:', filename, 'sanitized:', safe);
console.log('[loadProject] directoryHandle:', !!directoryHandle.value, 'hasLocalStorageFiles:', hasLocalStorageFiles());
```

Evidências: `vue_app.js:667`, `vue_app.js:953`.

Recomendação: criar logger com nível e remover debug no build final.

### Tipagem

Não há TypeScript. Para domínio de cronograma, datas e arquivos, TypeScript reduziria bugs. Recomendado migrar pelo menos `src/engine.js` para TS primeiro.

### Code smells

| Smell | Evidência | Risco |
|---|---|---|
| God module | `vue_app.js` com 2.537 linhas | Regressão e baixa manutenibilidade |
| Duplicated logic | `src/engine.js` e `vue_app.js` | Testes não protegem runtime |
| Primitive obsession | tarefas como objetos soltos | Invariantes frágeis |
| Silent catch | `catch {}` | Erros ocultos |
| Inline styles | centenas em `index.html` | Design inconsistente |
| Manual parser | `parseCSV` próprio | Bugs de formato |
| Hidden global deps | `Vue`, `html2canvas`, `window.jspdf` | Build e testes frágeis |

## 9. Frontend, UX e UI

### UX geral

O app tem boa ambição de produto:

- dashboard de KPIs;
- Gantt com tabela e timeline;
- zoom dia/semana/mês;
- baseline/real toggles;
- filtros;
- modais de edição;
- wizard de projeto e portfólio;
- toasts;
- export center;
- atalhos de teclado.

Isso é forte para uma aplicação de produtividade.

### UI e design system

Pontos fortes:

- tokens CSS em `:root`;
- tema claro/escuro;
- `prefers-reduced-motion`;
- densidade adequada para ferramenta operacional;
- cards/KPIs úteis;
- estados visuais de atraso/forecast/baseline.

Evidência:

```css
:root{
  --bg:#0f1117;--surface:#1a1d27;--surface2:#242836;--surface3:#2e3345;
  --accent:#6c5ce7;--accent2:#a29bfe;--accent3:#fd79a8;
```

Evidência: `style.css:3-8`.

Pontos fracos:

- muito estilo inline em `index.html`;
- uso de emojis como ícones pode ser inconsistente entre sistemas;
- paleta muito concentrada em roxo/azul/ciano;
- componentes não isolados;
- classes globais podem conflitar;
- responsividade mobile é limitada para uma grade Gantt grande.

### Responsividade

Há `flex-wrap`, overflow e layouts com scroll. Porém um Gantt é naturalmente difícil em mobile. A implementação atual parece desktop-first.

Riscos:

- tabela sticky e timeline podem ficar difíceis em telas pequenas;
- botões e KPIs podem comprimir;
- modais longos podem exigir scroll excessivo;
- textos de botões podem quebrar.

Recomendação:

- criar modo mobile dedicado: lista de tarefas + detalhes + mini timeline;
- manter Gantt completo para tablet/desktop;
- testar viewports 360px, 768px, 1366px e 1920px com Playwright.

### Acessibilidade WCAG

Pontos bons:

- vários `aria-label`;
- `role="dialog"` e `aria-modal="true"`;
- focus trap manual;
- `prefers-reduced-motion`;
- labels/placeholder em vários campos.

Pontos problemáticos:

- muitos botões usam emoji sem componente iconográfico consistente;
- alguns elementos clicáveis são `div`, como `portfolio-trigger`;
- `outline: none` aparece em inputs sem sempre garantir foco alternativo;
- cores de texto secundário podem ter contraste insuficiente em alguns estados;
- foco inicial em modais não é claramente gerenciado;
- atalhos de teclado não são expostos em UI ou help;
- Gantt visual não tem alternativa textual completa para leitores de tela.

Exemplo de focus trap positivo:

```js
if (e.key === 'Tab' && anyModalOpen.value) {
  const overlays = document.querySelectorAll('.modal-overlay');
  ...
  const focusable = modal.querySelectorAll('button:not([disabled]), input:not([disabled])...');
```

Evidência: `vue_app.js:2402-2409`.

### Estados de loading, vazio e erro

Pontos positivos:

- `empty-state`;
- toasts;
- loading overlay no CSS;
- mensagens de erro em persistência.

Riscos:

- erros de parse/importação podem ser silenciosos;
- `saving` existe, mas nem todos os fluxos mostram estado de loading claro;
- exportação PNG/PDF pode travar sem progress feedback em projetos grandes.

### Melhorias UX enterprise-grade

1. Criar design system real com componentes: Button, Modal, Field, Toast, Toolbar, KPI, GanttRow.
2. Substituir emojis por ícones consistentes via MDI/lucide.
3. Criar modo compacto/denso configurável.
4. Adicionar painel de validação do cronograma: ciclos, predecessoras inexistentes, datas inválidas.
5. Adicionar undo/redo para alterações de tarefas.
6. Mostrar status de salvamento sincronizado: salvo, salvando, falhou, fallback local.
7. Adicionar help modal com atalhos.
8. Melhorar onboarding para File System Access API e fallback.
9. Criar visualização mobile alternativa.
10. Criar auditoria de acessibilidade automatizada com axe.

## 10. Performance

### Frontend

O principal gargalo é a renderização do Gantt:

```html
<div v-for="(t, i) in filteredTasks" ...>
  <div v-for="c in chartColumns" ...></div>
```

Evidência: `index.html:224-225`.

Complexidade: O(n tarefas x m colunas/dias).  
Exemplo: 500 tarefas x 365 dias = 182.500 células DOM, antes de barras, textos e SVGs. Isso pode travar o navegador.

Outros gargalos:

- `chartColumns.length * colWidth` para SVG;
- `html2canvas` em todo `ganttWrapper`;
- `jsPDF` gera PDF síncrono;
- parser CSV manual carrega arquivo todo na memória;
- localStorage bloqueia main thread;
- `buildTimeline` e computed podem recalcular muito se estado mudar.

### Backend

Sem backend de negócio. `server.js` é simples, sem compressão ou cache headers. Para localhost está ok. Para produção não é suficiente.

### Bundle size e tree shaking

O build gerou:

```text
dist/index.html                 75.57 kB | gzip: 14.70 kB
dist/assets/index-C5iJZrkk.css  22.81 kB | gzip:  4.98 kB
```

Mas isso é enganoso porque o principal `vue_app.js` não foi bundlado. O build não mede nem otimiza a maior parte da aplicação.

### Caching

Há cache local via localStorage/IndexedDB, mas não há estratégia formal para assets. O servidor não define `Cache-Control`.

### Web Vitals

Riscos prováveis:

- FCP pode ser bom em projetos pequenos;
- INP pode degradar com muitos dias/tarefas;
- CLS provavelmente baixo, mas scroll/sticky pode causar comportamentos estranhos;
- LCP não é prioridade porque é app operacional, mas CDN de fontes/scripts pode atrasar carregamento.

### Otimizações prioritárias

| Prioridade | Otimização | Impacto |
|---|---|---|
| P0 | Bundlar app com Vite | Base para performance e segurança |
| P1 | Virtualizar linhas e colunas do Gantt | Alto em projetos grandes |
| P1 | Usar Web Worker para parse/export/cálculo pesado | Reduz travamento de UI |
| P1 | Substituir localStorage pesado por IndexedDB | Evita bloqueio e quota pequena |
| P2 | Lazy-load exportadores PNG/PDF | Reduz custo inicial |
| P2 | Debounce em filtros e recálculos | Melhora INP |
| P2 | Cache de calendário/dias úteis | Melhora cálculo |

## 11. Dependências e Tecnologias

Dependências diretas:

| Pacote | Versão instalada | Uso | Avaliação |
|---|---:|---|---|
| `vue` | 3.5.33 instalada, 3.5.32 CDN | UI | Boa, mas duplicada entre npm/CDN |
| `vite` | 8.0.10 | Build | Boa, subutilizada |
| `@vitejs/plugin-vue` | 6.0.6 | Build Vue | Não aproveitado enquanto app usa Vue global |
| `vite-plugin-vuetify` | 2.1.3 | Vuetify | Parece desnecessário hoje |
| `vuetify` | 4.0.6 | UI framework | Não observado no HTML runtime |
| `@mdi/font` | 7.4.47 | Ícones | Não claramente usado |
| `html2canvas` | 1.4.1 | Export PNG | Útil, pesado |
| `jspdf` | 2.5.2 | Export PDF | Vulnerável crítico |
| `papaparse` | 5.5.3 | CSV | Declarado, mas parser manual é usado |

### Vulnerabilidades de dependência

`npm audit` reportou:

| Pacote | Severidade | Tipo | Fix |
|---|---|---|---|
| `jspdf@2.5.2` | Critical | Direta | `jspdf@4.2.1`, semver major |
| `dompurify@2.5.9` | Moderate | Transitiva via `jspdf` | Atualizar `jspdf` |

Observação: o HTML carrega `jspdf` por CDN em `2.5.1`, enquanto `package.json` declara `^2.5.2`. Isso cria divergência: auditoria npm pega a dependência local, mas runtime usa CDN com versão diferente e também antiga.

### Stack faz sentido?

Sim, para local-first desktop:

- Vue é adequado;
- Vite é adequado;
- File System Access API é coerente com o produto;
- CSV/JSON é simples para interoperabilidade;
- html2canvas/jsPDF resolvem exportação.

Mas para enterprise-grade:

- usar CDN em runtime não é ideal;
- falta TypeScript;
- falta arquitetura modular;
- falta CI/CD;
- falta testes E2E;
- falta estratégia de migração de schema;
- falta observabilidade.

## 12. DevOps e Infraestrutura

### Docker

Não encontrado.

Impacto: baixo para app local, médio se for distribuído corporativamente.

### CI/CD

Não encontrado `.github`, YAML de pipeline ou workflow equivalente.

Riscos:

- dependências vulneráveis podem entrar sem bloqueio;
- build/test pode quebrar sem aviso;
- sem gates de qualidade;
- sem geração automática de release.

### Deploy

Há `vite build` e `server.js`. A documentação contém guia de deployment, mas infraestrutura automatizada não foi encontrada.

### Logs e observabilidade

Não há observabilidade. Logs são `console.log` locais. Para ferramenta local isso é aceitável no início, mas não é enterprise.

### Backup e recovery

Ponto forte: antes de sobrescrever, o app cria `.bak`:

```js
const bakName = filename + '.bak';
const bakHandle = await directoryHandle.value.getFileHandle(bakName, { create: true });
```

Evidência: `vue_app.js:734-738`.

Riscos:

- apenas um backup por arquivo, sobrescrito a cada salvamento;
- sem histórico versionado;
- sem recuperação guiada;
- backup em localStorage pode bater quota.

### Secrets management

Não há secrets de backend. O problema é a senha de criptografia no localStorage.

### Escalabilidade e tolerância a falhas

Para app local:

- escala por usuário/dispositivo;
- não há alta disponibilidade central;
- falhas principais são quota, corrupção de arquivo, browser incompatível, perda de permissão.

Para SaaS:

- arquitetura atual não é base pronta;
- seria necessário backend, auth, banco, tenancy, fila, storage, observabilidade, backups e compliance.

## 13. Testes e Qualidade

### Situação atual

Testes existentes:

- `tests/engine.test.js`;
- 51 testes passando;
- cobrem datas, CSV sanitization, dias úteis e scheduling.

Isso é um ponto forte real.

### Lacunas

| Área | Cobertura atual | Risco |
|---|---|---|
| UI Vue | Não encontrada | Regressões de interface |
| Persistência File System | Não encontrada | Perda/corrupção de dados |
| localStorage/IndexedDB | Não encontrada | Falhas de cache/fallback |
| Importação CSV real | Parcial/indireta | Parser manual pode quebrar |
| Export PDF/PNG/CSV | Não encontrada | Vulnerabilidades e regressões |
| Acessibilidade | Não encontrada | WCAG sem validação |
| E2E | Não encontrada | Fluxos críticos sem proteção |
| Build/security gates | Não encontrados | Vulnerabilidades entram sem bloqueio |

### Estratégia recomendada

1. Unit tests para engine, parser e validators.
2. Component tests com Vue Test Utils após modularização.
3. E2E com Playwright para:
   - abrir/criar projeto;
   - importar CSV;
   - editar tarefa;
   - salvar baseline;
   - recalcular forecast;
   - exportar CSV/PDF;
   - fechar/reabrir projeto.
4. Testes de acessibilidade com axe.
5. CI com `npm test`, `npm run build`, `npm audit --audit-level=high`.
6. Golden tests para CSV/JSON schema.

## 14. Banco de Dados e Persistência

### Modelagem

Não há banco relacional. A modelagem é arquivo/objeto:

- tarefas em CSV;
- metadados de projeto em JSON;
- portfólio em JSON;
- feriados em JSON;
- cache em localStorage;
- handle de diretório em IndexedDB.

### Pontos fortes

- formato simples e portável;
- fácil backup manual;
- bom para privacidade;
- sem servidor central.

### Riscos

| Risco | Impacto | Recomendação |
|---|---|---|
| CSV sem schema/versionamento | Corrupção e incompatibilidade futura | Adicionar `schemaVersion` em JSON e manifest |
| Parser manual | Dados incorretos | Usar PapaParse |
| localStorage para dados grandes | Quota e travamento | IndexedDB |
| Sem índices | Busca em memória apenas | Aceitável localmente, mas otimizar para milhares de tarefas |
| Sem migrations | Evolução difícil | Criar migrators por versão |
| Backup único `.bak` | Recovery limitado | Histórico versionado/rotativo |

### Integridade

Há validações de extensão e nome:

```js
const ALLOWED_EXTENSIONS = new Set(['.json', '.csv', '.bak']);
```

Evidência: `vue_app.js:16-27`.

Mas falta validação profunda:

- predecessora deve apontar tarefa existente;
- ciclos devem ser exibidos como erro, não apenas fallback silencioso;
- percent deve ficar 0-100;
- datas reais e planejadas devem ser coerentes;
- ids únicos devem ser garantidos.

## 15. SEO e Web Moderna

Como ferramenta local-first, SEO não é prioridade funcional. Ainda assim, para produto público:

| Item | Status | Observação |
|---|---|---|
| Title | Básico | `Gantt Chart - Vue 3 Local-First` |
| Meta description | Ausente | Melhorar se houver landing/publicação |
| OpenGraph/Twitter | Ausente | Necessário para compartilhamento |
| SSR | Ausente | SPA client-side |
| Sitemap/robots | Ausentes | Não relevante localmente |
| PWA | Ausente | Seria útil para app local |
| Manifest/service worker | Ausentes | Oportunidade |
| Core Web Vitals | Não medidos | Necessário Playwright/Lighthouse |

Recomendação: se continuar como ferramenta local, priorizar PWA/offline, não SEO. Se virar site de marketing, separar landing page do app.

## 16. Análise de Maturidade

| Área | Nota 0-10 | Justificativa |
|---|---:|---|
| Arquitetura | 5.5 | Conceito local-first bom, implementação monolítica |
| Segurança | 5.0 | Boas intenções, mas `jspdf` crítico e criptografia fraca |
| Performance | 5.5 | Ok para pequeno/médio, risco alto em Gantt grande |
| UX/UI | 7.0 | Produto rico, bom fluxo desktop, precisa design system e mobile |
| Qualidade de código | 5.5 | Engine testada, mas duplicação e God module |
| Escalabilidade | 4.5 | Escala localmente, não como SaaS ou projeto massivo |
| DevOps | 3.0 | Sem CI/CD/Docker/release gates |
| Manutenibilidade | 5.0 | Docs fortes, código concentrado |
| Testes | 4.5 | Bons testes unitários de engine, pouca cobertura geral |
| Maturidade geral | 5.6 | Pleno, com caminho claro para Sênior |

Scores solicitados:

| Score | Nota | Leitura |
|---|---:|---|
| Score técnico | 5.8/10 | Base funcional, arquitetura precisa evoluir |
| Score de segurança | 5.0/10 | Dependência crítica impede nota maior |
| Score enterprise readiness | 4.2/10 | Falta CI/CD, hardening, testes E2E, modularização |
| Score de escalabilidade | 4.5/10 | Bom local-first, limitado para projetos grandes/SaaS |
| Score final do produto | 5.7/10 | Produto útil, ainda não enterprise |

Nível do projeto: Pleno.

## 17. Roadmap de Melhorias

### Correções imediatas P0

| Item | Ação | Critério de aceite |
|---|---|---|
| Atualizar `jspdf` | Migrar para versão corrigida ou substituir gerador PDF | `npm audit` sem critical/high |
| Resolver build | Converter `vue_app.js` para módulo ou app Vite real | Build sem alerta, JS bundlado |
| Remover senha do localStorage | Passphrase em memória por sessão | Dados não descriptografam sem usuário informar senha |
| Remover `unsafe-eval` | Bundlar dependências e ajustar CSP | CSP sem `unsafe-eval` |
| Remover logs debug | Logger com ambiente | Sem metadados de arquivo em console prod |

### Prioridades P1

| Item | Ação | Impacto |
|---|---|---|
| Modularizar frontend | Extrair composables, services e componentes | Manutenção e testes |
| Usar `src/engine.js` no runtime | Remover duplicação de engine | Testes passam a proteger app real |
| Trocar parser manual por PapaParse | Robustez CSV | Menos corrupção de dados |
| Criar E2E Playwright | Cobrir fluxos críticos | Regressão menor |
| Criar CI | Test/build/audit/lint | Qualidade contínua |
| Validar schema | Zod/JSON schema/manual | Segurança e integridade |

### Melhorias P2

| Item | Ação |
|---|---|
| TypeScript no domínio | Migrar `src/engine.js` e schemas |
| Virtualização do Gantt | Renderizar apenas viewport |
| Web Worker | Cálculo, parse e exportação |
| PWA/offline | Manifest, service worker e cache control |
| Acessibilidade | axe, contraste, foco inicial, navegação por teclado |
| Histórico de backups | Rotação/versionamento |

### Evolução arquitetural recomendada

Estrutura alvo:

```text
src/
  app/
    App.vue
    main.ts
  domain/
    scheduling/
    task/
    project/
  application/
    useCases/
      loadProject.ts
      saveTask.ts
      recalculateForecast.ts
  infra/
    filesystem/
    indexeddb/
    local-cache/
    csv/
  exporters/
    pdf/
    png/
    csv/
  ui/
    components/
    gantt/
    modals/
    kpi/
  tests/
```

## 18. Plano de Segurança

Checklist de hardening:

- [ ] Atualizar `jspdf` e validar advisories.
- [ ] Bundlar Vue/html2canvas/jsPDF via npm.
- [ ] Remover `unsafe-eval` da CSP.
- [ ] Reduzir `unsafe-inline` movendo estilos inline para CSS/classes.
- [ ] Adicionar `frame-ancestors 'none'` via header.
- [ ] Adicionar `Referrer-Policy`, `Permissions-Policy`, `COOP/CORP`.
- [ ] Remover senha do localStorage.
- [ ] Criptografar cache com passphrase em memória ou desativar cache sensível.
- [ ] Validar schema de todo CSV/JSON importado.
- [ ] Limitar tamanho de arquivos importados.
- [ ] Remover logs de debug em produção.
- [ ] Adicionar `npm audit` no CI.
- [ ] Adicionar threat model do modo local-first.

## 19. Plano de Refatoração

### Fase 1: estabilização

1. Atualizar dependências vulneráveis.
2. Garantir build real do JS.
3. Importar `calculateSchedule`, `parseDate`, `sanitizeCSV` de `src/engine.js`.
4. Remover duplicações óbvias.
5. Adicionar lint/format.

### Fase 2: separação de camadas

1. Extrair `storageService`.
2. Extrair `projectRepository`.
3. Extrair `csvParser/csvWriter`.
4. Extrair `exportService`.
5. Criar componentes Vue.

### Fase 3: confiabilidade

1. E2E Playwright.
2. Testes de integração de persistência com mocks.
3. Testes de exportação.
4. Validação de schema.
5. CI/CD.

### Fase 4: escala e UX

1. Virtualização.
2. Web Workers.
3. Modo mobile.
4. PWA/offline.
5. Undo/redo.

## 20. TOP 10 Problemas Mais Críticos

1. `jspdf@2.5.2` com vulnerabilidades críticas e altas.
2. Criptografia de cache armazena a senha no próprio localStorage.
3. `vue_app.js` monolítico com 2.537 linhas.
4. Engine testada duplicada e não consumida pelo runtime principal.
5. Build Vite não bundla `vue_app.js`.
6. CSP permissiva com `unsafe-eval` e `unsafe-inline`.
7. Dependências críticas carregadas por CDN em runtime.
8. Parser CSV manual em vez de PapaParse.
9. Ausência de CI/CD e gates de segurança.
10. Renderização Gantt O(tarefas x dias), sem virtualização.

## 21. TOP 10 Melhorias de Maior Impacto

1. Atualizar ou substituir `jspdf`.
2. Migrar para app Vite modular real.
3. Fazer `vue_app` consumir `src/engine.js`.
4. Remover senha do localStorage e redesenhar criptografia.
5. Implementar CI com test/build/audit/lint.
6. Usar PapaParse e schema validation.
7. Extrair persistência para camada isolada.
8. Criar testes E2E dos fluxos principais.
9. Virtualizar o Gantt.
10. Criar design system/componentes Vue reutilizáveis.

## 22. Recomendação Final

O ProjectGantt tem uma proposta técnica boa e uma experiência funcional acima de um protótipo comum. A escolha local-first é coerente e diferencia o produto. O projeto já demonstra cuidado com documentação, backup local, CSP/SRI parcial, sanitização CSV e testes unitários de engine.

Ainda assim, o produto não deve ser classificado como enterprise-grade neste momento. O bloqueador imediato é segurança de dependências, especialmente `jspdf`. Em seguida, a prioridade deve ser modularização e build real. Sem isso, cada nova feature aumenta o custo de manutenção e o risco de regressão.

Recomendação de ranking geral:

| Dimensão | Ranking |
|---|---|
| Produto local para uso individual | Bom |
| Produto interno para equipe pequena | Promissor, com correções P0 |
| SaaS comercial | Ainda não pronto |
| Enterprise-grade | Não pronto |

Score final do produto: 5.7/10.  
Nível do projeto: Pleno.  
Próximo nível viável: Sênior após corrigir P0/P1, modularizar e implantar CI/E2E.

