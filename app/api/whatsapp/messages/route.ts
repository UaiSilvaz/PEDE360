import { z } from "zod";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp/messages";
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "whatsapp");
  await rateLimit("message:" + user.id, 30, 60);
  const input = z
    .object({
      to: z.string().regex(/^\d{10,15}$/),
      text: z.string().min(1).max(4096).optional(),
      template: z.string().optional(),
      language: z.string().default("pt_BR"),
      parameters: z.array(z.string().max(500)).max(10).default([]),
    })
    .parse(await json(request));
  return ok(
    input.template
      ? await sendTemplateMessage(
          user.merchantId,
          input.to,
          input.template,
          input.language,
          input.parameters,
        )
      : await sendTextMessage(
          user.merchantId,
          input.to,
          z.string().min(1).parse(input.text),
        ),
  );
});
