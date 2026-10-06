# Entrega da evolução MenuFlow

## Resultado

A base agora grava os dados em PostgreSQL e conecta cadastro de estabelecimento, catálogo, checkout, pedidos e atendimento. As telas existentes foram mantidas nas mesmas rotas administrativas, com componentes separados e dados reais.

### Finalizado no ambiente local

- Interface clara com identidade MenuFlow, guia inicial, ajuda prática, controle de abertura no topo e compartilhamento do cardápio.
- Ajustes por assunto e WhatsApp pelo número com DDD; conexão oficial em seção avançada.
- Cadastro, login, sessão HttpOnly, isolamento por merchantId e autorização central para sete perfis.
- Cadastro/edição de categorias, produtos, imagens, grupos de opções e regras de seleção.
- Upload compartilhado para logo, capa, estabelecimento, categoria, produto, perfil e rascunho de campanha. Sharp valida e converte imagens; providers local e S3.
- Galeria futura com ProductImage.
- Cardápio público por slug, busca, destaques, carrinho, observações e checkout em etapas.
- Preços, adicionais, frete, cupom, estoque e total calculados em transação no servidor. Idempotência protegida por hash do conteúdo.
- Pedidos no painel, mudança de status, cancelamento, timeline e atribuição de entregador.
- PDV, mesas com consumo em aberto, clientes/histórico/CSV, caixa, movimentações, cupons e indicadores derivados dos pedidos.
- Link wa.me formatado a partir do pedido confirmado.
- Serviços oficiais Meta, tokens criptografados, webhook assinado, deduplicação, conversas, templates e notificações opcionais.
- Equipe, perfil, auditoria, estados de interface, responsividade e tema escuro.

## Configuração externa e limites

**Não houve envio real à Meta ou a S3:** o ambiente não tinha credenciais desses provedores. Os adapters e endpoints estão implementados; a homologação depende das contas e configurações externas.

Embedded Signup está preparado com tipos, configuração e troca de código no servidor. O login guiado ainda precisa ser integrado ao aplicativo Meta revisado.

Pagamentos são manuais na entrega/retirada. Não há cobrança online, geração automática de Pix ou conciliação automática do caixa. Horários são informativos; abertura e fechamento são manuais. Campanhas são rascunhos com imagem; disparos em massa, cashback e fidelidade não estão habilitados.

O painel carrega até 200 pedidos, a lista de clientes até 500 e cada conversa até 200 mensagens. Para operações maiores, a próxima evolução é paginação e busca no servidor. A busca global atual localiza páginas; não pesquisa todas as entidades.

Uploads abandonados ficam registrados para limpeza posterior. Sessões e rate limits expirados são limpos pelo endpoint interno de manutenção. Notificações em estado incerto exigem reconciliação antes de reenvio. Convites, recuperação de senha e autenticação multifator ainda não fazem parte desta base.

## Migrations criadas e aplicadas

1. 202609290001_baseline: schema original preservado.
2. 202609290002_saas: imagens, autenticação, mensagens, notificações, auditoria, cupons, mesas e movimentações.
3. 202609290003_reliability: hash de idempotência, rascunhos de campanha e persistência de eventos de status.

Não houve db push destrutivo nem exclusão de modelos originais.

## Variáveis de ambiente

Definidas em .env.example:

- DATABASE_URL, APP_URL
- ENCRYPTION_KEY
- S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_PUBLIC_URL
- META_APP_ID, META_APP_SECRET, META_CONFIG_ID, META_GRAPH_API_VERSION, WHATSAPP_WEBHOOK_VERIFY_TOKEN
- CRON_SECRET
- SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD opcionais, sem senha padrão.

As credenciais locais geradas ficam em .env e .local, ignorados pelo Git. Nenhuma credencial real foi adicionada à documentação.

## Como usar agora

Abra /cadastro, crie seu estabelecimento e siga os cartões da página inicial. Cadastre produtos, ajuste entregas e pagamentos em **Ajustes da loja** e toque em **Abrir loja** no topo. Use **Compartilhar cardápio** para copiar o link. A loja /loja/demo contém apenas produtos de exemplo; não há login público padrão para administrá-la.

## Próximos passos externos

1. Configurar PostgreSQL e S3 no ambiente de deploy, com domínio HTTPS e APP_URL correto.
2. Configurar Meta, webhook, template aprovado e homologar com destinatário autorizado.
3. Habilitar apenas as notificações desejadas; agendar processamento da fila.
4. Definir rotinas de backup, retenção de dados, limpeza de uploads e monitoramento.
5. Concluir Embedded Signup após as configurações e aprovação externas.

Consulte README.md para comandos, docs/WHATSAPP-INTEGRATION.md para Meta e docs/DESIGN-SYSTEM.md para os componentes visuais.

## Arquivos

O inventário completo de arquivos criados e alterados está em [FILES-CHANGED.md](FILES-CHANGED.md).

## Validação concluída — 30/09/2026

- npm run typecheck: aprovado.
- npm run lint: aprovado, sem avisos.
- npm test: 12 testes unitários aprovados, incluindo telefone com DDD e país explícito.
- npm run build: aprovado com 41 páginas/rotas geradas ou registradas.
- tests/integration.mjs: 36 verificações HTTP aprovadas, incluindo ajustes rápidos com RBAC e isolamento, upload real, preços no servidor, atribuição de entregador e idempotência concorrente.
- tests/webhook.integration.ts: deduplicação concorrente, isolamento, confirmação do webhook, eventos fora de ordem e persistência de status antecipados aprovados.
- tests/browser.mjs: cadastro, configuração, categoria, produto, checkout em viewport de celular, pedido no painel e mudança de status aprovados no Edge headless. Rotas administrativas abriram sem exceções JavaScript; cardápio sem overflow horizontal no celular.
- npm audit: nenhuma vulnerabilidade reportada. O override de deepmerge-ts 8 corrige a dependência transitiva anterior; Prisma generate e build foram verificados após a mudança.
- prisma migrate status: três migrations aplicadas, banco atualizado.
- /cadastro, /loja/demo e /api/health: HTTP 200 após reiniciar o servidor.

As capturas de inspeção estão em .local/screenshots. O relatório não substitui homologação com credenciais reais de Meta/S3 ou revisão operacional antes de publicar.
