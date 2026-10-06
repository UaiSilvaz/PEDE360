import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { encrypt } from "@/lib/security/encryption";
import { graph, integration } from "@/lib/whatsapp/client";
import { embeddedSignupConfiguration } from "@/lib/whatsapp/embedded-signup";
import { audit } from "@/lib/services/audit";
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const config = await db.whatsAppIntegration.findUnique({
    where: { merchantId: user.merchantId },
    select: {
      status: true,
      businessPhone: true,
      businessName: true,
      connectedAt: true,
      webhookVerified: true,
    },
  });
  return ok({
    ...config,
    status: config?.status || "DISCONNECTED",
    webhookVerified: config?.webhookVerified || false,
    configurationRequired: [
      "ENCRYPTION_KEY",
      "META_GRAPH_API_VERSION",
      "META_APP_SECRET",
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    ].filter((k) => !process.env[k]),
    embeddedSignup: embeddedSignupConfiguration(),
  });
});
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const input = z
    .object({
      wabaId: z.string().regex(/^\d+$/),
      phoneNumberId: z.string().regex(/^\d+$/),
      accessToken: z.string().min(20).max(4096),
    })
    .parse(await json(request));
  const phone = await graph<{
    display_phone_number: string;
    verified_name: string;
  }>(
    input.accessToken,
    input.phoneNumberId + "?fields=display_phone_number,verified_name",
  );
  const numbers = await graph<{ data: { id: string }[] }>(
    input.accessToken,
    input.wabaId + "/phone_numbers",
  );
  if (!numbers.data.some((p) => p.id === input.phoneNumberId))
    throw new Error("Phone ownership mismatch");
  await graph(input.accessToken, input.wabaId + "/subscribed_apps", "POST");
  const accessTokenEncrypted = encrypt(input.accessToken);
  await db.$transaction(async (tx) => {
    await tx.whatsAppIntegration.upsert({
      where: { merchantId: user.merchantId },
      create: {
        merchantId: user.merchantId,
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        businessPhone: phone.display_phone_number,
        businessName: phone.verified_name,
        accessTokenEncrypted,
        status: "CONNECTED",
        connectedAt: new Date(),
      },
      update: {
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        businessPhone: phone.display_phone_number,
        businessName: phone.verified_name,
        accessTokenEncrypted,
        status: "CONNECTED",
        connectedAt: new Date(),
        webhookVerified: false,
      },
    });
    await audit(
      tx,
      user.merchantId,
      user.id,
      "WhatsAppIntegration",
      user.merchantId,
      "CONNECTED",
    );
  });
  return ok({ connected: true });
});
export const PUT = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  const config = await integration(user.merchantId);
  await graph(config.token, config.phoneNumberId + "?fields=id");
  return ok({ connected: true });
});
export const DELETE = endpoint(async (request) => {
  const user = await authorize(request, "settings");
  await db.$transaction(async (tx) => {
    await tx.whatsAppIntegration.updateMany({
      where: { merchantId: user.merchantId },
      data: {
        accessTokenEncrypted: "",
        status: "DISCONNECTED",
        webhookVerified: false,
      },
    });
    await audit(
      tx,
      user.merchantId,
      user.id,
      "WhatsAppIntegration",
      user.merchantId,
      "DISCONNECTED",
    );
  });
  return ok(null);
});
