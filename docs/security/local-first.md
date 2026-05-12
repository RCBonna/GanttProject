# Segurança em Aplicações Local-First

## 1. O Paradoxo da Privacidade
Diferente das plataformas SaaS tradicionais (Software as a Service), o modelo **Local-First** adotado pelo ProjectGantt garante aos usuários a segurança da "Guarda de Chaves" (Key Custody). Nenhum dado do projeto transita pela internet. Os CSVs do usuário e seus planejamentos estratégicos não correm o risco de vazamentos em nuvem, pois não existe um servidor para ser invadido.

## 2. Secure Contexts (HTTPS e Localhost)
O W3C exige que a `File System Access API` funcione apenas sob Contextos Seguros. Isso quer dizer que o aplicativo não rodará sua funcionalidade de salvamento caso seja operado sob o protocolo HTTP em servidores não-locais. 
O aplicativo deve sempre operar sobre HTTPS (em caso de hospedagem web) ou diretamente de `localhost`/`127.0.0.1` durante o desenvolvimento.

## 3. Gestos Intencionais de Autorização (User Gesture Restriction)
Browsers modernos impedem que websites sequestrem o sistema de arquivos. Para que o ProjectGantt consiga permissão de acesso à pasta, o sistema requer obrigatoriamente um clique intencional explícito num elemento de interface. Isso é gerenciado pelo botão "Abrir Pasta" ou "Ativar Sincronização".
Tentativas de recuperar um diretório gravado via código sem o consentimento através de eventos passivos (como `onload` ou `setTimeout`) são interceptados pelas diretrizes de bloqueio.

## 4. Prevenção Cross-Site Scripting (XSS)
Embora não exista um Backend para sofrer Injeção de SQL ou SSRF, a aplicação de frontend deve processar o conteúdo do CSV com sanitização. O Vue 3 já atua de forma rigorosa utilizando interpolação nativa `{{ }}` que converte chaves como tags HTML em entidades de texto seguro, mitigando que strings injetadas no CSV executem scripts maliciosos na máquina.

## 5. Permissões Efêmeras de Sessão
Os sistemas operacionais e browsers tratam a autorização do Handle (`FileSystemDirectoryHandle`) como sensível. Por padrão de segurança, sempre que o navegador ou a aba é fechada por completo, a permissão local de escrita (`readwrite`) é descartada (Silent Revocation).
Para isso, o ProjectGantt usa a estratégia de gravar a referência no `IndexedDB`. No próximo acesso, a aplicação utiliza a referência para abrir um modal de permissão simplificado ao invés de forçar o usuário a vasculhar as pastas via Windows Explorer.
