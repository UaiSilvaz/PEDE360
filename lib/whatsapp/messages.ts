import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { graph, integration } from "./client";
import type { MetaMessageResult } from "./types";
import { shouldAdvanceMessage } from "./webhook";
import { listTemplates } from "./templates";
async function send(
  merchantId: string,
  to: string,
  type: string,
  text: string,
  payload: unknown,
) {
  const config = await integration(merchantId);
  const conversation = await db.conversation.upsert({
    where: { merchantId_whatsappNumber: { merchantId, whatsappNumber: to } },
    create: { merchantId, whatsappNumber: to },
    update: {},
  });
  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      type,
      text,
      status: "PENDING",
    },
  });
  try {
    const result = await graph<MetaMessageResult>(
      config.token,
      config.phoneNumberId + "/messages",
      "POST",
      payload,
    );
    if (!result.messages?.[0]?.id) throw new Error("Missing message id");
    await db.$transaction(async (tx) => {
      const events = await tx.whatsAppStatusEvent.findMany({
        where: { merchantId, externalMessageId: result.messages[0].id },
        orderBy: { timestamp: "asc" },
      });
      let status: import("@prisma/client").MessageStatus = "SENT";
      for (const event of events)
        if (shouldAdvanceMessage(status, event.status)) status = event.status;
      await tx.message.update({
        where: { id: message.id },
        data: { externalMessageId: result.messages[0].id, status },
      });
    });
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
    return { id: message.id };
  } catch (e) {
    await db.message.update({
      where: { id: message.id },
      data: { status: "FAILED" },
    });
    throw e;
  }
}
export async function sendTextMessage(
  merchantId: string,
  to: string,
  text: string,
) {
  const conversation = await db.conversation.findUnique({
    where: { merchantId_whatsappNumber: { merchantId, whatsappNumber: to } },
  });
  if (
    !conversation?.lastInboundAt ||
    Date.now() - conversation.lastInboundAt.getTime() > 24 * 3600_000
  )
    throw new ApiError(
      409,
      "WINDOW_CLOSED",
      "Janela de 24 horas encerrada. Use um template aprovado.",
    );
  return send(merchantId, to, "text", text, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text, preview_url: false },
  });
}
export async function sendTemplateMessage(
  merchantId: string,
  to: string,
  name: string,
  language: string,
  parameters: string[] = [],
) {
  const templates = await listTemplates(merchantId);
  const template = templates.find(
    (t) =>
      t.name === name && t.language === language && t.status === "APPROVED",
  );
  if (!template)
    throw new ApiError(
      400,
      "TEMPLATE",
      "Selecione um template aprovado pela Meta.",
    );
  return send(
    merchantId,
    to,
    "template",
    name + (parameters.length ? ": " + parameters.join(" · ") : ""),
    {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: language },
        ...(parameters.length
          ? {
              components: [
                {
                  type: "body",
                  parameters: parameters.map((text) => ({
                    type: "text",
                    text,
                  })),
                },
              ],
            }
          : {}),
      },
    },
  );
}
export const sendOrderConfirmation = (
  merchantId: string,
  to: string,
  text: string,
) => sendTextMessage(merchantId, to, text);
export const sendOrderStatusUpdate = (
  merchantId: string,
  to: string,
  text: string,
) => sendTextMessage(merchantId, to, text);
export const sendDeliveryUpdate = (
  merchantId: string,
  to: string,
  text: string,
) => sendTextMessage(merchantId, to, text);
