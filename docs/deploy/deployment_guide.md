# Guia de Operação, Implantação e Deploy

Este documento orienta os desenvolvedores e administradores de sistemas sobre o processo de inicialização do servidor de desenvolvimento local, requisitos imperativos de segurança para hospedagem corporativa e etapas de implantação em servidores de produção.

---

## 1. Servidor de Desenvolvimento Local: Vite

Embora o ProjectGantt utilize uma arquitetura baseada em CDN para carregar suas bibliotecas (Vue 3, jsPDF, html2canvas) diretamente no navegador, o uso de um servidor de desenvolvimento local estático é **mandatório**.

### Por que um Servidor Estático é Necessário?
As especificações modernas de segurança dos navegadores restringem APIs poderosas de acesso ao sistema (como `window.showDirectoryPicker` e IndexedDB) apenas para **Contextos Seguros (Secure Contexts)**.
* Se você tentar abrir o arquivo `index.html` diretamente arrastando-o para o navegador (`file:///c:/.../index.html`), o navegador bloqueará o acesso às APIs do File System Access, forçando o aplicativo a rodar sob o modo fallback volátil de LocalStorage.
* A execução por meio de um servidor local resolve essa restrição, visto que `http://localhost` e `http://127.0.0.1` são considerados caminhos seguros por definição pelas diretrizes da W3C.

### Como Executar Localmente:
A configuração utiliza o **Vite** estático configurado em `vite.config.js` para servir os arquivos estáticos com suporte nativo a Hot Module Replacement (HMR).

1. **Instalação das dependências de desenvolvimento:**
   ```bash
   npm install
   ```
2. **Execução do servidor local:**
   ```bash
   npm run dev
   ```
   *O console gerará o endereço de acesso, normalmente `http://localhost:5173` ou `http://localhost:3000`.*

---

## 2. Requisito Crítico: Contexto Seguro e Origens (HTTPS)

Para disponibilizar o ProjectGantt em ambiente de produção para usuários de uma rede corporativa ou internet pública, a infraestrutura de hospedagem **deve configurar obrigatoriamente um certificado SSL ativo**.

```
❌ http://meu-gantt-interno.empresa.com.br/ -> Acesso BLOQUEADO à API de Gravação Física
   (Apenas o fallback localStorage funcionará)

✅ https://meu-gantt-interno.empresa.com.br/ -> Acesso LIBERADO nativamente
```

---

## 3. Guia de Implantação em Ambientes Estáticos (Zero Overhead)

Como a aplicação é constituída puramente de assets estáticos gerados inteiramente no lado do cliente (Client-Side), a implantação possui custo financeiro e operacional praticamente **zero**. Não há processos em node.js rodando ativamente no servidor, reduzindo o consumo de CPU da infraestrutura de hospedagem a zero.

### Lista de Arquivos para Distribuição (Build Bundle):
Para realizar a distribuição manual ou automatizada, basta empacotar e copiar os seguintes arquivos contidos na raiz do workspace para o diretório raiz do servidor web de destino:
* `index.html` (Template reativo principal)
* `vue_app.js` (Motor e controlador de negócios do Gantt)
* `style.css` (Visual, design tokens e grid de estilo)
* Pasta `/public` (Imagens, ícones e assets estáticos)

### Plataformas de Hospedagem Estática Recomendadas:
A implantação ocorre de forma imediata em qualquer provedor de hospedagem de páginas estáticas modernas.

#### A. Vercel / Netlify / Cloudflare Pages (Deploy Automático via GitHub)
1. Conecte o repositório Git à plataforma.
2. Defina os parâmetros de Build:
   * **Build Command:** *Deixar em branco* (não há passo de compilação).
   * **Output Directory:** `./` (ou a pasta raiz que contém `index.html`).
3. Clique em Deploy. As plataformas fornecem certificados SSL automáticos (HTTPS) nativamente.

#### B. Servidor Web Interno (Apache / NGINX / IIS)
1. Transfira a lista de arquivos estáticos via SFTP ou pipelines de CI/CD (GitHub Actions / GitLab CI) para a pasta de distribuição padrão (ex: `/var/www/html/` ou `C:\inetpub\wwwroot\`).
2. **Configuração NGINX (Exemplo de Servidor Seguro):**
   ```nginx
   server {
       listen 443 ssl;
       server_name gantt.suaempresa.com;

       ssl_certificate /etc/ssl/certs/gantt.crt;
       ssl_certificate_key /etc/ssl/private/gantt.key;

       location / {
           root /usr/share/nginx/html;
           index index.html;
           try_files $uri $uri/ =404;
       }
   }
   ```

---

## 4. Limitações e Compatibilidade de Navegadores (FSA API)

Durante o deploy para a corporação, certifique-se de instruir os usuários finais sobre o uso de navegadores web adequados:

* **Navegadores Totalmente Compatíveis (Recomendados):** Google Chrome, Microsoft Edge, Brave, Opera, e demais navegadores baseados no motor Chromium (versão 86+).
* **Navegadores Limitados (Modo Fallback Ativado):** Mozilla Firefox e Apple Safari. Devido a decisões internas de design de segurança desses motores, a API `showDirectoryPicker` não está habilitada de forma nativa por padrão. A aplicação rodará de forma estável sob contingência LocalStorage nesses ambientes.
