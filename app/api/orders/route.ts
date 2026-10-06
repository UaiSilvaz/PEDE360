import { z } from "zod";
import { after } from "next/server";
import { db } from "@/lib/db";
import { endpoint, ok, json } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { orderSchema } from "@/lib/schemas/order";
import { createOrder, changeStatus } from "@/lib/services/orders";
import { processNotifications } from "@/lib/whatsapp/notifications";
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "orders.read");
  return ok(
    await db.order.findMany({
      where: { merchantId: user.merchantId },
      include: {
        courier: { select: { id: true, name: true } },
        customer: true,
        items: { include: { options: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  );
});
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "orders.write");
  const input = orderSchema.parse(await json(request));
  const result = await createOrder(
    user.merchantId,
    input,
    user.id,
    new URL(request.url).searchParams.get("quote") === "true",
  );
  after(() => processNotifications(user.merchantId));
  return ok(result);
});
export const PATCH = endpoint(async (request) => {
  const user = await authorize(request, "orders.write");
  const input = z
    .object({
      id: z.string(),
      status: z.enum([
        "RECEIVED",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "DELIVERING",
        "FINISHED",
        "CANCELED",
      ]),
    })
    .parse(await json(request));
  const result = await changeStatus(
    user.merchantId,
    user.id,
    input.id,
    input.status,
    user.role,
  );
  after(() => processNotifications(user.merchantId));
  return ok(result);
});
