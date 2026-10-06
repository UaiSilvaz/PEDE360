# Integração WhatsApp

## 1. Link wa.me

Em Configurações, informe número com código do país e DDD (ex.: 5517999999999). Após confirmar o pedido no banco, o cliente recebe o botão **Enviar pedido pelo WhatsApp**. A mensagem contém código, itens, opções, observações, valores calculados pelo servidor, cliente, endereço e pagamento. O texto usa encodeURIComponent; o link não envia nada sozinho.

## 2. Meta WhatsApp Cloud API

### Configuração externa necessária

1. Criar/configurar um aplicativo Meta com produto WhatsApp e WABA.
2. Vincular um número autorizado, registrar o número conforme o fluxo da Meta e obter Phone Number ID.
3. Emitir token com permissões whatsapp_business_messaging e whatsapp_business_management adequadas. O usuário do sistema precisa ter acesso à WABA.
4. Definir META_GRAPH_API_VERSION para uma versão suportada no painel do aplicativo. Nenhuma versão fica espalhada pelo código.
5. Definir META_APP_SECRET e um WHATSAPP_WEBHOOK_VERIFY_TOKEN aleatório.
6. Gerar ENCRYPTION_KEY com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Armazenar no gerenciador de segredos do deploy; não registrar no Git.
7. Na tela Configurações → Integrações → WhatsApp, informar WABA ID, Phone Number ID e token. A conexão consulta o número, valida vínculo com a WABA e solicita inscrição do aplicativo.
8. Configurar a callback HTTPS **/api/webhooks/whatsapp** no painel Meta e assinar os eventos de mensagens.
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
