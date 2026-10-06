import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json, sameOrigin } from "@/lib/api";
import { hashPassword } from "@/lib/security/password";
import { createSession } from "@/lib/security/auth";
import { rateLimit } from "@/lib/security/rate-limit";
const schema = z.object({
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
  return ok({ id: merchant.id }, 201);
});
