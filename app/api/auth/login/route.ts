import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, endpoint, ok, json, sameOrigin } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { createSession } from "@/lib/security/auth";
import { rateLimit } from "@/lib/security/rate-limit";
const dummy = hashPassword("unused-password-for-timing-only");
export const POST = endpoint(async (request) => {
  sameOrigin(request);
  const input = z
    .object({
      slug: z.string().max(60).optional(),
      email: z
        .email()
        .max(254)
        .transform((s) => s.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .parse(await json(request));
  await rateLimit("login:" + input.email, 10, 600);
  const candidates = await db.user.findMany({
    where: {
      email: input.email,
      ...(input.slug ? { merchant: { slug: input.slug } } : {}),
    },
    include: { merchant: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!candidates.length) verifyPassword(input.password, dummy);
  const matches = candidates.filter((user) =>
    verifyPassword(input.password, user.password || dummy),
  );
  if (!matches.length)
    throw new ApiError(401, "INVALID_LOGIN", "E-mail ou senha incorretos.");
  if (matches.length > 1)
    return ok({ stores: matches.map((user) => user.merchant) });
  await createSession(matches[0].id);
  return ok({ name: matches[0].name });
});
