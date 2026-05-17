# Plano de Implementação: Wizard Portfólio do Zero

**Data:** 16 de Maio de 2026  
**Projeto:** ProjectGantt v2.1  
**Arquivos-alvo:** `index.html`, `vue_app.js`  

---

## 1. Objetivo

Criar um fluxo wizard dedicado que guie o usuário passo a passo desde a **escolha/criação de uma pasta vazia** até a **criação do primeiro projeto**, com validações, feedback visual e resumo final — separando conceitualmente "Portfólio" de "Projeto".

---

## 2. Situação Atual

O ProjectGantt já possui um botão **"✨ Criar do Zero"** que abre um wizard de 3 etapas (Identidade → Calendário → Template) para criar um único projeto dentro de uma pasta selecionada via `showDirectoryPicker`. O `portfolio.json` é criado implicitamente como subproduto.

**Limitação:** Não há um fluxo dedicado de **"criação de portfólio"** — o portfólio é tratado como artefato secundário. O usuário não tem uma visão clara de que está criando um *portfólio de projetos* antes de criar o primeiro projeto.

---

## 3. Arquivos a Modificar

| Arquivo | Alterações |
|---------|-----------|
| `index.html` | Novo modal wizard-portfólio (~180 linhas); botão "📂 Criar Portfólio do Zero" na tela inicial |
| `vue_app.js` | ~5 novas funções reutilizando lógica existente; ~150 linhas |
| `docs/Wizard_Portfólio_Prj.md` | Este documento de planejamento |

> **Nenhum arquivo novo é criado** — todo o código adicional será adicionado aos arquivos existentes.

---

## 4. Estrutura do Wizard: 5 Etapas

### Etapa 1 — Boas-Vindas / Seleção da Pasta

- Tela explicativa: "Crie um portfólio de projetos do zero"
- Botão "📁 Escolher Pasta Vazia" → `showDirectoryPicker`
- Valida se a pasta está vazia (ou se contém apenas `portfolio.json`/`feriados.json` já existentes para recriação)
- Exibe o caminho da pasta selecionada
- Botão "Próximo" desabilitado até pasta ser selecionada

### Etapa 2 — Identidade do Portfólio

- Nome do Portfólio (obrigatório, min 3 caracteres)
- Descrição / Observação (opcional, textarea)
- Cor de tema principal (color picker, padrão `#0984e3`)
- Responsável/Gerente geral do portfólio (opcional)

### Etapa 3 — Calendário Padrão do Portfólio

- Data base do portfólio (date picker, obrigatório) — usada como referência para novos projetos
- Checkbox: "Incluir feriados nacionais brasileiros?" (padrão: ligado)
  - 8 feriados fixos (Ano Novo, Tiradentes, Trabalho, Independência, Aparecida, Finados, República, Natal)
- Botão "➕ Adicionar feriado manual": abre mini-formulário (data + descrição)
  - Feriados adicionados são listados com botão "✕" para remover
- Data mínima para feriados: ano da data base

### Etapa 4 — Primeiro Projeto

- Input: Nome do projeto (obrigatório, sanitizado)
- Input: Gerente do projeto (opcional; preenche automaticamente com o gerente do portfólio se vazio)
- Select: Template de tarefas (3 opções existentes):
  - 📄 Em Branco — 1 tarefa ("Planejamento Inicial", 5 dias)
  - 💻 Desenvolvimento de Software — 6 tarefas encadeadas (FS/SS)
  - 🏗️ Engenharia / Obras Civis — 6 tarefas encadeadas (FS)
- Date picker: Data de início do projeto (padrão = data base do portfólio)
- Pré-visualização: ao selecionar um template, exibe a lista de tarefas que serão criadas
-Cor de tema principal (color picker, padrão `#0984e3`)
- Checkbox: "Quero criar mais projetos depois" (se desligado, wizard finaliza após a Etapa 5)

### Etapa 5 — Resumo e Confirmação

- Card de resumo visual com todas as escolhas agrupadas:
  - **📁 Pasta:** caminho completo
  - **🏷️ Portfólio:** nome, cor, responsável
  - **🗓️ Calendário:** data base, N feriados
  - **📊 1º Projeto:** nome, template, N tarefas, data início
- Botões:
  - "⬅️ Voltar" — retorna à etapa anterior
  - "Cancelar" — fecha modal (sem efeito colateral)
  - "🚀 Finalizar e Criar" — executa a criação

#### Ações do botão "Finalizar e Criar"

