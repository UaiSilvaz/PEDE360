import { z } from "zod";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { db } from "@/lib/db";
import { autoReplyText } from "@/lib/whatsapp/auto-reply-text";
import { processAutoReplies } from "@/lib/whatsapp/auto-reply";
import { audit } from "@/lib/services/audit";
export const maxDuration = 60;
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const merchant = await db.merchant.findUniqueOrThrow({
    where: { id: user.merchantId },
  });
  const connection = await db.whatsAppIntegration.findUnique({
    where: { merchantId: user.merchantId },
  });
  const jobs = await db.autoReplyJob.findMany({
    where: { message: { conversation: { merchantId: user.merchantId } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, state: true, error: true },
  });
  return ok({
    enabled: merchant.autoReplyEnabled,
    message: merchant.autoReplyMessage,
    connected: connection?.status === "CONNECTED",
    businessPhone: connection?.businessPhone,
    menuUrl: process.env.APP_URL
      ? new URL(
          "/loja/" + encodeURIComponent(merchant.slug),
          process.env.APP_URL,
        ).href
      : null,
    preview: process.env.APP_URL
      ? autoReplyText(
          merchant.autoReplyMessage,
          merchant.slug,
          process.env.APP_URL,
        )
      : null,
    jobs,
  });
});
export const PUT = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const input = z
    .object({
      enabled: z.boolean(),
      message: z.string().trim().min(1).max(3000),
    })
    .parse(await json(request));
  await db.$transaction(async (tx) => {
    await tx.merchant.update({
      where: { id: user.merchantId },
      data: {
        autoReplyEnabled: input.enabled,
        autoReplyMessage: input.message,
      },
    });
    await audit(
      tx,
      user.merchantId,
      user.id,
      "Merchant",
      user.merchantId,
      "AUTO_REPLY_UPDATED",
      { enabled: input.enabled },
    );
  });
  return ok({ saved: true });
});
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  return ok({ processed: await processAutoReplies(20, user.merchantId) });
});
