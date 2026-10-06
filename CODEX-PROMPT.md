# Orientações para evoluir MenuFlow

Leia README.md, PROJECT-MAP.md, docs/AUDIT.md, docs/IMPLEMENTATION.md e prisma/schema.prisma antes de modificar o projeto. Preserve os fluxos funcionais.

- Manter a implementação independente, marca, textos e componentes próprios.
- Merchant/merchantId representam o tenant existente.
- Toda API administrativa precisa de authorize e permissão central.
- Validar JSON com Zod e retornar o envelope de lib/api.ts.
- Usar transações para pedidos; preços, fretes e descontos vêm do servidor.
- Nunca retornar tokens ou consultar dados de outro tenant.
- Upload passa pelo provider e verificação de propriedade.
- WhatsApp somente por API oficial; sem credenciais, indicar configuração necessária.
- Migrations incrementais; não usar db push em bases existentes.
- Verificar TypeScript, ESLint, testes relevantes e build.
- Documentar dependências externas e limitações reais; não substituir integração ausente por mock silencioso.

Evoluções: pagamentos online e conciliação, ciclo de vida de mídias não utilizadas, recuperação de senha/convites, controle de horários automático, paginação avançada, impressão e conclusão do login Embedded Signup após homologação externa.
