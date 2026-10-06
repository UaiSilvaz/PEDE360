import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { ownedImage, cleanupImage } from "@/lib/storage";
export const PUT = endpoint(async (request) => {
  const user = await authorize(request);
  const input = z
    .object({
      name: z.string().min(2).max(120),
      imageUrl: z.string().nullable(),
      imageKey: z.string().nullable(),
    })
    .parse(await json(request));
  await ownedImage(user.merchantId, input.imageKey, input.imageUrl);
  await db.user.update({
    where: { id: user.id, merchantId: user.merchantId },
    data: input,
  });
  if (input.imageKey !== user.imageKey)
    await cleanupImage(user.merchantId, user.imageKey);
  return ok({ saved: true });
});