1. Salva o handle da pasta no IndexedDB (`saveHandleToDB`)
2. Cria `portfolio.json` com:
   - Metadados do portfólio (nome, descrição, cor, gerente, dataBase)
   - Array `projects` contendo o primeiro projeto
3. Cria `feriados.json` (com os feriados selecionados/adicionados)
4. Cria o CSV do primeiro projeto com as tarefas do template escolhido
5. Atualiza `localStorage` (cache: `hasFolder`, `portfolioMetadata`, `projectMetadata`, `tasks`, `holidaysMap`)
6. Calcula cronograma (`calculateSchedule`) e renderiza (`buildTimeline`)
7. Exibe toast de sucesso:
   - ✅ "Portfólio 'X' criado com sucesso! Projeto 'Y' inicializado."
   - Botão no toast: "➕ Adicionar outro projeto" (abre `startNewProjectWizard`)
8. Fecha o modal

---

## 5. Funções Novas em `vue_app.js`

| Função | Escopo | Descrição |
|--------|--------|-----------|
| `startPortfolioWizard()` | global | Reinicia variáveis de estado do wizard-portfólio (`pfStep`, `pfFolder`, `pfName`, etc.) e exibe modal |
| `nextPortfolioStep()` | global | Valida campos da etapa atual e incrementa `pfStep` |
| `prevPortfolioStep()` | global | Decrementa `pfStep` (voltar) |
| `addPortfolioHoliday()` | global | Adiciona feriado customizado ao array `pfHolidays` |
| `removePortfolioHoliday(idx)` | global | Remove feriado do array pelo índice |
| `confirmCreatePortfolio()` | global | Função principal: cria todos os arquivos, salva caches, renderiza |

### Variáveis de Estado (novas reativas)

```js
const pfStep = ref(1);
const pfFolderHandle = ref(null);
const pfFolderPath = ref('');
const pfName = ref('');
const pfDescription = ref('');
const pfColor = ref('#0984e3');
const pfManager = ref('');
const pfBaseDate = ref(new Date().toISOString().split('T')[0]);
const pfIncludeHolidays = ref(true);
const pfHolidays = ref([]);
const pfNewHolidayDate = ref('');
const pfNewHolidayDesc = ref('');
const pfProjectName = ref('');
const pfProjectManager = ref('');
const pfProjectTemplate = ref('software');
const pfProjectStartDate = ref('');
const pfCreateMore = ref(true);
const showPortfolioWizard = ref(false);
```

---

## 6. Código Reutilizado (sem duplicação)

| Código Existente | Uso no Novo Wizard |
|-----------------|-------------------|
| `saveFileToDisk(nome, conteúdo)` | Salvar `portfolio.json`, `feriados.json`, CSV de tarefas |
| `readFileFromDisk(nome)` | Verificar se pasta já contém arquivos |
| `saveHandleToDB(handle)` | Persistir handle no IndexedDB |
| `calculateSchedule(tasks, startDate)` | Calcular cronograma do 1º projeto |
| `buildTimeline()` | Renderizar Gantt após criação |
| `saveTasksToDisk()` | Salvar CSV de tarefas no disco |
| `sanitizeFilename(nome)` | Gerar nome seguro para arquivo CSV |
| `addToast(msg, tipo, duracao)` | Feedback ao usuário |
| Template arrays (blank/software/civil) | População inicial de tarefas |
| `holidaysMap` / cache helpers | `encodeCache()`, `localStorage.setItem` |
| `projectOptions` / `projectMetadata` | Gerenciamento de projetos no portfolio |

---

## 7. Alterações no `index.html`

### 7.1 Novo botão na tela inicial

Adicionar ao lado do botão "✨ Criar do Zero" existente:

```html
<button class="btn" @click="startPortfolioWizard">
  📂 Criar Portfólio do Zero
</button>
```

### 7.2 Novo modal: `<!-- Modal Wizard Portfólio -->`

Estrutura:
- `modal-overlay` com `showPortfolioWizard`
- Cabeçalho: "📂 Novo Portfólio do Zero"
- Wizard progress indicator (5 passos) — mesmo estilo visual do wizard existente
- 5 seções `v-if="pfStep === N"` para cada etapa
- Footer com botões Anterior/Próximo/Cancelar/Finalizar

---

## 8. Validações por Etapa

