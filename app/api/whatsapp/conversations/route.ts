import { db } from "@/lib/db";
import { endpoint, ok, ApiError } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "whatsapp");
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const conversation = await db.conversation.findFirst({
      where: { id, merchantId: user.merchantId },
      include: {
        customer: true,
        messages: { orderBy: { timestamp: "desc" }, take: 200 },
        orders: { select: { id: true, code: true } },
      },
    });
    if (!conversation)
      throw new ApiError(404, "NOT_FOUND", "Conversa não encontrada.");
    conversation.messages.reverse();
    return ok(conversation);
  }
  return ok(
    await db.conversation.findMany({
      where: { merchantId: user.merchantId },
      include: { customer: true },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    }),
  );
});
