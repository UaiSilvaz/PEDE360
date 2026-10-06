# Design system MenuFlow

## Identidade

Gestão clara e cardápio acolhedor. A versão atual se inspira na familiaridade das conversas do WhatsApp: superfícies claras, verde, balões e instruções curtas. MenuFlow mantém marca, composição e ícones próprios, com símbolos Lucide. Produtos sem foto mostram uma superfície com a marca.

## Tokens

| Token        | Claro   | Uso                   |
| ------------ | ------- | --------------------- |
| --green      | #008568 | ação principal        |
| --green-dark | #006e56 | hover e texto de ação |
| --green-soft | #e5f5ee | seleção e realce      |
| --sidebar    | #ffffff | navegação clara       |
| --bg         | #f6f8f7 | fundo                 |
| --panel      | #ffffff | superfície            |
| --text       | #243c35 | texto                 |
| --muted      | #667970 | texto auxiliar        |
| --border     | #e2ebe6 | divisores             |
| --red        | #dc2626 | erros e cancelamento  |

Tema escuro usa data-theme em html e substitui os tokens. A preferência, sem informações de conta, é salva no navegador.

## Tipografia e espaço

Fontes do sistema com ui-sans-serif, system-ui e Segoe UI. Títulos de página 26px; títulos de seção 18–20px; texto 13–14px; legendas 11–12px. Espaçamentos recorrentes de 4, 8, 12, 16, 24 e 32px. Não dependemos de download de fonte externa.

## Componentes

- Botão primário sólido para salvar, avançar ou confirmar.
- Botão com borda para ações secundárias.
- Ação destrutiva com texto vermelho e confirmação antes de cancelar/remover.
- Inputs com rótulo visível, borda de 1px, raio de 9px e foco destacado.
- Cards com raio de 13–14px; diálogos com 18px.
- Sombras leves nas superfícies e forte separação nos diálogos.
- Status com texto, além da cor. Erros com role=alert.
- Toasts Sonner para resultados; skeletons e estados vazios para carregamento e ausência de registros.
- Dialog nativo mantém foco e permite Escape. Botões de ícone têm nome acessível.
- Imagens usam object-fit e textos alternativos. Não se distorce a proporção.

## Layout

Admin: sidebar clara de 256px no desktop, menu recolhível em tablet/celular. Navegação por dia a dia, negócio e ajustes. Início com guia de configuração baseado nos dados salvos. Abertura e pausa de pedidos no topo, com confirmação ao pausar. Compartilhamento copia o link e oferece uma prévia do cardápio. Cards em três ou uma coluna conforme a largura. Cardápio: prioridade ao celular, largura máxima de 720px, categorias horizontais, carrinho flutuante e checkout em diálogo.

Arquivos: app/globals.css preserva os estilos da base; app/saas.css contém os componentes operacionais; app/friendly.css define a identidade atual e a adaptação dos componentes compartilhados. O tema usa os mesmos tokens entre as páginas.

## Ajustes para quem não é técnico

- Minha loja, Fotos e marca, Horários e Pagamentos têm descrições e exemplos.
- O endereço do cardápio é sugerido durante o cadastro e pode ser ajustado.
- Telefone brasileiro aceita DDD e pontuação; números internacionais usam + e país.
- WhatsApp começa pelo número. O cliente precisa tocar para enviar o resumo; não há envio automático nessa modalidade.
- A conexão oficial e credenciais da Meta ficam em uma seção recolhida. Automação continua dependendo da configuração externa.
- Ajuda contextual explica abertura, botões bloqueados, produtos e entregas.

## Movimento e acessibilidade

Transições curtas, foco visível e suporte a prefers-reduced-motion. Mensagens de erro indicam a ação necessária. Validar teclado, contraste e leitores de tela antes de uma liberação pública ampla.
