import { menuAppearanceSchema } from "@/lib/menu-appearance";
import { z } from "zod";
import { phoneSchema } from "@/lib/phone";
export const imageFields = {
  imageUrl: z.string().max(2000).nullable().optional(),
  imageKey: z.string().max(500).nullable().optional(),
};
export const optionGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    min: z.number().int().min(0).max(30),
    max: z.number().int().min(1).max(30),
    required: z.boolean(),
    options: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          price: z.number().min(0).max(10000),
          active: z.boolean().default(true),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine(
    (g) =>
      g.max >= g.min &&
      g.min <= g.options.filter((o) => o.active).length &&
      (!g.required || g.options.some((o) => o.active)),
    "Regras de seleção inválidas.",
  );
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(1000).default(""),
  price: z.number().positive().max(100000),
  categoryId: z
    .string()
    .nullable()
    .transform((value) => value || null),
  active: z.boolean(),
  featured: z.boolean(),
  ...imageFields,
  optionGroups: z.array(optionGroupSchema).max(15).default([]),
});
export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  active: z.boolean().default(true),
  ...imageFields,
});
export const merchantSchema = z.object({
  deliveryState: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .or(z.literal(""))
    .nullish(),
  deliveryCityId: z
    .string()
    .regex(/^\d{7}$/)
    .or(z.literal(""))
    .nullish(),
  appearance: menuAppearanceSchema.optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  phone: z.union([z.literal(""), phoneSchema]).nullable(),
  description: z.string().max(1000),
  address: z.string().max(500),
  estimatedTime: z.string().max(80),
  deliveryMinimum: z.number().min(0),
  pickupMinimum: z.number().min(0),
  isOpen: z.boolean(),
  logoUrl: z.string().nullable(),
  logoKey: z.string().nullable(),
  coverUrl: z.string().nullable(),
  coverKey: z.string().nullable(),
  ...imageFields,
  paymentMethods: z
    .array(z.enum(["Pix", "Dinheiro", "Crédito", "Débito", "Vale-refeição"]))
    .min(1),
  hours: z
    .array(
      z.object({
        day: z.string(),
        open: z.string(),
        close: z.string(),
        closed: z.boolean(),
      }),
    )
    .max(7)
    .optional(),
});
