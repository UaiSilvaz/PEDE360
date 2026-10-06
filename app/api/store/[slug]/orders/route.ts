import { after } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, ApiError, json, sameOrigin } from "@/lib/api";
import { orderSchema } from "@/lib/schemas/order";
import { createOrder } from "@/lib/services/orders";
import { rateLimit } from "@/lib/security/rate-limit";
import { orderMessage, whatsappLink } from "@/lib/whatsapp/link";
import { processNotifications } from "@/lib/whatsapp/notifications";
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    sameOrigin(request);
    const input = orderSchema.parse(await json(request));
    const merchant = await db.merchant.findUnique({
      where: { slug: (await context.params).slug },
    });
    if (!merchant) throw new ApiError(404, "NOT_FOUND", "Loja não encontrada.");
    await rateLimit("checkout:" + merchant.id + ":" + input.phone, 30, 600);
    const quote = new URL(request.url).searchParams.get("quote") === "true";
    const result = await createOrder(merchant.id, input, undefined, quote);
    if ("code" in result) {
      after(() => processNotifications(merchant.id));
      return ok({
        id: result.id,
        code: result.code,
        total: result.total,
        whatsappUrl: merchant.phone
          ? whatsappLink(merchant.phone, orderMessage(result))
          : null,
      });
    }
    return ok(result);
  } catch (e) {
    return fail(e);
  }
}
