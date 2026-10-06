import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json, ApiError } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { roles, canGrantRole } from "@/lib/security/permissions";
import { hashPassword } from "@/lib/security/password";
import { audit } from "@/lib/services/audit";
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "staff");
  const input = z
    .object({
      name: z.string().min(2).max(120),
      email: z.email().transform((v) => v.toLowerCase()),
      password: z.string().min(12).max(128),
      role: z.enum(roles),
    })
    .parse(await json(request));
  if (!canGrantRole(user.role, input.role))
    throw new ApiError(
      403,
      "ROLE",
      "Apenas o proprietário pode adicionar outro proprietário.",
    );
  const item = await db.$transaction(async (tx) => {
    const row = await tx.user.create({
      data: {
        merchantId: user.merchantId,
        ...input,
        password: hashPassword(input.password),
      },
      select: { id: true, name: true, role: true },
    });
    await audit(tx, user.merchantId, user.id, "User", row.id, "CREATED", {
      role: row.role,
    });
    return row;
  });
  return ok(item);
});
