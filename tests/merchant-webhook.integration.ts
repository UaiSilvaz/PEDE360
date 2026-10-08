import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../lib/db";
import { encrypt } from "../lib/security/encryption";
import { receiveWebhook } from "../lib/whatsapp/webhook";
import { GET, POST } from "../app/api/webhooks/whatsapp/[slug]/route";

async function main() {
  const suffix = randomBytes(8).toString("hex");
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const ids: string[] = [],
    receipts: string[] = [];
  try {
    const tenants = [];
    for (const name of ["a", "b"]) {
      const merchant = await db.merchant.create({
        data: {
          name: "Webhook test",
          slug: `webhook-${name}-${suffix}`,
          autoReplyEnabled: true,
        },
      });
      ids.push(merchant.id);
      tenants.push(merchant);
      await db.whatsAppIntegration.create({
        data: {
          merchantId: merchant.id,
          wabaId: `waba-${name}-${suffix}`,
          phoneNumberId: `phone-${name}-${suffix}`,
          businessPhone: "5511999999999",
          accessTokenEncrypted: encrypt("test-only-token"),
          appSecretEncrypted: encrypt(`secret-${name}-${suffix}`),
          webhookVerifyToken: `verify-${name}-${suffix}`,
          status: "CONNECTED",
        },
      });
    }
    const base = `https://menu.example/api/webhooks/whatsapp/${tenants[0].slug}`;
    const good = await GET(
      new Request(
        `${base}?hub.mode=subscribe&hub.verify_token=verify-a-${suffix}&hub.challenge=challenge`,
      ),
    );
    assert.equal(good.status, 200);
    assert.equal(await good.text(), "challenge");
    assert.equal(
      (
        await GET(
          new Request(
            `${base}?hub.mode=subscribe&hub.verify_token=verify-b-${suffix}`,
          ),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await POST(
          new Request(base, {
            method: "POST",
            body: "{}",
            headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) },
          }),
        )
      ).status,
      401,
    );
    for (const name of ["b", "a"]) {
      const raw = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            id: `waba-${name}-${suffix}`,
            changes: [
              {
                field: "messages",
                value: {
                  metadata: { phone_number_id: `phone-${name}-${suffix}` },
                  messages: [
                    {
                      id: `message-${name}-${suffix}`,
                      from: "5511988887777",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: "text",
                      text: { body: "Hello" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      receipts.push(
        createHash("sha256")
          .update(tenants[0].id + ":" + raw)
          .digest("hex"),
      );
      await receiveWebhook(raw, tenants[0].id);
      await receiveWebhook(raw, tenants[0].id);
    }
    assert.equal(
      await db.message.count({
        where: { conversation: { merchantId: tenants[1].id } },
      }),
      0,
    );
    assert.equal(
      await db.autoReplyJob.count({
        where: { message: { conversation: { merchantId: tenants[0].id } } },
      }),
      1,
    );
    console.log(
      "PASS: per-merchant verification token, invalid signature rejection, callback tenant isolation and deduplication.",
    );
  } finally {
    await db.merchant.deleteMany({ where: { id: { in: ids } } });
    await db.webhookReceipt.deleteMany({ where: { id: { in: receipts } } });
    await db.$disconnect();
  }
}
void main();
