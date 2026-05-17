# Análise de Melhores Práticas — ProjectGantt v3

**Data:** 16 de Maio de 2026
**Analista:** DeepSeek V4 Flash (openCode)
**Propósito:** Levantamento de melhores práticas em segurança, arquitetura, design, UX e CSS.

---

## 1. Segurança

### 1.1 Pontos Fortes

| Prática | Status | Descrição |
|---------|--------|-----------|
| File System Access API | ✅ | Usa API nativa do navegador para leitura/gravação local, sem necessidade de servidor |
| Fallback para localStorage | ✅ | Implementado mecanismo de fallback quando a pasta não está conectada |
| Backup automático de arquivos | ✅ | Cria arquivos `.bak` antes de sobrescrever CSVs (vue_app.js:539-557) |
| Persistência de handle via IndexedDB | ✅ | Armazena o directory handle para reconectar automaticamente |

### 1.2 Áreas de Melhoria

| ID | Problema | Severidade | Recomendação |
|----|----------|------------|--------------|
| S-01 | CSV Injection | Alta | Sanitizar valores que começam com `=`, `+`, `-`, `@`, `\|` prefixando com `'` |
| S-02 | XSS em :title | Alta | Usar escaping ou sanitizar dados antes de renderizar em atributos |
| S-03 | Validação de input ausente | Média | Adicionar validação de tipo, tamanho e caracteres especiais nos modais |
| S-04 | localStorage sem criptografia | Baixa | Ofuscar ou criptografar dados sensíveis (opcional) |
| S-05 | API exclusiva Chrome | Alta | Implementar fallback para Firefox/Safari (upload manual) |
| S-06 | Permissões não verificadas | Média | Verificar `permissionStatus` antes de operações de escrita |

---

## 2. Arquitetura

### 2.1 Pontos Fortes

| Prática | Status | Descrição |
|---------|--------|-----------|
| Paradigma Local-First | ✅ | Não depende de servidor, dados permanecem no disco do usuário |
| Separação de responsabilidades | ✅ | Funções utilitárias (`parseDate`, `addDays`, `isWorkingDay`) separadas do estado |
| Persistência híbrida | ✅ | Combinação de File System API, IndexedDB e localStorage |
| Formato CSV estruturado | ✅ | Headers centralizados em `CSV_WRITE_FIELDS` com aliases para leitura |

### 2.2 Áreas de Melhoria

| ID | Problema | Severidade | Recomendação |
|----|----------|------------|--------------|
| A-01 | Monólito em arquivo único | Alta | Separar em módulos: utils, services, composables |
| A-02 | Código duplicado | Alta | Unificar funções utilitárias em `src/utils/date.js` |
| A-03 | Dependência circular no save | Alta | `saveTasksToDisk()` recarrega projeto inteiro — otimizar para update in-place |
| A-04 | Ausência de build pipeline | Média | Adicionar ESLint, Prettier e testes unitários |
| A-05 | Sem TypeScript | Baixa | Migrar gradualmente para TS |

---

## 3. Design

### 3.1 Pontos Fortes

| Prática | Status | Descrição |
|---------|--------|-----------|
| Tema escuro premium | ✅ | Design system coerente com cores definidas em CSS variables |
| Feedback visual rico | ✅ | Toasts, badges de atraso/adiantamento, indicadores de source |
| Grid responsivo | ✅ | Layout adaptável com resizer e width mínimo |
| Micro-animações | ✅ | Animações de entrada de barras, slide-in de toasts |

### 3.2 Áreas de Melhoria

| ID | Problema | Severidade | Recomendação |
|----|----------|------------|--------------|
| D-01 | CSS inline extenso | Alta | Migrar para arquivo `.css` separado ou utilizar CSS modules |
| D-02 | Variáveis não utilizadas | Média | Limpar CSS variables não usadas (ex: `surface3` jarang usage) |
| D-03 |falta de design system documentado | Média | Criar guia de estilos com tokens, tipografia e espaçamentos |
| D-04 | Hardcoded colors | Média | Substituir cores hardcoded por variáveis CSS |

---

## 4. UX (Experiência do Usuário)

### 4.1 Pontos Fortes

| Prática | Status | Descrição |
|---------|--------|-----------|
| Workflow intuitivo | ✅ |Wizard de criação de projeto com steps claros |
| Feedback constante | ✅ | Toasts, dialogs customizados, indicadores de progresso |
| Visualização de Baseline | ✅ | Barras fantasma e seleção avançada via checkboxes |
| KPI dashboard | ✅ | SPI, Desvio Médio, Contagem de atrasadas/forecast |
| Filtro de tarefas | ✅ | Busca por nome ou ID com resultados em tempo real |

### 4.2 Áreas de Melhoria

| ID | Problema | Severidade | Recomendação |
|----|----------|------------|--------------|
| U-01 | Sem atalhos de teclado | Média | Adicionar atalhos para ações frequentes (Ctrl+S, Del, etc.) |
| U-02 | Loading states limitados | Média | Adicionar skeletons ou spinners durante carregamento |
| U-03 | Sem undo/redo | Baixa | Implementar histórico de alterações |
| U-04 | Acessibilidade limitada | Alta | Adicionar ARIA labels, keyboard navigation, focus management |
| U-05 | Tooltips instáveis | Média | Melhorar posicionamento e responsividade dos tooltips |

---

## 5. CSS

### 5.1 Pontos Fortes

| Prática | Status | Descrição |
|---------|--------|-----------|
| CSS Custom Properties | ✅ | Uso de `:root` para design tokens (cores, espacamentos) |
| Tema claro/escuro | ✅ | Suporte a `data-theme="light"` com variáveis alternativas |
| Mobile-first (parcial) | ✅ | Layout flex com wrap em telas menores |
| Animações otimizadas | ✅ | Uso de `transform` e `opacity` para performance |

### 5.2 Áreas de Melhoria

| ID | Problema | Severidade | Recomendação |
|----|----------|------------|--------------|
| C-01 | CSS em 660 linhas no HTML | Alta | Extrair para arquivo `styles.css` separado |
| C-02 | Seletores muito específicos | Média | Utilizar classes utilitárias (BEM ou similar) |
| C-03 | Duplicação de propriedades | Média | Criar classes reutilizáveis para patterns comuns |
| C-04 | Sem autoprefixer | Baixa | Configurar build para vendor prefixes automáticos |
| C-05 | Unidades misturadas | Média | Padronizar px/rem/em |

---

## 6. Resumo de Prioridades

### Críticas (Resolvidas imediatamente)
- S-01: CSV Injection
- S-02: XSS via atributos
- A-03: Dependência circular no save

### Altas (Próximas sprints)
- A-01: Modularização do código
- A-02: Unificação de utils
- U-04: Acessibilidade
- C-01: Extração de CSS

### Médias
- S-03, S-06: Validação e permissões
- U-01, U-02: Atalhos e loading states
- D-01, D-02: Design system

### Baixas
- S-04, A-05, U-03, C-04, C-05: Melhorias opcionais

---

*Análise gerada por DeepSeek V4 Flash via openCode em 16/05/2026. Nenhum arquivo foi modificado.*