| Etapa | Campo(s) | Validação | Feedback |
|-------|----------|-----------|----------|
| 1 | Pasta | `pfFolderHandle` não nulo | "Selecione uma pasta antes de prosseguir." |
| 2 | Nome Portfólio | `pfName.value.trim().length >= 3` | "O nome do portfólio deve ter ao menos 3 caracteres." |
| 3 | Data Base | `pfBaseDate.value` preenchida | "Informe a data base do portfólio." |
| 3 | Feriados | Data não pode ser anterior ao ano base | "Feriado com data inválida para este portfólio." |
| 4 | Nome Projeto | `pfProjectName.value.trim()` preenchido | "Informe o nome do primeiro projeto." |
| 4 | Data Projeto | `pfProjectStartDate.value` preenchida | "Informe a data de início do projeto." |

---

## 9. Fluxo de Telas (UX)

```
[Tela Inicial]
    │
    ├── [Botão "📂 Criar Portfólio do Zero"]
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────┐
    │   │  Etapa 1: Selecionar Pasta               │
    │   │  [📁 Escolher Pasta]  Caminho: ___       │
    │   │                          [Cancelar] [➡️] │
    │   └──────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────┐
    │   │  Etapa 2: Identidade do Portfólio        │
    │   │  Nome*, Descrição, Cor, Gerente          │
    │   │                   [⬅️] [Cancelar] [➡️]  │
    │   └──────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────┐
    │   │  Etapa 3: Calendário                     │
    │   │  Data Base*, Feriados, [+ Adicionar]     │
    │   │                   [⬅️] [Cancelar] [➡️]  │
    │   └──────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────┐
    │   │  Etapa 4: Primeiro Projeto               │
    │   │  Nome*, Gerente, Template*, Data*        │
    │   │  [☑ Criar mais projetos depois]          │
    │   │                   [⬅️] [Cancelar] [➡️]  │
    │   └──────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────┐
    │   │  Etapa 5: Resumo                         │
    │   │  📁 Pasta: ...                           │
    │   │  🏷️ Portfólio: ...                      │
    │   │  📊 1º Projeto: ...                      │
    │   │          [⬅️] [Cancelar] [🚀 Finalizar] │
    │   └──────────────────────────────────────────┘
    │
    ▼
[Toast Sucesso] → Gantt renderizado
    │
    └── [➕ Adicionar outro projeto] → wizard existente
```

---

## 10. Tratamento de Erros e Casos de Borda

| Situação | Comportamento |
|----------|---------------|
| Usuário clica "Cancelar" | Fecha modal, estado é resetado, nada é criado |
| `showDirectoryPicker` não suportado (Firefox/Safari) | Modal exibe aviso e campo para digitar caminho; usa `localStorage` como fallback |
| Usuário seleciona pasta não vazia sem `portfolio.json` | Aviso: "A pasta não está vazia. Deseja continuar?" — se sim, prossegue |
| Usuário seleciona pasta com `portfolio.json` existente | Aviso: "Já existe um portfólio nesta pasta. Deseja sobrescrever?" |
| Falha ao salvar arquivo (permissão negada) | Toast de erro: "Não foi possível salvar. Verifique as permissões da pasta." |
| Nome de projeto duplicado no portfólio | Validação em tempo real na Etapa 4 (se `portfolio.json` já existir) |

---

## 11. Critérios de Sucesso

- ✅ Usuário consegue criar portfólio + 1º projeto em < 2 minutos (5 cliques + preenchimento)
- ✅ Todos os arquivos são criados no disco: `portfolio.json`, `feriados.json`, `{projeto}.csv`
- ✅ Gantt renderiza imediatamente após confirmação (sem refresh)
- ✅ Botão "➕ Adicionar outro projeto" disponível no toast de sucesso
- ✅ Fallback para `localStorage` se File System API não estiver disponível
- ✅ Código novo não duplica lógica existente (reusa funções de `vue_app.js`)
- ✅ Wizard existente ("✨ Criar do Zero") continua funcionando inalterado
- ✅ Estado do wizard é completamente resetado ao abrir/fechar/cancelar
- ✅ Validações impedem avanço com dados incompletos

---

## 12. Considerações de Manutenção

- O wizard-portfólio compartilha variáveis de estado com o wizard existente apenas quando necessário (ex: `holidaysMap`, `tasks`, `projectMetadata`).
- O template de tarefas é definido por arrays centralizados — qualquer novo template adicionado no futuro estará automaticamente disponível em ambos os wizards.
- A lógica de criação de arquivos em disco (`saveFileToDisk`) já trata race conditions e backups (`.bak`).
- Para testar: abrir `index.html` via `file://` no Chrome com `--allow-file-access-from-files` ou via `npm run dev`.
