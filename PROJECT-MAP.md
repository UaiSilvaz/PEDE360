# Mapa do projeto

## Rotas públicas

- /cadastro e /entrar: estabelecimento, usuário e sessão.
- /loja/[slug]: catálogo público, opções, carrinho e checkout.
- /api/store/[slug]: dados públicos selecionados explicitamente.
- /api/store/[slug]/orders: orçamento e confirmação com preços do servidor.
- /api/webhooks/whatsapp: challenge e eventos assinados.

## Operação autenticada

/ (indicadores), /pedidos, /pdv, /cardapio, /clientes, /entregas, /mesas, /caixa, /relatorios, /marketing, /whatsapp, /configuracoes, /equipe e /perfil.

Configurações inclui /fretes e /integracoes/whatsapp/templates. APIs verificam sessão, origem e permissão por operação. merchantId vem da sessão e não do navegador.

## Código

- lib/services/orders.ts: transação, preços, opções, estoque, idempotência, histórico e notificações.
- lib/services/pricing.ts: cálculo em centavos.
- lib/security: sessão, senha scrypt, AES-GCM, RBAC e rate limit.
- lib/storage: contrato, provider local, S3 e verificação de propriedade.
- lib/whatsapp: cliente Meta, mensagens, templates, webhooks, notificações e preparação de Embedded Signup.
- components/shared: recurso remoto, skeletons, modal e upload.
- components/storefront.tsx: seleção de opções, carrinho e checkout reutilizado no PDV.
- prisma: schema, baseline, migrations e seed sem indicadores fictícios.
- tests: invariantes, integração HTTP e fluxo em navegador.

## Persistência

Merchant é o tenant existente. Modelos filhos diretos têm merchantId; itens/opções/mensagens herdam o tenant por sua relação com o agregado. Serviços validam relações antes de gravar. Credenciais são selecionadas somente dentro dos serviços de integração.
