# Review UX — Botões da Tela Principal

## Problema

28 elementos interativos na tela principal, todos no mesmo nível visual:
- 15 botões no `.header > .controls`
- 8 view controls (view tabs, Baseline/Real toggle)
- Zoom (3 botões agrupados)
- Filter input + clear
- Project settings (✏️)

## Princípios violados

- **Hick's Law** — quanto mais escolhas, mais tempo para decidir. 28 opções simultâneas sobrecarregam o usuário.
- **Falta de hierarquia visual** — `.btn` e `.btn-secondary` diferem por 1px de borda; ações de alta e baixa frequência têm o mesmo peso.
- **Sem grouping lógico** — tudo no mesmo `.controls` com `flex-wrap`.
- **Poluição visual** — 12+ emojis competindo com KPIs e conteúdo do gantt.
- **Ações de setup expostas durante uso** — "Criar do Zero" e "Criar Portfólio" visíveis mesmo com projeto aberto.

## Inventário

| Frequência | Ação | Visível quando |
|---|---|---|
| 🔴 Alta | Nova Tarefa | hasFolder |
| 🔴 Alta | Zoom (Dia/Sem/Mês) | hasFolder |
| 🔴 Alta | Filter input | hasFolder |
| 🔴 Alta | View tabs (Pad/Plan/Exec/Full) | hasFolder |
| 🔴 Alta | Baseline / Real toggle | hasFolder |
| 🟡 Média | Recalcular | hasFolder + tasks.length > 0 |
| 🟡 Média | Salvar Baseline | hasFolder + tasks.length > 0 |
| 🟡 Média | Exportar | hasFolder |
| 🔵 Baixa | Feriados | hasFolder |
| 🔵 Baixa | Alterar Projeto | hasFolder + projectOptions > 0 |
| 🔵 Baixa | Salvar Arquivos | hasFolder + !directoryHandle |
| 🔵 Baixa | Importar | hasFolder + !directoryHandle + tasks.length > 0 |
| 🔵 Baixa | Fechar Pasta | hasFolder |
| ⚪ Setup | Abrir Pasta | !hasFolder |
| ⚪ Setup | Criar do Zero | sempre |
| ⚪ Setup | Criar Portfólio | sempre |
| ⚫ App | Theme toggle | sempre |
| ⚫ App | Project Settings (✏️) | sempre |

## Proposta

### Estrutura em 3 linhas

```
┌──────────────────────────────────────────────────────────────────┐
│ App Bar                                                          │
│ [Project Gantt ✏️]    Gerente: X | Início: DD/MM     🌓  [⚙️] │
├──────────────────────────────────────────────────────────────────┤
│ Stats + Views                                                    │
│ 📋5  📅20  🏁80%  Término: DD/MM   [Pad|Plan|Exec|Full]        │
│                                           [Baseline] [Real]      │
├──────────────────────────────────────────────────────────────────┤
│ Task Toolbar                                                     │
│ [+ Nova Tarefa]  [🔄 Recalcular]  [📸 Baseline]  🔍[Filtrar..] │
│       Dia | Sem | Mês                                            │
├──────────────────────────────────────────────────────────────────┤
│                        GANTT CHART                               │
└──────────────────────────────────────────────────────────────────┘
```

### Overflow ⚙️ (ações de baixa frequência)

Agrupadas em dropdown ao lado do theme toggle:
- Alterar Projeto
- Feriados
- Salvar Arquivos
- Importar
- Fechar Pasta
- Criar do Zero
- Criar Portfólio do Zero

### Benefícios esperados

1. **Botões visíveis reduzidos de ~15 para ~8** — menos ruído cognitivo
2. **Hierarquia clara** — App bar (identidade) > Stats (contexto) > Toolbar (ação)
3. **Progressive disclosure** — ações raras atrás de um clique extra
4. **Clean visual** — emojis concentrados na action bar, stats só com números

## Próximos passos

1. Implementar CSS para o dropdown ⚙️ (position absolute, z-index)
2. Mover botões de baixa frequência para dentro do dropdown
3. Reorganizar HTML: App bar → Stats + Views → Task toolbar
4. Ajustar alturas/offsets existentes (calc(100vh - 160px) etc.)
5. Testar em todos os estados (com/sem projeto, com/sem tasks, mobile)
