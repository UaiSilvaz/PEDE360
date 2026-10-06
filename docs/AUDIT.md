# Auditoria inicial — 29/09/2026

Foram lidos README, mapa, prompt, schema, todos os arquivos de app, components e lib antes das alterações.

## Base encontrada

- Next.js 16 / React 19 / TypeScript estrito, CSS próprio e Lucide.
- 13 telas administrativas/públicas com dados em `lib/data.ts`. Nenhuma persistência em uso.
- Prisma já modelava Merchant, User, produtos, opções, pedidos, clientes, entregadores, regiões e caixa. Não havia migrations ou autenticação.
- Checkout, salvar configurações, cadastrar produtos e diversas ações eram botões sem implementação.
- Preços e status mudavam somente no navegador. Loja pública limitada à rota demo.
- `next lint` deixou de ser suportado; será substituído pelo ESLint CLI.
- Nenhuma fotografia, logo ou asset proprietário foi encontrado. Referências nominais em documentação serão removidas.
- PostgreSQL, storage externo e credenciais Meta não estavam configurados.

## Decisões

Preservar Merchant/merchantId como tenant para evitar renomear relações existentes. Expandir os modelos por migration incremental. Manter CSS e componentes visuais atuais, extraindo formulários e serviços. Usar sessão opaca em cookie HttpOnly, preços em centavos no cálculo e Decimal no banco. Arquivos locais apenas em desenvolvimento; S3 em produção. Não simular pagamentos nem conexão Meta.

## Mapa

`app/api`: contratos HTTP e autorização; `lib/services`: transações; `lib/schemas`: validação; `lib/storage`: providers; `lib/whatsapp`: Meta e webhooks; `lib/security`: sessão, criptografia e RBAC; `components`: formulários e fluxos interativos; `prisma`: persistência e migrations.
