import { db } from "@/lib/db";
import { sendTextMessage, sendTemplateMessage } from "./messages";
import { notificationKeys } from "@/lib/services/orders";
const labels: Record<string, string> = {
  RECEIVED: "recebido",
  CONFIRMED: "confirmado",
  PREPARING: "em preparo",
  READY: "pronto",
  DELIVERING: "saiu para entrega",
  FINISHED: "entregue",
};
export async function processNotifications(merchantId: string) {
  const jobs = await db.notificationJob.findMany({
    where: { state: "PENDING", order: { merchantId } },
    include: { order: { include: { customer: true } } },
    take: 25,
  });
  for (const job of jobs) {
    const claimed = await db.notificationJob.updateMany({
      where: { id: job.id, state: "PENDING" },
      data: { state: "PROCESSING", attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    try {
      const settings = await db.notificationSettings.findUnique({
        where: { merchantId },
      });
      const key = notificationKeys[job.status as keyof typeof notificationKeys];
      if (
        !settings ||
        !key ||
        !settings[key] ||
        !job.order.customer?.whatsappConsent
      ) {
        await db.notificationJob.update({
          where: { id: job.id },
          data: { state: "SKIPPED" },
        });
        continue;
      }
      const customer = job.order.customer;
      const conversation = await db.conversation.findUnique({
        where: {
          merchantId_whatsappNumber: {
            merchantId,
            whatsappNumber: customer.phone,
          },
        },
      });
      if (
        conversation?.lastInboundAt &&
        Date.now() - conversation.lastInboundAt.getTime() < 24 * 3600_000
      ) {
        await sendTextMessage(
          merchantId,
          customer.phone,
          "Olá, " +
            customer.name +
            ". Seu pedido #" +
            job.order.code +
            " está " +
            labels[job.status] +
            ".",
        );
      } else {
        if (!settings.templateName) throw new Error("TEMPLATE_REQUIRED");
        await sendTemplateMessage(
          merchantId,
          customer.phone,
          settings.templateName,
          settings.templateLanguage,
          [customer.name, String(job.order.code), labels[job.status]],
        );
      }
      await db.notificationJob.update({
        where: { id: job.id },
        data: { state: "SENT", error: null },
      });
    } catch {
      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          state: "FAILED",
          error:
            "Confira conexão, consentimento, janela de atendimento e template.",
        },
      });
      console.error("whatsapp_notification_failed", { jobId: job.id });
    }
  }
}
