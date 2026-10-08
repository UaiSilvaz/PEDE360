import { after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { endpoint, ApiError, ok, readBody } from "@/lib/api";
import { decrypt } from "@/lib/security/encryption";
import { receiveWebhook, verifySignature } from "@/lib/whatsapp/webhook";
import { processAutoReplies } from "@/lib/whatsapp/auto-reply";

export const maxDuration = 60;

async function connection(request: Request) {
  const slug = decodeURIComponent(
    new URL(request.url).pathname.split("/").at(-1) || "",
  );
  const value = await db.whatsAppIntegration.findFirst({
    where: { merchant: { slug }, status: "CONNECTED" },
    select: {
      merchantId: true,
      appSecretEncrypted: true,
      webhookVerifyToken: true,
    },
  });
  if (!value?.appSecretEncrypted || !value.webhookVerifyToken)
    throw new ApiError(
      404,
      "WHATSAPP_CONFIGURATION",
      "WhatsApp não conectado nesta loja.",
    );
  return value;
}

export const GET = endpoint(async (request) => {
  const config = await connection(request);
  const query = new URL(request.url).searchParams;
  const actual = Buffer.from(query.get("hub.verify_token") || "");
  const expected = Buffer.from(config.webhookVerifyToken!);
  if (
    query.get("hub.mode") !== "subscribe" ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    throw new ApiError(403, "VERIFY_TOKEN", "Verificação recusada.");
  return new Response(query.get("hub.challenge") || "", {
    headers: { "Content-Type": "text/plain" },
  });
});

export const POST = endpoint(async (request) => {
  const config = await connection(request);
  const raw = (await readBody(request, 1024 * 1024)).toString("utf8");
  if (
    !verifySignature(
      raw,
      request.headers.get("x-hub-signature-256"),
      decrypt(config.appSecretEncrypted!),
    )
  )
    throw new ApiError(401, "SIGNATURE", "Assinatura inválida.");
  await receiveWebhook(raw, config.merchantId);
  after(() => processAutoReplies(20, config.merchantId).then(() => {}));
  return ok({ received: true });
});
