# PEDE360

SaaS independente para cardápio digital, pedidos e operação de estabelecimentos. Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Zod, React Hook Form, Lucide e Sonner. O CSS próprio foi preservado e documentado; não foi necessário migrar para Tailwind.

## Iniciar localmente

Requer Node.js 22+ e npm.

```bash
npm install
npm run db:local
```

Mantenha o processo do banco aberto. Ele cria um PostgreSQL real em `.local/postgres`, escuta apenas em 127.0.0.1:55432 e gera credenciais aleatórias em arquivos locais ignorados pelo Git. Não sobrescreve DATABASE_URL existente. No Windows usa pg_ctl; não instala serviço nem cria usuário no sistema.

Em outro terminal:

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
npm run dev
```

- Cadastro do seu estabelecimento: http://localhost:3000/cadastro
- Login por e-mail e senha: http://localhost:3000/entrar
- Landing page: http://localhost:3000
- Painel: http://localhost:3000/painel
- Cardápio de exemplo: http://localhost:3000/loja/demo
- Seu cardápio: /loja/SEU-SLUG

Após cadastrar, crie categorias/produtos, configure fretes e pagamentos e toque em **Abrir loja** no topo do painel. Não há senha administrativa padrão. O seed cria apenas produtos demonstrativos, sem pedidos, clientes ou indicadores fictícios. Opcionalmente configure SEED_OWNER_EMAIL e SEED_OWNER_PASSWORD antes do seed para criar o primeiro proprietário da demo.

## PostgreSQL existente

Copie `.env.example` para `.env` e configure DATABASE_URL. Não execute `db:local` se já usa outro servidor.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

As migrations são incrementais. A primeira registra o schema original; as seguintes adicionam os recursos SaaS. Se um banco já contém exatamente o schema original, faça backup, compare com `prisma/baseline.prisma` e registre a baseline com `npx prisma migrate resolve --applied 202609290001_baseline` antes do deploy. Não marque a baseline em um banco vazio. Não use db push para migrar dados de produção.

## Storage

Para Supabase Storage, crie um bucket público exclusivo para as imagens do cardápio e gere credenciais S3 nas configurações de Storage. Configure na Vercel (Production):

```dotenv
S3_ENDPOINT="https://SEU_PROJECT_REF.storage.supabase.co/storage/v1/s3"
S3_REGION="REGIAO_DO_PROJETO"
S3_ACCESS_KEY_ID="CREDENCIAL_S3"
S3_SECRET_ACCESS_KEY="SEGREDO_S3"
S3_BUCKET="pede360-images"
S3_PUBLIC_URL="https://SEU_PROJECT_REF.supabase.co/storage/v1/object/public/pede360-images"
```

Use as credenciais S3 geradas para o servidor e a região exibida pelo Supabase. O cliente usa `forcePathStyle` para manter o bucket no caminho do endpoint. Após configurar, faça um redeploy. A conexão `DATABASE_URL` pode continuar na Neon.

- Desenvolvimento: sem variáveis S3, arquivos WebP ficam em `.local/uploads` e são servidos pela rota local de mídia.
- Produção: configure todas as variáveis S3 de `.env.example`. Compatível com R2 e provedores S3. O bucket precisa permitir leitura pública pelo domínio configurado; credenciais de escrita ficam somente no servidor.
- JPEG/PNG/WebP até 5 MB, validação com Sharp, orientação corrigida, proporção preservada, limite de resolução e metadados removidos.
- Produtos são limitados a 1200×1200, capas a 1920×1200, qualidade 83.
- O banco armazena URL e chave. Imagem antiga é removida após salvar a nova referência. Falhas de limpeza não desfazem o salvamento.
- Uploads abandonados antes de salvar permanecem como MediaAsset. Programe limpeza com período de carência e verificação de referências. Não apague o bucket indiscriminadamente.

## WhatsApp

Há link wa.me sem API e integração oficial Meta Cloud API. Leia [a configuração completa](docs/WHATSAPP-INTEGRATION.md). Nenhum envio ou conexão é simulado.

Configure o número em Configurações para oferecer **Enviar pedido pelo WhatsApp** após o checkout. O cliente abre a conversa e confirma o envio.

Para API oficial, configure ENCRYPTION_KEY, META_GRAPH_API_VERSION, META_APP_SECRET e WHATSAPP_WEBHOOK_VERIFY_TOKEN. Depois informe WABA ID, Phone Number ID e token na tela de integração. Tokens ficam criptografados com AES-256-GCM e nunca são retornados ao navegador.

## Funcionalidades

- Landing page PEDE360 com demonstração interativa, imagens e trilha instrumental original.
- Personalização do cardápio com cores, fontes, negrito, itálico, formatos e prévia ao vivo.

- Cadastro de estabelecimento, autenticação, equipe e sete papéis com autorização centralizada.
- Logo, capa, imagens de estabelecimento, produto, categoria, perfil e rascunho de campanha.
- CRUD de categorias e produtos; grupos de opções, mínimos/máximos, destaque e disponibilidade.
- Cardápio por slug, busca, categorias, carrinho, observações, entrega/retirada e checkout em etapas.
- Preços, adicionais, frete e cupom calculados no servidor. Transação com estoque, idempotência e histórico.
- PDV com entrega, retirada, mesa e retirada agendada; vínculo opcional com conversa.
- Pedidos com atualização a cada 5 segundos, filtros, detalhe, timeline e cancelamento.
- Clientes e exportação CSV; entregadores; mesas; caixa e movimentações; cupons; relatórios derivados dos pedidos.
- Conversas WhatsApp, assinatura de webhook, deduplicação, estados de entrega/leitura e templates da Meta.
- Notificações opcionais com consentimento e fila persistida.
- Auditoria, tema escuro e atalho Ctrl/Cmd+K para localizar páginas.

## Limites explícitos

Pagamentos são combinados na entrega/retirada; não há cobrança online nem Pix automático. O saldo do caixa considera abertura e movimentações registradas, sem conciliação automática. Horários cadastrados são informativos; abrir/fechar é um controle manual. Campanhas são rascunhos, sem disparo em massa. Cashback, fidelidade, impressão e CRM avançado são evoluções futuras.

Embedded Signup tem tipos, serviço de troca de código e indicação de configuração; ainda depende da implementação do login Meta aprovado para disponibilizar conexão guiada. O modo por credenciais está implementado.

## Verificar

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Com banco e servidor de desenvolvimento ativos:

```bash
node --env-file=.env tests/integration.mjs
node --env-file=.env tests/browser.mjs
```

O teste de navegador usa Microsoft Edge headless no Windows e gera capturas em `.local/screenshots`. Os testes criam estabelecimentos isolados com nomes aleatórios e os removem ao finalizar. Não apontar esses testes para produção.

## Deploy

1. Provisione PostgreSQL, storage S3 e domínio HTTPS.
2. Configure as variáveis de ambiente no servidor. APP_URL deve ser a origem pública exata; a validação de origem protege operações de escrita.
3. Execute `npm ci`, `npm run db:migrate`, `npm run build` e `npm start`.
4. O ambiente deve oferecer runtime Node.js com Sharp e acesso ao banco. O fallback de arquivos locais é desabilitado em produção.
5. Configure limite de corpo de requisição no proxy, rate limit na borda, backups, monitoramento e retenção de dados conforme sua operação.
6. Agende POST /api/internal/notifications com `Authorization: Bearer CRON_SECRET` para processar pendências e limpar sessões/buckets expirados. Envios incertos não são reenviados automaticamente para evitar duplicação.
7. Configure webhook HTTPS na Meta e valide os envios com números autorizados antes de habilitar notificações reais.

Consulte [auditoria](docs/AUDIT.md), [design system](docs/DESIGN-SYSTEM.md), [integração WhatsApp](docs/WHATSAPP-INTEGRATION.md) e [entrega e limitações](docs/IMPLEMENTATION.md).
