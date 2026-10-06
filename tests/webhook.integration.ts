import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { db } from "../lib/db";
import { receiveWebhook } from "../lib/whatsapp/webhook";
async function main() {
  const suffix = randomUUID();
  const merchants: string[] = [];
  const bodies: string[] = [];
  try {
    const a = await db.merchant.create({
      data: { name: "Webhook A", slug: "webhook-a-" + suffix },
    });
    merchants.push(a.id);
    const b = await db.merchant.create({
      data: { name: "Webhook B", slug: "webhook-b-" + suffix },
    });
    merchants.push(b.id);
    const phoneA = "phone-a-" + suffix;
    const phoneB = "phone-b-" + suffix;
    for (const [merchantId, phoneNumberId, wabaId] of [
      [a.id, phoneA, "waba-a"],
      [b.id, phoneB, "waba-b"],
    ])
      await db.whatsAppIntegration.create({
        data: {
          merchantId,
          phoneNumberId,
          wabaId,
          businessPhone: "5511999999999",
          accessTokenEncrypted: "unused-test-token",
          status: "CONNECTED",
        },
      });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const externalId = "message-" + suffix;
    const payload = (phone: string, waba: string, value: object) =>
      JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            id: waba,
            changes: [
              {
                field: "messages",
                value: { metadata: { phone_number_id: phone }, ...value },
              },
            ],
          },
        ],
      });
    const inbound = payload(phoneA, "waba-a", {
      messages: [
        {
          id: externalId,
          from: "5511988887777",
          timestamp,
          type: "text",
          text: { body: "Olá" },
        },
      ],
    });
    bodies.push(inbound);
    await Promise.all([receiveWebhook(inbound), receiveWebhook(inbound)]);
    assert.equal(
      await db.message.count({ where: { externalMessageId: externalId } }),
      1,
    );
    assert.equal(
      await db.conversation.count({ where: { merchantId: b.id } }),
      0,
    );
    const conversation = await db.conversation.findFirstOrThrow({
      where: { merchantId: a.id },
    });
    assert(conversation.lastInboundAt);
    assert(
      (
        await db.whatsAppIntegration.findUniqueOrThrow({
          where: { merchantId: a.id },
        })
      ).webhookVerified,
    );
    const outbound = "out-" + suffix;
    await db.message.create({
      data: {
        conversationId: conversation.id,
        externalMessageId: outbound,
        direction: "OUTBOUND",
        type: "text",
        text: "Resposta",
        status: "SENT",
      },
    });
    for (const state of ["read", "delivered", "sent"]) {
      const body = payload(phoneA, "waba-a", {
        statuses: [
          {
            id: outbound,
            status: state,
            timestamp,
            recipient_id: "5511988887777",
          },
        ],
      });
      bodies.push(body);
      await receiveWebhook(body);
    }
    assert.equal(
      (
        await db.message.findUniqueOrThrow({
          where: { externalMessageId: outbound },
        })
      ).status,
      "READ",
    );
    const foreign = payload(phoneB, "waba-b", {
      statuses: [{ id: outbound, status: "failed", timestamp }],
    });
    bodies.push(foreign);
    await receiveWebhook(foreign);
    assert.equal(
      (
        await db.message.findUniqueOrThrow({
          where: { externalMessageId: outbound },
        })
      ).status,
      "READ",
    );
    const early = payload(phoneA, "waba-a", {
      statuses: [{ id: "early-" + suffix, status: "delivered", timestamp }],
    });
    bodies.push(early);
    await receiveWebhook(early);
    assert.equal(
      await db.whatsAppStatusEvent.count({
        where: { merchantId: a.id, externalMessageId: "early-" + suffix },
      }),
      1,
    );
    console.log(
      "Webhook integration passed: concurrent deduplication, tenant isolation, verified status, out-of-order delivery events and early event persistence.",
    );
  } finally {
    await db.merchant.deleteMany({ where: { id: { in: merchants } } });
    await db.webhookReceipt.deleteMany({
      where: {
        id: {
          in: bodies.map((raw) =>
            createHash("sha256").update(raw).digest("hex"),
          ),
        },
      },
    });
    await db.$disconnect();
  }
}
void main();
