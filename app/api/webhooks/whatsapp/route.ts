import { endpoint, ok, ApiError, readBody } from "@/lib/api";
import { verifySignature, receiveWebhook } from "@/lib/whatsapp/webhook";
export const GET = endpoint(async (request) => {
  const params = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!token)
    throw new ApiError(503, "CONFIGURATION", "Configuração necessária.");
  if (
    params.get("hub.mode") !== "subscribe" ||
    params.get("hub.verify_token") !== token
  )
    throw new ApiError(403, "VERIFY_TOKEN", "Verificação recusada.");
  return new Response(params.get("hub.challenge") || "", {
    headers: { "Content-Type": "text/plain" },
  });
});
export const POST = endpoint(async (request) => {
  if (Number(request.headers.get("content-length") || 0) > 1024 * 1024)
    throw new ApiError(413, "PAYLOAD", "Webhook muito grande.");
  const raw = (await readBody(request, 1024 * 1024)).toString("utf8");
  if (Buffer.byteLength(raw) > 1024 * 1024)
    throw new ApiError(413, "PAYLOAD", "Webhook muito grande.");
  if (
    !verifySignature(
      raw,
      request.headers.get("x-hub-signature-256"),
      process.env.META_APP_SECRET || "",
    )
  )
    throw new ApiError(401, "SIGNATURE", "Assinatura inválida.");
  await receiveWebhook(raw);
  return ok({ received: true });
});
