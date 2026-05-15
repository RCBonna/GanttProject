# Decisão Arquitetural: CDN vs Vite + Vuetify

**Data:** 15 de Maio de 2026
**Contexto:** O projeto continha duas implementações paralelas — versão Legacy (CDN) e versão Refatorada (Vite + Vuetify).

## Decisão

Manter a **versão Legacy (CDN)** como implementação oficial e **descontinuar a versão Vite + Vuetify**.

## Motivos

| Fator | CDN (Legacy) | Vite + Vuetify |
|-------|-------------|----------------|
| Funcionalidades implementadas | ~95% | ~40% |
| Maturidade e estabilidade | Alta | Baixa (bugs conhecidos) |
| Dependências externas | Vue 3 CDN + html2canvas + jsPDF | npm (5 pacotes) + Vite + plugins |
| Execução | `npm run dev` ou `file://` direto | `npm run dev` obrigatório |
| Bundle final | ~300KB (CDN cacheável) | ~500KB (Vuetify) |
| Complexidade de manutenção | Baixa (1 arquivo JS) | Alta (10+ componentes, composables) |

## Histórico

- A versão Vite + Vuetify foi iniciada como uma migração/melhoria, mas nunca foi concluída.
- Os componentes SFC continham referências quebradas (`gantt.allTasks` inexistente, `showBaseline.value` incorreto no template, etc.).
- O esforço para completar a migração foi estimado como inviável frente ao benefício marginal para o usuário final.

## Consequências

- O diretório `src/` foi removido (código não utilizado).
- Dependências npm relacionadas ao Vite + Vuetify foram mantidas no `package.json` por referência, mas não são necessárias para execução.
- Futuras melhorias devem ser feitas diretamente em `index.html` + `vue_app.js`.
- A ferramenta de build Vite (via `vite.config.js`) serve apenas o `index.html` legacy para desenvolvimento com HMR.
