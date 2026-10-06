import "server-only";
import { ApiError } from "@/lib/api";
import { decrypt } from "@/lib/security/encryption";
import { db } from "@/lib/db";
export function graphVersion() {
  const version = process.env.META_GRAPH_API_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version))
    throw new ApiError(
      503,
      "META_CONFIGURATION",
      "Configuração necessária: META_GRAPH_API_VERSION.",
    );
  return version;
}
export async function graph<T>(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    "https://graph.facebook.com/" + graphVersion() + "/" + path,
    {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      502,
      "META_" + (result.error?.code || response.status),
      "A Meta recusou a solicitação. Verifique permissões, número, template e janela de atendimento.",
    );
  return result as T;
}
export async function integration(merchantId: string) {
  const value = await db.whatsAppIntegration.findUnique({
    where: { merchantId },
  });
  if (!value || value.status !== "CONNECTED")
    throw new ApiError(
      409,
      "WHATSAPP_CONFIGURATION",
      "Configuração necessária: conecte a API oficial do WhatsApp.",
    );
  return { ...value, token: decrypt(value.accessTokenEncrypted) };
}
