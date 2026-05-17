# Segurança, Sandboxing e Mitigação de Vulnerabilidades

Este documento detalha o modelo de segurança do **ProjectGantt**, cobrindo o isolamento da aplicação no navegador, permissões de acesso ao sistema de arquivos local e as regras ativas de proteção contra injeções e adulterações de dados.

---

## 1. O Modelo de Sandboxing do Navegador

Por ser uma aplicação web local-first desprovida de infraestrutura clássica de servidores, o ProjectGantt herda diretamente e respeita todas as diretrizes rígidas do **Sandbox do Navegador**.

### Benefícios Inerentes do Modelo:
1. **Sem Execução de Binários:** O aplicativo roda sob a máquina virtual JavaScript do navegador, impossibilitando que um arquivo corrompido execute comandos maliciosos nativos diretamente no sistema operacional do usuário.
2. **Isolamento de Origem (Same-Origin Policy):** Toda persistência local (LocalStorage e IndexedDB) fica estritamente associada ao domínio de origem (`localhost` ou domínio HTTPS de hospedagem estática). Nenhuma outra página web externa consegue farejar ou acessar os tokens persistidos ou tarefas carregadas.
3. **Escopo Restrito de Acesso:** O sistema operacional concede acesso exclusivo e cirúrgico à pasta apontada ativamente pelo usuário. O aplicativo não consegue navegar de forma lateral para outras pastas do computador ou enxergar arquivos do sistema de arquivos geral.

---

## 2. Proteção Ativa Contra Injeção de Fórmulas em CSV (CSV Injection)

A importação e exportação de planilhas em formato CSV introduz o risco conhecido como **Injeção de Fórmulas (CSV Injection)**. Caso um atacante crie uma tarefa com um título contendo caracteres de fórmulas matemáticas (como `=SUM(A1:A5)` ou `=-CMD(exec)`), softwares de escritório (como Microsoft Excel, LibreOffice Calc ou Google Sheets) podem avaliar dinamicamente essa fórmula ao abrir o arquivo exportado pelo ProjectGantt, provocando vazamento de dados ou execução remota de código na máquina do usuário.

Para neutralizar esta ameaça, o ProjectGantt implementa **mitigação ativa e higienização dupla** no leitor e gravador de planilhas.

### Algoritmo de Higienização de Entrada/Saída (`sanitizeCSV` & Escaping):
Toda escrita de dados para exportação de arquivos CSV passa pela verificação do prefixo de controle. Se um campo contiver qualquer operador de execução matemático, o sistema prepend automaticamente uma aspa simples `'` para forçar o leitor de planilhas a ler a linha estritamente como texto (string literal):

```javascript
function sanitizeCSV(val) {
  if (typeof val !== 'string') return val;
  // Sanitização contra execução de fórmulas em planilhas externas
  if (/^[=+\-@|\t]/.test(val)) return "'" + val;
  // Prevenção de quebra de linhas na formatação das colunas
  if (/\r|\n/.test(val)) return val.replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
  return val;
}
```

E no momento de salvar as tarefas (`saveTasksToDisk`), as aspas e caracteres de controle são tratados de maneira defensiva:

```javascript
const escapeCSV = (val) => {
  const str = String(val ?? '');
  if (/^[=+\-@|\t]/.test(str)) return `"'${str.replace(/"/g, '""')}"`;
  return `"${str.replace(/"/g, '""')}"`;
};
```

---

## 3. Segurança na Persistência de Dados e Cache (`v1:e:`)

A persistência do cache rápido de inicialização em localStorage oferece conveniência, mas armazena dados em texto puro que poderiam ser capturados por extensões maliciosas ou rastreadores de publicidade (scripts de terceiros) que eventualmente rodem em outras abas do navegador na mesma origem.

### Proteções de Criptografia Rápida e Ofuscação:
* **Codificação Base64:** Os blocos estruturais JSON de tarefas, feriados e portfólio são codificados em base64. Embora base64 não seja um algoritmo de criptografia forte, ele eleva a barreira de segurança impedindo a leitura e modificação trivial e imediata de dados usando ferramentas simples de inspeção de strings em memória.
* **Prefixo de Assinatura:** O sistema assina o cache com a marcação `v1:e:`. Se um agente malicioso tentar injetar dados inválidos ou corrompidos sem a estrutura e prefixo apropriados, o interpretador (`decodeCache`) descarta o conteúdo silenciosamente e apaga a memória por inconsistência estrutural, protegendo o estado da aplicação contra travamentos involuntários.

---

## 4. Gerenciamento Seguro de Permissões de Leitura e Escrita

Durante a interação de escrita de arquivos no disco, o navegador web exibe ao usuário uma barra de alerta exigindo a confirmação explícita de gravação. O ProjectGantt:
* **Não realiza escritas ocultas ou em segundo plano.** Toda gravação em disco decorre de uma interação clara (cliques de inclusão, remoção, ou configurações).
* **Indicação Visual Dinâmica:** O sistema exibe de forma evidente o status da pasta de trabalho na UI por meio de um indicador de permissão (`permissionStatus`), permitindo ao usuário revogar o acesso imediatamente fechando o projeto ou limpando a sessão.
