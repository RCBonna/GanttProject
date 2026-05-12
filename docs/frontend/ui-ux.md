# UI e UX (Frontend)

## 1. Visão Geral do Frontend
O frontend do **ProjectGantt** foi projetado para oferecer uma experiência "Premium" e profissional de gestão de projetos. Desenvolvido primariamente em Vue 3, ele enfatiza alta performance na renderização de centenas de nós DOM na área do gráfico e responsividade na interação de dados.

## 2. Tecnologias Visuais e Tematização (Design Tokens)
- O sistema utiliza **CSS Variables** no seletor `:root` para gerenciar a paleta de cores.
- O tema foi cuidadosamente elaborado utilizando gradientes ricos e cores sólidas semânticas (sucesso, aviso, perigo).
- **Dark Mode Nativo:** A aplicação opera nativamente com tons escuros (Dark Theme), comutável para um tema claro (`data-theme="light"`) via injeção dinâmica no body.
- Elementos chave do layout: Header flutuante, barra de estatísticas global, listagem estática de tarefas (Task List) e área deslizante de Gantt.

## 3. Gestão da Grid do Gráfico
A renderização do gráfico é o coração da UI. A área de visualização (`Chart Area`) utiliza:
- Largura das colunas (`colWidth`) configurável dinamicamente com base no `zoomLevel` (Dia, Semana, Mês).
- Marcação explícita no CSS para fins de semana (`weekend`) e Feriados customizados (`holiday`), mudando sutilmente a cor de fundo das colunas.
- Elementos renderizados em posicionamento absoluto (`absolute`) baseados no cálculo em pixels da distância entre a data inicial do projeto e a data inicial da tarefa.

## 4. Otimizações de UX e Componentes Exclusivos
- **Toasts de Notificação Customizados:** Em vez de usar `alert` do navegador, o sistema exibe cards fluídos que entram e saem via animação CSS (slideInRight / fadeOut).
- **Caixas de Diálogo (`customDialog`):** O sistema não usa `prompt` ou `confirm` nativos, mantendo a coesão de estilo através de modais customizados gerenciados pelo estado do Vue (`App.setup()`).
- **Resizer:** Um handler que permite ajustar a largura do painel esquerdo da lista de tarefas, melhorando a adaptabilidade à resolução de monitores ultrawide ou notebooks menores.
- **Micro-interações:** Barras do gráfico aumentam de brilho ao `hover`, exibem tooltips instantâneas que não interferem no DOM e marcos (Milestones) giram ao entrar na tela.
- **Sincronização de Scroll:** O evento `@scroll` da Chart Area é escutado para garantir que os elementos absolutos sejam desenhados e que tooltips sejam ocultados durante a movimentação.
