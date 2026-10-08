# Integração WhatsApp

## 1. Link wa.me

Em Configurações, informe número com código do país e DDD (ex.: 5517999999999). Após confirmar o pedido no banco, o cliente recebe o botão **Enviar pedido pelo WhatsApp**. A mensagem contém código, itens, opções, observações, valores calculados pelo servidor, cliente, endereço e pagamento. O texto usa encodeURIComponent; o link não envia nada sozinho.

## 2. Meta WhatsApp Cloud API

### Configuração externa necessária

1. Criar/configurar um aplicativo Meta com produto WhatsApp e WABA.
2. Vincular um número autorizado, registrar o número conforme o fluxo da Meta e obter Phone Number ID.
3. Emitir token com permissões whatsapp_business_messaging e whatsapp_business_management adequadas. O usuário do sistema precisa ter acesso à WABA.
4. Definir META_GRAPH_API_VERSION para uma versão suportada no painel do aplicativo. Nenhuma versão fica espalhada pelo código.
5. Para aplicativos próprios dos lojistas, informar o segredo do aplicativo na conexão da loja. O servidor gera um token de verificação por loja. META_APP_SECRET e WHATSAPP_WEBHOOK_VERIFY_TOKEN continuam opcionais para o endpoint compartilhado legado.
6. Gerar ENCRYPTION_KEY com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Armazenar no gerenciador de segredos do deploy; não registrar no Git.
7. Na tela Configurações → Integrações → WhatsApp, informar WABA ID, Phone Number ID, token de acesso e segredo do aplicativo. A conexão consulta o número, valida vínculo com a WABA e solicita inscrição do aplicativo. O segredo e o token de acesso são criptografados.
8. Configurar no painel Meta a URL de callback **/api/webhooks/whatsapp/SEU-SLUG** e o token de verificação exibidos na conexão da loja. Assinar o evento **messages**. Cada callback valida a assinatura com o segredo daquela loja e aceita somente eventos do seu número.
9. Executar teste com destinatário autorizado e template aprovado.

O endpoint GET responde ao challenge somente quando modo/token conferem. POST valida X-Hub-Signature-256 com HMAC-SHA256 sobre o corpo original. O estado “webhook verificado” só é marcado após receber um evento assinado correspondente à WABA e ao número daquela loja.

### Credenciais

O token digitado é enviado uma vez ao backend por HTTPS. É criptografado com AES-256-GCM antes de gravar. Endpoints de consulta usam select explícito e não retornam o token nem sua forma criptografada. Não usamos localStorage para credenciais. Guarde backup seguro da chave de criptografia; trocar a chave sem migrar os tokens exige reconectar as integrações.

### Mensagens e templates

Texto livre exige mensagem recebida nas últimas 24 horas. Fora da janela, use template aprovado pela Meta. O endpoint de templates mostra nome, idioma, categoria e status retornados pela API, sem aprovação local.

A central /whatsapp recebe mensagens textuais. Outros tipos são registrados com identificação do tipo; download/renderização de mídias recebidas é uma extensão futura. As últimas 200 mensagens da conversa são carregadas. Status são monotônicos e webhooks repetidos são deduplicados; eventos de status precoces são persistidos para reconciliação.

As mensagens manuais passam pelo backend protegido e deixam registro. “Enviada” significa que a Meta aceitou o envio; delivered/read/failed dependem dos eventos recebidos.

### Notificações de pedidos

Todas as opções começam desativadas. O checkout pergunta se o cliente aceita atualizações. Apenas eventos habilitados e clientes com consentimento geram envio.

A transação de pedido cria NotificationJob. O processamento usa o texto livre dentro da janela ou template fora dela. Para o template automático, configure três parâmetros de corpo nesta ordem: nome, código do pedido e status, sem componentes extras obrigatórios. A aprovação precisa existir na Meta.

O processamento ocorre após a resposta HTTP e também pode ser chamado por cron em POST /api/internal/notifications, protegido por CRON_SECRET. Falhas ficam visíveis na configuração. Estados PROCESSING após interrupção ou FAILED por timeout exigem reconciliação antes de qualquer reenvio; reenviar às cegas pode duplicar mensagens.

