import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json, sameOrigin } from "@/lib/api";
import { hashPassword } from "@/lib/security/password";
import { createSession } from "@/lib/security/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { phoneSchema } from "@/lib/phone";
import { after } from "next/server";
import { deliveryRegion, municipality } from "@/lib/geography/catalog";
import { prepareDirectory } from "@/lib/geography/directory";
export const maxDuration = 300;
const schema = z
  .object({
    phone: phoneSchema.optional(),
    deliveryState: z.string().regex(/^[A-Z]{2}$/),
    deliveryCityId: z.string().regex(/^\d{7}$/),
    deliveryFee: z.number().min(0).max(1000).default(0),
    autoReplyMessage: z
      .string()
      .trim()
      .min(1)
      .max(3000)
      .default("Olá! Confira nosso cardápio e faça seu pedido:"),
    name: z.string().trim().min(2).max(120),
    store: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .min(3)
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .superRefine((input, context) => {
    if (municipality(input.deliveryCityId)?.state !== input.deliveryState)
      context.addIssue({
        code: "custom",
        path: ["deliveryCityId"],
        message: "Escolha uma cidade do estado selecionado.",
      });
  });
export const POST = endpoint(async (request) => {
  sameOrigin(request);
  const input = schema.parse(await json(request));
  await rateLimit("register:global", 100, 3600);
  await rateLimit("register:" + input.email, 5, 3600);
  const merchant = await db.merchant.create({
    data: {
      name: input.store,
      slug: input.slug,
      isOpen: false,
      phone: input.phone,
      autoReplyEnabled: true,
      autoReplyMessage: input.autoReplyMessage,
      ...deliveryRegion(input.deliveryState, input.deliveryCityId),
      deliveryZones: {
        create: { name: "Toda a cidade", fee: input.deliveryFee },
      },
      users: {
        create: {
          name: input.name,
          email: input.email,
          password: hashPassword(input.password),
          role: "OWNER",
        },
      },
      notifications: { create: {} },
    },
    include: { users: true },
  });
  await createSession(merchant.users[0].id);
  after(() => prepareDirectory(input.deliveryCityId));
  return ok({ id: merchant.id }, 201);
});
