import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json, ApiError } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { audit } from "@/lib/services/audit";
export const PUT = endpoint(async (request) => {
  const user = await authorize(request, "dispatch");
  const input = z
    .object({ orderId: z.string(), courierId: z.string().nullable() })
    .parse(await json(request));
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: input.orderId,
        merchantId: user.merchantId,
        type: "DELIVERY",
        status: { notIn: ["FINISHED", "CANCELED"] },
      },
    });
    if (!order)
      throw new ApiError(404, "ORDER", "Pedido de entrega indisponível.");
    if (
      input.courierId &&
      !(await tx.courier.findFirst({
        where: {
          id: input.courierId,
          merchantId: user.merchantId,
          active: true,
        },
      }))
    )
      throw new ApiError(400, "COURIER", "Entregador indisponível.");
    const saved = await tx.order.update({
      where: { id: order.id },
      data: { courierId: input.courierId },
    });
    await audit(
      tx,
      user.merchantId,
      user.id,
      "Order",
      order.id,
      "COURIER_ASSIGNED",
      { courierId: input.courierId },
    );
    return { id: saved.id };
  });
  return ok(result);
});
