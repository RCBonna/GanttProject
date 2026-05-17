# Portfolio Info — Overlay no Header

## Problema

O portfólio tem dados (nome, descrição, gerente, data base, cor tema) que são coletados no wizard de criação, mas **nunca exibidos** depois. Pior: `portfolioMeta` era salvo no `localStorage` mas **nunca lido de volta** — perdido no reload.

## Solução implementada

### Overlay no header (Opção C)

Trigger ▶ na extrema esquerda do `.header`, visível apenas quando `portfolioMeta.name` existe. Ao clicar, abre um painel overlay com backdrop.

```
[▶] [Nome do Projeto ✏️]  Gerente: X              🌓  ⚙️
 ┌──────────────────────────────────┐
 │ ███ Portfolio "X"           [✕] │ ← header colorido com portfolioMeta.color
 │ Gerente                         │
 │ João                            │
 │ Data base                       │
 │ 01/01/2026                      │
 │ Descrição                       │
 │ Projetos de infra 2026          │
 │ Criado em                       │
 │ 16/05/2026                      │
 │ Tema                            │
 │ 🟤 #0984e3                      │
 ├──────────────────────────────────┤
 │        2 projeto(s) no portfólio │
 └──────────────────────────────────┘
```

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `vue_app.js` | `portfolioMeta` ref + restore do `localStorage` no `onMounted`; `showPortfolioInfo` ref; click-outside handler extendido |
| `index.html` | Trigger ▶ no header + overlay panel com dados do portfólio |
| `style.css` | `.portfolio-trigger`, `.portfolio-overlay` (+content, +header, +body, +footer, +row, +close), animação `portfolioSlideIn` |

### Comportamento

- **Sem portfólio**: trigger oculto
- **Com portfólio**: trigger ▶ visível, muda de cor para o tema ao abrir
- **Overlay**: `position: fixed; inset: 0; z-index: 200` com backdrop transparente; fecha ao clicar no ✕, no backdrop, ou fora do painel
- **Animação**: `portfolioSlideIn` — fade + translateY(-8px) → 0
- **Dados**: restaurados do `localStorage` no `onMounted` junto com `projectMetadata` e `projectOptions`

### Estrutura do portfolioMeta

```json
{
  "name": "Meu Portfólio",
  "description": "Projetos de infraestrutura 2026",
  "color": "#0984e3",
  "manager": "João Silva",
  "baseDate": "2026-01-01",
  "createdAt": "2026-05-16T..."
}
```

### Pendências / Ideias futuras

- Exibir cor do portfólio como accento no header (ex.: borda superior fina)
- Mostrar nome do portfólio no título da aba/janela
- Editar dados do portfólio (hoje só cria, não edita)
