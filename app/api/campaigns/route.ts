import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { ownedImage, cleanupImage } from "@/lib/storage";
import { audit } from "@/lib/services/audit";
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "catalog");
  return ok(
    await db.campaign.findMany({
      where: { merchantId: user.merchantId },
      orderBy: { createdAt: "desc" },
    }),
  );
});
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "catalog");
  const input = z
    .object({
      id: z.string().optional(),
      name: z.string().min(2).max(120),
      text: z.string().min(1).max(2000),
      imageUrl: z.string().nullable(),
      imageKey: z.string().nullable(),
    })
    .parse(await json(request));
  await ownedImage(user.merchantId, input.imageKey, input.imageUrl);
  const old = input.id
    ? await db.campaign.findFirst({
        where: { id: input.id, merchantId: user.merchantId },
      })
    : null;
  const { id, ...data } = input;
  const result = await db.$transaction(async (tx) => {
    const item = id
      ? await tx.campaign.update({
          where: { id, merchantId: user.merchantId },
          data,
        })
      : await tx.campaign.create({
          data: { ...data, merchantId: user.merchantId },
        });
    await audit(tx, user.merchantId, user.id, "Campaign", item.id, "SAVED");
    return item;
  });
  if (old?.imageKey !== input.imageKey)
    await cleanupImage(user.merchantId, old?.imageKey);
  return ok(result);
});
