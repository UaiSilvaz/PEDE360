import assert from "node:assert/strict";
import { randomUUID, createHash, randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { encrypt } from "../lib/security/encryption";
import { receiveWebhook } from "../lib/whatsapp/webhook";
import { processAutoReplies } from "../lib/whatsapp/auto-reply";
async function main() {
  const suffix = randomUUID();
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  process.env.META_GRAPH_API_VERSION = "v25.0";
  process.env.APP_URL = "https://menu.example";
  const merchant = await db.merchant.create({
    data: {
      name: "Auto reply",
      slug: "reply-" + suffix,
      autoReplyEnabled: true,
      autoReplyMessage: "Welcome",
    },
  });
  const bodies: string[] = [];
  const originalFetch = globalThis.fetch;
  let sent = 0;
  let rejected = false;
  let networkFailure = false;
  let expectedMessage = "Welcome";
  globalThis.fetch = (async (_url: unknown, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    assert.equal(body.to, "5511988887777");
    assert.equal(
      body.text.body,
      expectedMessage + "\n\nhttps://menu.example/loja/" + merchant.slug,
    );
    sent++;
    if (networkFailure) throw new Error("Simulated lost response");
    if (rejected)
      return Response.json({ error: { code: 131000 } }, { status: 500 });
    return Response.json({ messages: [{ id: "out-" + suffix + "-" + sent }] });
  }) as typeof fetch;
  try {
    await db.whatsAppIntegration.create({
      data: {
        merchantId: merchant.id,
        wabaId: suffix,
        phoneNumberId: suffix,
        businessPhone: "5511999999999",
        accessTokenEncrypted: encrypt("test-token"),
        status: "CONNECTED",
      },
    });
    async function inbound(id: string, type = "text") {
      const raw = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            id: suffix,
            changes: [
              {
                field: "messages",
                value: {
                  metadata: { phone_number_id: suffix },
                  messages: [
                    {
                      id: suffix + id,
                      from: "5511988887777",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type,
                      text: { body: "Hi" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      bodies.push(raw);
      await receiveWebhook(raw);
      return raw;
    }
    const raw = await inbound("first");
    const process = () => processAutoReplies(20, merchant.id);
    await Promise.all([process(), process()]);
    assert.equal(sent, 1);
    await receiveWebhook(raw);
    await process();
    assert.equal(sent, 1);
    await inbound("audio", "audio");
    await process();
    assert.equal(
      sent,
      2,
      JSON.stringify(
        await db.autoReplyJob.findMany({
          where: { message: { conversation: { merchantId: merchant.id } } },
          select: { state: true, error: true },
        }),
      ),
    );
    rejected = true;
    await inbound("retry");
    await process();
    assert.equal(sent, 3);
    const pending = await db.autoReplyJob.findFirstOrThrow({
      where: { message: { externalMessageId: suffix + "retry" } },
    });
    assert.equal(pending.state, "PENDING");
    rejected = false;
    await db.autoReplyJob.update({
      where: { id: pending.id },
      data: { nextAttemptAt: new Date(0) },
    });
    await process();
    assert.equal(sent, 4);
    assert.equal(
      (await db.autoReplyJob.findUniqueOrThrow({ where: { id: pending.id } }))
        .state,
      "SENT",
    );
    await inbound("edited");
    expectedMessage = "Updated welcome";
    await db.merchant.update({
      where: { id: merchant.id },
      data: { autoReplyMessage: expectedMessage },
    });
    await process();
    assert.equal(sent, 5);
    networkFailure = true;
    await inbound("network");
    await process();
    assert.equal(sent, 6);
    const ambiguous = await db.autoReplyJob.findFirstOrThrow({
      where: { message: { externalMessageId: suffix + "network" } },
    });
    assert.equal(ambiguous.state, "FAILED");
    networkFailure = false;
    await process();
    assert.equal(sent, 6);
    await inbound("expired");
    await db.message.update({
      where: { externalMessageId: suffix + "expired" },
      data: { timestamp: new Date(Date.now() - 25 * 3600_000) },
    });
    await process();
    assert.equal(sent, 6);
    await inbound("queued-disabled");
    await db.merchant.update({
      where: { id: merchant.id },
      data: { autoReplyEnabled: false },
    });
    await process();
    assert.equal(sent, 6);
    await inbound("disabled");
    await process();
    assert.equal(sent, 6);
    console.log(
      "Auto reply integration passed: real webhook-to-worker flow, concurrent claims, duplicate events, audio, retry, menu URL and disabled settings (Meta mocked).",
    );
  } finally {
    globalThis.fetch = originalFetch;
    await db.merchant.delete({ where: { id: merchant.id } });
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