### Desconexão

Desconectar apaga o token armazenado e desativa a integração local. O histórico permanece. Revogue também o token no painel Meta se desejar invalidá-lo externamente. A inscrição de aplicativo na WABA não é removida automaticamente, pois pode ser compartilhada com outros números.

## 3. Embedded Signup para SaaS

Há configuração pública sem segredos, tipos, schema de retorno e função server-only exchangeSignupCode. A tela explica a configuração necessária.

Para concluir o fluxo guiado:

1. Configurar META_APP_ID, META_CONFIG_ID e META_APP_SECRET.
2. Concluir verificação do negócio, permissões avançadas/App Review e requisitos de provedor aplicáveis no painel Meta.
3. Configurar domínios, redirect URIs e fluxo de Facebook Login for Business.
4. Integrar SDK de login com validação de origem dos eventos, estado anti-CSRF e callback de código de uso único.
5. Trocar código no backend, validar WABA/Phone Number ID contra os recursos autorizados, registrar número quando exigido e salvar a integração criptografada.
6. Homologar o fluxo com um estabelecimento de teste antes de disponibilizar a conexão guiada.

Esta fase não é apresentada como concluída. A conexão manual com credenciais oficiais já usa os serviços funcionais.

## Referências oficiais

- [WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp)
- [Webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint)
- [Coleção oficial Meta: templates](https://www.postman.com/meta/whatsapp-business-platform/folder/lczy75a/templates)
- [Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview)

O projeto não usa sessões de navegador, QR de WhatsApp Web, scraping nem bibliotecas de integração não oficiais.

## Resposta automática com cardápio

Em Configurações → Integrações → WhatsApp, o lojista pode editar, visualizar e salvar a mensagem com o link do seu cardápio, ativar ou desativar as respostas e acompanhar a fila. A configuração é específica do estabelecimento e exige permissão de configurações. A mensagem pode ser preparada antes da conexão; a tela indica quando os envios estão aguardando conexão. Conectar a Meta atualiza o telefone da loja para o número verificado pela API.

Defina APP_URL com a origem publica HTTPS do site. O servidor acrescenta /loja/{slug} a mensagem. Eventos assinados de clientes, inclusive audio e imagem, geram uma tarefa persistente por mensagem recebida; eventos de status e eventos de sistema nao geram resposta. Reentregas do mesmo evento nao geram outra tarefa. Clientes novos nao precisam de cadastro previo.

Execute `npm run db:migrate` antes de iniciar a versão nova. O webhook inicia o processamento após responder à Meta. O workflow `.github/workflows/process-whatsapp.yml` chama POST `/api/internal/auto-replies` a cada cinco minutos com o segredo `PEDE360_CRON_SECRET`, cujo valor deve corresponder ao `CRON_SECRET` da Vercel. Os horários do GitHub podem sofrer atrasos. O processamento limita o lote e o tempo de execução, preserva tarefas pendentes e retenta somente recusas explícitas da API. A tela permite processar a fila da própria loja. O endpoint de notificações de pedidos permanece disponível separadamente.

Envios interrompidos ou falhas ambiguas de rede ficam FAILED para conferencia, pois a Meta pode ter aceitado a mensagem antes da interrupcao. Nao existe garantia de exatamente um envio entre sistemas externos em caso de perda de resposta. SENT significa aceito pela Meta; a entrega efetiva aparece no historico de conversas via webhook de status.

Validação real: conecte a loja, configure a callback e o token exibidos na tela e o evento messages na Meta. Envie texto e áudio de outro telefone, confira a resposta e abra o link. Edite a mensagem e repita. Desative a resposta e confirme que nenhuma nova tarefa é criada. Credenciais reais e domínio público são necessários para esse teste; salvar a configuração sem conexão não comprova envio externo.

Testes locais: `npm test`, `node --env-file=.env --import tsx tests/webhook.integration.ts`, `node --env-file=.env --conditions=react-server --import tsx tests/auto-reply.integration.ts` e `node --env-file=.env --conditions=react-server --import tsx tests/merchant-webhook.integration.ts`. Usam PostgreSQL real e API Meta simulada, sem enviar mensagens externas.
