import "server-only";
import { z } from "zod";
import { graphVersion } from "./client";
import { ApiError } from "@/lib/api";
export const embeddedSignupSchema = z.object({
  code: z.string().min(1),
  wabaId: z.string().regex(/^\d+$/),
  phoneNumberId: z.string().regex(/^\d+$/),
});
export function embeddedSignupConfiguration() {
  return {
    ready: !!(
      process.env.META_APP_ID &&
      process.env.META_CONFIG_ID &&
      process.env.META_APP_SECRET
    ),
    appId: process.env.META_APP_ID,
    configId: process.env.META_CONFIG_ID,
  };
}
// Server-only exchange. The UI must supply a short-lived code from the reviewed Meta login flow.
export async function exchangeSignupCode(code: string) {
  if (!embeddedSignupConfiguration().ready)
    throw new ApiError(
      503,
      "EMBEDDED_CONFIGURATION",
      "Configuração necessária: aplicativo Meta e Embedded Signup.",
    );
  const response = await fetch(
    "https://graph.facebook.com/" + graphVersion() + "/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        code,
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = await response.json();
  if (!response.ok || !result.access_token)
    throw new ApiError(
      502,
      "SIGNUP",
      "Não foi possível concluir a autorização Meta.",
    );
  return result.access_token as string;
}
