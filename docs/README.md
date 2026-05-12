# ProjectGantt - Documentação Técnica

Bem-vindo à documentação técnica oficial do **ProjectGantt**. Este diretório contém a análise completa do sistema, abrangendo desde a arquitetura *Local-First* até as regras de negócio de agendamento e exportação.

## Índice da Documentação

A documentação está dividida de forma modular para facilitar a consulta:

### 🏗 Arquitetura & Design
* [Design do Sistema](./architecture/system-design.md)
* [Frontend (Vue 3 UI/UX)](./frontend/ui-ux.md)
* [Backend (Serverless / Local-First)](./backend/backend.md)

### ⚙️ Regras & Lógica
* [Regras de Negócio e Agendamento](./business-rules/gantt-logic.md)
* [Requisitos do Sistema](./requirements/project-requirements.md)

### 💾 Armazenamento & Dados
* [Banco de Dados / Armazenamento Local](./database/local-storage.md)
* [Integração de Arquivos (File System API)](./api/file-system-api.md)

### 🔒 Segurança & Operação
* [Segurança e Permissões](./security/local-first.md)
* [Estratégia de Deploy](./deploy/deployment.md)

### 🔄 Fluxos & Integrações
* [Jornada do Usuário](./flows/user-journey.md)
* [Diagramas de Estado](./diagrams/state-diagram.md)
* [Integrações Externas](./integrations/integrations.md)

### 🧪 Qualidade
* [Estratégia de Testes](./testing/testing-strategy.md)

---
> **Nota do Arquiteto:** Este sistema foi projetado para operar 100% no navegador do usuário, garantindo privacidade máxima dos dados e operação offline, utilizando as mais modernas APIs web disponíveis.
