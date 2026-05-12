# Integrações Externas e Bibliotecas Auxiliares

Embora fundamentado numa filosofia Local-First contida e minimalista, o **ProjectGantt** faz uso estratégico de dependências e APIs públicas de alta especialidade para atingir os Requisitos Não-Funcionais estabelecidos de Usabilidade e Acessibilidade.

## 1. Integrações via Content Delivery Network (CDN)
A infraestrutura principal do software executa as resoluções de pacotes baseada em CDN Global (`unpkg` / `cdnjs`).

### 1.1 Vue.js (Global Build)
**Objetivo:** Engine responsável por reatividade, Componentização em runtime sem build e Virtual DOM.
- **Implementação:** Injeção direta através de tag script (`<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>`).
- **Escopo:** Evitar forçar setups de toolchain complexas na raiz do projeto (`index.html`), reduzindo dependências diretas de NPM para ambientes e permitindo o software funcionar num arquivo auto-contido.

### 1.2 HTML2Canvas
**Objetivo:** Solucionar o problema complexo de permitir exportação visual de componentes HTML aninhados em formato de Imagem PNG (Screenshoting Tool).
- **Implementação:** Tag script externa baseada em nuvem (`https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`).
- **Escopo:** O usuário requisita pelo clique em "Exportar Imagem". O sistema gera um canvas a partir da tag referenciada de classe `.gantt-wrapper`, ignora artefatos efêmeros de UX e aciona o parser do navegador (`toDataURL()`) despachando download virtual gerado dinamicamente para facilitar anexação em relatórios estáticos do cliente.

### 1.3 Google Fonts API
**Objetivo:** Elevação do nível da qualidade da fonte gráfica de renderização, fundamental para adequar a estética a modelos "Premium" e leitura amigável de densidade de dados numéricos.
- **Implementação:** Folha de Estilos apontando `https://fonts.googleapis.com/css2?family=Inter`.
- **Escopo:** Padronização visual em múltiplos Sistemas Operacionais substituindo as inconsistentes fontes de sistema (Verdana/Segoe UI/San Francisco) por tipografia especializada.

## 2. Dependência Externa Contida na Branch Isolada (Vite e SRC)
A pasta `/src` acusa a existência latente da infraestrutura madura de tooling utilizando:
- **Vite:** Bundler ultrarrápido para conversões de código moderno.
- **NPM Package (package.json):** Mantém listagem interna onde as bibliotecas externas como `Vue`, possivelmente plug-ins do ecossistema e linters podem ser processados com ferramentas Node para posterior minificação e subida (deploy) via pipeline CI/CD na pasta final (`/dist`).
