# Análise do Projeto ProjectGantt

**Data/Hora:** Sexta-feira, 15 de maio de 2026 - 17:30 (BRT)
**Analista:** MiniMax (opencode AI Assistant)

---

## Resumo do Projeto

ProjectGantt é uma aplicação web Local-First para gerenciamento de projetos com gráfico Gantt interativo. Utiliza Vue 3, Vuetify e File System Access API para persistência local.

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. TaskModal salva campos incorretos
**Arquivo:** `src/components/TaskModal.vue`
**Descrição:** O modal usa campos `realStart` e `realEnd` que não existem no objeto tarefa. Os campos corretos são:
- `actualStart` / `actualEnd` (execução real)
- `plannedStart` / `plannedEnd` (baseline)

**Impacto:** Usuário não consegue editar datas planejadas corretamente.

---

### 2. Performance do GanttEngine
**Arquivo:** `src/services/GanttEngine.js`
**Descrição:** O algoritmo `calculateSchedule` usa recursão sem memoização. Com >100 tarefas pode causar:
- Stack overflow
- Lentidão significativa
- cycle detection incompleta (`useGantt.js:82` só verifica stack local)

---

### 3. Memory Leaks em Event Listeners
**Arquivo:** `src/App.vue:45-61`
**Descrição:**
```javascript
onMounted(() => {
  window.addEventListener('mousemove', ...);
  window.addEventListener('mouseup', ...);
});
```
Não há cleanup no `onUnmounted`. Se o componente for destruído, os listeners permanecem ativos.

---

### 4. Sem Fallback para File System Access API
**Descrição:** A API `window.showDirectoryPicker` só funciona em Chrome/Edge. Usuários de Firefox/Safari não conseguem usar a aplicação.

---

### 5. Sem Backup/Versionamento
**Descrição:** Arquivos CSV são sobrescritos diretamente. Não há:
- Undo/Redo
- Backup automático
- Histórico de alterações

---

## 🟡 PROBLEMAS MÉDIOS

| Arquivo | Linha | Problema |
|---------|-------|----------|
| `useGantt.js` | 82 | Cycle detection não verifica dependências profundas |
| `TaskModal.vue` | 42-45 | `save()` faz reload completo após cada edição |
| `useGantt.js` | 377-395 | `arrowPaths` recalcula em cada render |
| `ChartArea.vue` | 31 | Syntax incorreta: `chartMonths.value?.length` dentro do template |
| `App.vue` | 74 | `projectMetadata.value.name.replace` pode crashar se name for null |

---

## 🟢 PONTOS DE MELHORIA

### UX/UI
- Adicionar loading spinners durante carregamento/salvamento
- Adicionar keyboard shortcuts (Ctrl+S para salvar)
- Tooltip nas barras do Gantt com mais informações
- Animação suave ao redimensionar colunas

### Performance
- Virtualizar lista de tarefas se >500 itens
- Implementar debounce em syncScroll
- Usar `shallowRef` para objetos grandes

### Código
- Extrair constantes (ROW_H, BAR_COLORS) para arquivo separado
- Adicionar TypeScript para melhor type safety
- Implementar testes unitários (Vitest/Jest)
- Adicionar ESLint e Prettier

### Segurança
- Validar entrada do CSV para prevenir CSV injection
- Sanitizar nomes de projetos antes de usar em filenames

### Acessibilidade
- Adicionar ARIA labels nos elementos interativos
- Suporte a navegação por teclado
- Contraste de cores adequado

### Documentação
- Criar guia de contribuição (CONTRIBUTING.md)
- Documentar arquitetura do projeto
- Criar CHANGELOG

---

## 🔵 OBSERVAÇÕES POSITIVAS

- ✅ Arquitetura Local-First bem implementada
- ✅ Boa separação de responsabilidades (composables, services, components)
- ✅ Uso correto de Vue 3 Composition API
- ✅ Implementação de baseline/forecast funcional
- ✅ Tema escuro bem implementado
- ✅ Exportação PNG funcionando
- ✅ Suporte a feriados configuráveis

---

## PRIORIDADES DE CORREÇÃO

1. **Alta:** Corrigir TaskModal para usar campos corretos
2. **Alta:** Adicionar cleanup dos event listeners
3. **Média:** Adicionar verificação de cycle em predecessor
4. **Média:** Adicionar fallback para navegadores sem File System API
5. **Baixa:** Adicionar testes unitários
6. **Baixa:** Configurar ESLint/Prettier

---

*Análise gerada automaticamente pelo assistente MiniMax (opencode)*