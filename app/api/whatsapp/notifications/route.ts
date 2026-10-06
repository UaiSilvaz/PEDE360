import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { audit } from "@/lib/services/audit";
const schema = z.object({
  orderReceivedWhatsapp: z.boolean(),
  orderConfirmedWhatsapp: z.boolean(),
  orderPreparingWhatsapp: z.boolean(),
  orderReadyWhatsapp: z.boolean(),
  orderOutForDeliveryWhatsapp: z.boolean(),
  orderDeliveredWhatsapp: z.boolean(),
  templateName: z.string().max(100).nullable(),
  templateLanguage: z.string().max(20),
});
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  return ok({
    settings: await db.notificationSettings.findUnique({
      where: { merchantId: user.merchantId },
    }),
    jobs: await db.notificationJob.findMany({
      where: { order: { merchantId: user.merchantId } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  });
});
export const PUT = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const data = schema.parse(await json(request));
  const result = await db.$transaction(async (tx) => {
    const item = await tx.notificationSettings.upsert({
      where: { merchantId: user.merchantId },
      create: { merchantId: user.merchantId, ...data },
      update: data,
    });
    await audit(
      tx,
      user.merchantId,
      user.id,
      "NotificationSettings",
      item.id,
      "UPDATED",
    );
    return item;
  });
  return ok(result);
});
