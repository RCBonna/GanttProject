# Guia de Deploy / Distribuição

## 1. Filosofia "Zero-Setup"
O ProjectGantt, na sua iteração atual do arquivo principal (`index.html` e `vue_app.js`), foi arquitetado para não necessitar de processos pesados de build em Node.js por padrão, dependendo unicamente da resolução CDN para buscar os scripts baseados em Vue 3 (Global Build). 

Contudo, observando a estrutura do diretório, existe também um ambiente preparado em `/src` (utilizando Vite). 

Portanto, existem dois modelos formais de "Deploy" ou empacotamento:

## 2. Deploy como Ferramenta Local Autónoma
Nesta modalidade o sistema é executado sem dependência de internet (exceto para requisições na CDN do Vue e fontes do Google se não feito o pre-caching).
1. O usuário descarrega a pasta local do sistema num pen drive, zip ou intranet.
2. Inicia o arquivo `Abrir-gant.bat` se estiver em sistema Windows, o qual invoca via Python um servidor leve na porta 8000.
3. O motivo do script `.bat` iniciar via Python é transpor o bloqueio do navegador conhecido como `CORS` com arquivos manipulados no protocolo `file:///`. O servidor mockado atende à regra de `localhost` e confere privilégios de Contexto Seguro à aplicação.

## 3. Hospedagem via GitHub Pages / Vercel (Opcional)
Sendo composta essencialmente por HTML/CSS/JS, o sistema pode ser alocado num CDN estático.
- **Limitação a Observar:** Se hospedado web, o comportamento será idêntico (ele usará o navegador como máquina de interpretação), contudo os arquivos do projeto (CSVs) não serão hospedados via SFTP/FTP ou git push. O usuário acessará `app.meudominio.com`, e ele será levado à "Empty State" da aplicação, pedindo para selecionar a "Pasta Local" onde seus CSVs vivem.
- Portanto, o app na nuvem funciona puramente como o cliente ou "software de visualização", e os dados continuam fisicamente no disco rígido do cliente.

## 4. Build Moderno via Vite
Caso o projeto seja migrado inteiramente da raiz para a estrutura modularizada dentro de `/src`:
```bash
# 1. Instalar dependências
npm install

# 2. Compilar arquivos de forma minificada para produção
npm run build

# O diretório /dist será gerado. Este deve ser servido pela plataforma de hospedagem.
```
