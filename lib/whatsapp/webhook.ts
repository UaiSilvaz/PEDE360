import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import { Prisma, MessageStatus } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
export function verifySignature(
  raw: string,
  signature: string | null,
  secret: string,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature))
    return false;
  return timingSafeEqual(
    createHmac("sha256", secret).update(raw).digest(),
    Buffer.from(signature.slice(7), "hex"),
  );
}
const eventSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          field: z.string(),
          value: z
            .object({
              metadata: z.object({ phone_number_id: z.string() }).optional(),
              messages: z
                .array(
                  z
                    .object({
                      id: z.string(),
                      from: z.string(),
                      timestamp: z.string(),
                      type: z.string(),
                      text: z.object({ body: z.string() }).optional(),
                    })
                    .passthrough(),
                )
                .optional(),
              statuses: z
                .array(
                  z
                    .object({
                      id: z.string(),
                      status: z.string(),
                      timestamp: z.string(),
                      recipient_id: z.string().optional(),
                    })
                    .passthrough(),
                )
                .optional(),
            })
            .passthrough(),
        }),
      ),
    }),
  ),
});
const ranks: Record<string, number> = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
  RECEIVED: 5,
};
export function shouldAdvanceMessage(current: string, next: string) {
  return (
    current !== "READ" &&
    current !== "FAILED" &&
    (ranks[next] ?? -1) > (ranks[current] ?? -1)
  );
}
export async function receiveWebhook(raw: string, merchantId?: string) {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "JSON inválido.");
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "PAYLOAD", "Webhook inválido.");
  const receiptId = createHash("sha256")
    .update((merchantId ? merchantId + ":" : "") + raw)
    .digest("hex");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.$transaction(
        async (tx) => {
          if (await tx.webhookReceipt.findUnique({ where: { id: receiptId } }))
            return;
          for (const entry of parsed.data.entry)
            for (const change of entry.changes) {
              if (change.field !== "messages" || !change.value.metadata)
                continue;
              const config = await tx.whatsAppIntegration.findFirst({
                where: {
                  wabaId: entry.id,
                  phoneNumberId: change.value.metadata.phone_number_id,
                  status: "CONNECTED",
                  ...(merchantId ? { merchantId } : {}),
                },
              });
              if (!config) continue;
              await tx.whatsAppIntegration.update({
                where: { id: config.id },
                data: { webhookVerified: true },
              });
              for (const message of change.value.messages || []) {
                const timestamp = new Date(Number(message.timestamp) * 1000);
                if (
                  !Number.isFinite(timestamp.getTime()) ||
                  !/^\d{10,15}$/.test(message.from)
                )
                  continue;
                if (
                  await tx.message.findUnique({
                    where: { externalMessageId: message.id },
                  })
                )
                  continue;
                const customer = await tx.customer.findUnique({
                  where: {
                    merchantId_phone: {
                      merchantId: config.merchantId,
                      phone: message.from,
                    },
                  },
                });
                const conversation = await tx.conversation.upsert({
                  where: {
                    merchantId_whatsappNumber: {
                      merchantId: config.merchantId,
                      whatsappNumber: message.from,
                    },
                  },
                  create: {
                    merchantId: config.merchantId,
                    whatsappNumber: message.from,
                    customerId: customer?.id,
                    lastInboundAt: timestamp,
                    lastMessageAt: timestamp,
                  },
                  update: {},
                });
                await tx.conversation.updateMany({
                  where: {
                    id: conversation.id,
                    OR: [
                      { lastInboundAt: null },
                      { lastInboundAt: { lt: timestamp } },
                    ],
                  },
                  data: { lastInboundAt: timestamp },
                });
                await tx.conversation.updateMany({
                  where: {
                    id: conversation.id,
                    lastMessageAt: { lt: timestamp },
                  },
                  data: { lastMessageAt: timestamp },
                });
                const inbound = await tx.message.create({
                  data: {
                    conversationId: conversation.id,
                    externalMessageId: message.id,
                    direction: "INBOUND",
                    type: message.type,
                    text:
                      message.text?.body ||
                      "Mensagem recebida: " + message.type,
                    status: "RECEIVED",
                    timestamp,
                  },
                });
                const merchant = await tx.merchant.findUniqueOrThrow({
                  where: { id: config.merchantId },
                });
                if (
                  merchant.autoReplyEnabled &&
                  message.type !== "system" &&
                  message.type !== "unsupported"
                )
                  await tx.autoReplyJob.create({
                    data: { messageId: inbound.id },
                  });
              }
              for (const status of change.value.statuses || []) {
                const next = status.status.toUpperCase();
                if (!["SENT", "DELIVERED", "READ", "FAILED"].includes(next))
                  continue;
                const timestamp = new Date(Number(status.timestamp) * 1000);
                if (!Number.isFinite(timestamp.getTime())) continue;
                const eventId = createHash("sha256")
                  .update(
                    config.merchantId +
                      ":" +
                      status.id +
                      ":" +
                      next +
                      ":" +
                      status.timestamp,
                  )
                  .digest("hex");
                await tx.whatsAppStatusEvent.upsert({
                  where: { id: eventId },
                  create: {
                    id: eventId,
                    merchantId: config.merchantId,
                    externalMessageId: status.id,
                    status: next as MessageStatus,
                    timestamp,
                  },
                  update: {},
                });
                const message = await tx.message.findFirst({
                  where: {
                    externalMessageId: status.id,
                    conversation: { merchantId: config.merchantId },
                  },
                });
                if (message && shouldAdvanceMessage(message.status, next))
                  await tx.message.update({
                    where: { id: message.id },
                    data: { status: next as MessageStatus },
                  });
              }
            }
          await tx.webhookReceipt.create({ data: { id: receiptId } });
        },
        { isolationLevel: "Serializable" },
      );
      return;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(e.code) &&
        attempt < 2
      )
        continue;
      throw e;
    }
  }
}
