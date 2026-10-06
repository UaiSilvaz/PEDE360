import { z } from "zod";
export const orderSchema = z
  .object({
    idempotencyKey: z.uuid(),
    type: z.enum(["DELIVERY", "PICKUP", "TABLE", "SCHEDULED"]),
    conversationId: z.string().optional(),
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .regex(
        /^\+?[1-9]\d{9,14}$/,
        "Informe o telefone com código do país e DDD.",
      ),
    cpf: z
      .string()
      .regex(/^\d{11}$/)
      .or(z.literal(""))
      .optional(),
    street: z.string().max(180).default(""),
    number: z.string().max(20).default(""),
    complement: z.string().max(100).default(""),
    neighborhood: z.string().max(100).default(""),
    reference: z.string().max(180).default(""),
    deliveryZoneId: z.string().optional(),
    tableNumber: z.string().max(20).optional(),
    scheduledAt: z.iso.datetime().optional(),
    paymentMethod: z.enum([
      "Pix",
      "Dinheiro",
      "Crédito",
      "Débito",
      "Vale-refeição",
    ]),
    cashChangeFor: z.number().min(0).max(100000).optional(),
    coupon: z.string().trim().max(40).default(""),
    notes: z.string().max(1000).default(""),
    whatsappConsent: z.boolean().default(false),
    items: z
      .array(
        z
          .object({
            productId: z.string(),
            quantity: z.number().int().min(1).max(99),
            optionIds: z.array(z.string()).max(100).default([]),
            notes: z.string().max(500).default(""),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((o, ctx) => {
    if (
      o.type === "DELIVERY" &&
      (!o.street.trim() ||
        !o.number.trim() ||
        !o.neighborhood.trim() ||
        !o.deliveryZoneId)
    )
      ctx.addIssue({
        code: "custom",
        message: "Preencha o endereço e selecione a região de entrega.",
      });
    if (o.type === "TABLE" && !o.tableNumber)
      ctx.addIssue({ code: "custom", message: "Informe a mesa." });
    if (
      o.type === "SCHEDULED" &&
      (!o.scheduledAt || new Date(o.scheduledAt) <= new Date())
    )
      ctx.addIssue({
        code: "custom",
        message: "Escolha uma data futura para retirada.",
      });
  });
export type OrderInput = z.infer<typeof orderSchema>;
