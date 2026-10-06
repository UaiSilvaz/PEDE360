import { db } from "@/lib/db";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { merchantSchema } from "@/lib/schemas/catalog";
import { ownedImage, cleanupImage } from "@/lib/storage";
import { audit } from "@/lib/services/audit";
import { z } from "zod";
import { phoneSchema } from "@/lib/phone";
export const PATCH = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const input = z
    .object({ isOpen: z.boolean().optional(), phone: phoneSchema.optional() })
    .strict()
    .refine(
      (value) => Object.keys(value).length > 0,
      "Escolha o ajuste que deseja salvar.",
    )
    .parse(await json(request));
  const result = await db.$transaction(async (tx) => {
    const merchant = await tx.merchant.update({
      where: { id: user.merchantId },
      data: input,
    });
    await audit(
      tx,
      user.merchantId,
      user.id,
      "Merchant",
      merchant.id,
      "UPDATED",
      input,
    );
    return { isOpen: merchant.isOpen, phone: merchant.phone };
  });
  return ok(result);
});
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  return ok(user.merchant);
});
export const PUT = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const input = merchantSchema.parse(await json(request));
  await ownedImage(user.merchantId, input.logoKey, input.logoUrl);
  await ownedImage(user.merchantId, input.coverKey, input.coverUrl);
  await ownedImage(user.merchantId, input.imageKey, input.imageUrl);
  const result = await db.$transaction(async (tx) => {
    const item = await tx.merchant.update({
      where: { id: user.merchantId },
      data: input,
    });
    await audit(tx, user.merchantId, user.id, "Merchant", item.id, "UPDATED");
    return item;
  });
  for (const [oldKey, newKey] of [
    [user.merchant.logoKey, input.logoKey],
    [user.merchant.coverKey, input.coverKey],
    [user.merchant.imageKey, input.imageKey],
  ])
    if (oldKey !== newKey) await cleanupImage(user.merchantId, oldKey);
  return ok(result);
});
