import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { sendTextMessage } from "./messages";
import { autoReplyText } from "./auto-reply-text";
export async function processAutoReplies(limit = 20, merchantId?: string) {
  const startedAt = Date.now();
  const scope = merchantId ? { message: { conversation: { merchantId } } } : {};
  // Ambiguous sends require reconciliation to avoid duplicate customer replies.
  await db.autoReplyJob.updateMany({
    where: {
      ...scope,
      state: "PROCESSING",
      updatedAt: { lt: new Date(startedAt - 5 * 60_000) },
    },
    data: {
      state: "FAILED",
      error: "Envio interrompido: confira o histórico antes de reenviar.",
    },
  });
  const jobs = await db.autoReplyJob.findMany({
    where: { ...scope, state: "PENDING", nextAttemptAt: { lte: new Date() } },
    include: {
      message: { include: { conversation: { include: { merchant: true } } } },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });
  let processed = 0;
  for (const job of jobs) {
    if (Date.now() - startedAt > 40_000) break;
    const claim = await db.autoReplyJob.updateMany({
      where: { id: job.id, state: "PENDING" },
      data: { state: "PROCESSING", attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    processed++;
    const { merchant, whatsappNumber } = job.message.conversation;
    try {
      const current = await db.merchant.findUniqueOrThrow({
        where: { id: merchant.id },
      });
      const config = await db.whatsAppIntegration.findUnique({
        where: { merchantId: merchant.id },
        select: { status: true },
      });
      if (
        !current.autoReplyEnabled ||
        config?.status !== "CONNECTED" ||
        Date.now() - job.message.timestamp.getTime() >= 24 * 3600_000
      ) {
        await db.autoReplyJob.update({
          where: { id: job.id },
          data: {
            state: "SKIPPED",
            error: "Resposta desativada ou mensagem expirada.",
          },
        });
        continue;
      }
      if (!process.env.APP_URL)
        throw new Error("Configure APP_URL com o endereço público do site.");
      await sendTextMessage(
        merchant.id,
        whatsappNumber,
        autoReplyText(
          current.autoReplyMessage,
          current.slug,
          process.env.APP_URL,
        ),
      );
      await db.autoReplyJob.update({
        where: { id: job.id },
        data: { state: "SENT", error: null },
      });
    } catch (e) {
      await db.autoReplyJob.update({
        where: { id: job.id },
        data: {
          state:
            e instanceof ApiError && e.status === 502 && job.attempts < 4
              ? "PENDING"
              : "FAILED",
          error: e instanceof Error ? e.message : "Falha no envio",
          nextAttemptAt: new Date(
            Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000,
          ),
        },
      });
    }
  }
  return processed;
}
