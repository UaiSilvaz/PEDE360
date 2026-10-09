import { createHash } from "node:crypto";
import { Prisma, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { type OrderInput } from "@/lib/schemas/order";
import { cents, priceItem } from "./pricing";
import { audit } from "./audit";
import { canChangeOrderStatus } from "@/lib/security/permissions";
import { municipality, normalizePlace } from "@/lib/geography/catalog";
const include = {
  items: { include: { options: true } },
  customer: true,
  events: { orderBy: { createdAt: "asc" as const } },
};
export const notificationKeys = {
  RECEIVED: "orderReceivedWhatsapp",
  CONFIRMED: "orderConfirmedWhatsapp",
  PREPARING: "orderPreparingWhatsapp",
  READY: "orderReadyWhatsapp",
  DELIVERING: "orderOutForDeliveryWhatsapp",
  FINISHED: "orderDeliveredWhatsapp",
} as const;
async function enqueue(
  tx: Prisma.TransactionClient,
  merchantId: string,
  orderId: string,
  status: OrderStatus,
) {
  const setting = await tx.notificationSettings.findUnique({
    where: { merchantId },
  });
  const key = notificationKeys[status as keyof typeof notificationKeys];
  if (setting && key && setting[key])
    await tx.notificationJob.upsert({
      where: { orderId_status: { orderId, status } },
      create: { orderId, status },
      update: {},
    });
}
export async function createOrder(
  merchantId: string,
  input: OrderInput,
  userId?: string,
  quote = false,
) {
  const requestHash = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const previous = await tx.order.findUnique({
            where: {
              merchantId_idempotencyKey: {
                merchantId,
                idempotencyKey: input.idempotencyKey,
              },
            },
            include,
          });
          if (previous && !quote) {
            if (previous.requestHash !== requestHash)
              throw new ApiError(
                409,
                "IDEMPOTENCY",
                "A confirmação já foi usada por outro pedido.",
              );
            return previous;
          }
          const merchant = await tx.merchant.findUniqueOrThrow({
            where: { id: merchantId },
          });
          if (!merchant.isOpen && !userId)
            throw new ApiError(
              400,
              "CLOSED",
              "Este estabelecimento está fechado.",
            );
          if (input.type === "DELIVERY" && merchant.deliveryCityId) {
            const expected = municipality(merchant.deliveryCityId);
            const matches = input.cityId
              ? input.cityId === merchant.deliveryCityId
              : normalizePlace(input.city) ===
                normalizePlace(merchant.deliveryCity || "");
            if (!expected || !matches || input.state !== merchant.deliveryState)
              throw new ApiError(
                400,
                "DELIVERY_CITY",
                "Esta loja entrega somente em " +
                  merchant.deliveryCity +
                  " — " +
                  merchant.deliveryState +
                  ".",
              );
          }
          if (!userId && ["TABLE", "SCHEDULED"].includes(input.type))
            throw new ApiError(400, "TYPE", "Escolha entrega ou retirada.");
          if (!merchant.paymentMethods.includes(input.paymentMethod))
            throw new ApiError(
              400,
              "PAYMENT",
              "Forma de pagamento indisponível.",
            );
          if (
            input.conversationId &&
            (!userId ||
              !(await tx.conversation.findFirst({
                where: { id: input.conversationId, merchantId },
              })))
          )
            throw new ApiError(400, "CONVERSATION", "Conversa inválida.");
          const products = await tx.product.findMany({
            where: {
              merchantId,
              id: { in: input.items.map((i) => i.productId) },
              OR: [{ categoryId: null }, { category: { active: true } }],
            },
            include: { optionGroups: { include: { options: true } } },
          });
          if (input.type === "TABLE") {
            const table = await tx.diningTable.findUnique({
              where: {
                merchantId_number: { merchantId, number: input.tableNumber! },
              },
            });
            if (!table)
              throw new ApiError(
                400,
                "TABLE",
                "Cadastre a mesa antes de lançar um pedido.",
              );
            if (!quote)
              await tx.diningTable.update({
                where: { id: table.id },
                data: { occupied: true },
              });
          }
          const items = input.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product)
              throw new ApiError(400, "PRODUCT", "Produto não encontrado.");
            return {
              ...priceItem(product, item.quantity, item.optionIds),
              notes: item.notes,
            };
          });
          const subtotal = items.reduce((sum, i) => sum + cents(i.total), 0);
          const minimum = cents(
            (input.type === "DELIVERY"
              ? merchant.deliveryMinimum
              : merchant.pickupMinimum) || 0,
          );
          if (subtotal < minimum)
            throw new ApiError(
              400,
              "MINIMUM",
              "Pedido mínimo: R$ " + (minimum / 100).toFixed(2),
            );
          let deliveryFee = 0;
          if (input.type === "DELIVERY") {
            const zones = await tx.deliveryZone.findMany({
              where: { merchantId, active: true },
            });
            const zone = zones.find(
              (value) => value.id === input.deliveryZoneId,
            );
            if (!zone)
              throw new ApiError(
                400,
                "DELIVERY",
                "Região de entrega inválida.",
              );
            const neighborhoodZone = zones.find(
              (value) =>
                normalizePlace(value.name) ===
                normalizePlace(input.neighborhood),
            );
            if (neighborhoodZone && neighborhoodZone.id !== zone.id)
              throw new ApiError(
                400,
                "DELIVERY_FEE",
                "Selecione a taxa de entrega correspondente ao bairro " +
                  input.neighborhood +
                  ".",
              );
            deliveryFee = cents(zone.fee);
          }
          let discount = 0;
          if (input.coupon) {
            const coupon = await tx.coupon.findUnique({
              where: {
                merchantId_code: {
                  merchantId,
                  code: input.coupon.toUpperCase(),
                },
              },
            });
            if (
              !coupon ||
              !coupon.active ||
              (coupon.expiresAt && coupon.expiresAt < new Date()) ||
              subtotal < cents(coupon.minimum)
            )
              throw new ApiError(
                400,
                "COUPON",
                "Cupom inválido ou fora das condições de uso.",
              );
            discount = Math.round((subtotal * coupon.percent) / 100);
          }
          const total = subtotal + deliveryFee - discount;
          if (
            input.paymentMethod === "Dinheiro" &&
            input.cashChangeFor !== undefined &&
            cents(input.cashChangeFor) < total
          )
            throw new ApiError(
              400,
              "CHANGE",
              "Valor para troco deve cobrir o total.",
            );
          if (quote)
            return {
              subtotal: subtotal / 100,
              deliveryFee: deliveryFee / 100,
              discount: discount / 100,
              total: total / 100,
            };
          for (const product of products) {
            const quantity = input.items
              .filter((i) => i.productId === product.id)
              .reduce((sum, i) => sum + i.quantity, 0);
            if (product.stock !== null) {
              const changed = await tx.product.updateMany({
                where: { id: product.id, merchantId, stock: { gte: quantity } },
                data: { stock: { decrement: quantity } },
              });
              if (!changed.count)
                throw new ApiError(
                  409,
                  "STOCK",
                  "Estoque insuficiente: " + product.name,
                );
            }
          }
          const phone = input.phone.replace(/\D/g, "");
          const customer = await tx.customer.upsert({
            where: { merchantId_phone: { merchantId, phone } },
            create: {
              merchantId,
              name: input.name,
              phone,
              whatsappConsent: input.whatsappConsent,
            },
            update: {
              name: input.name,
              ...(input.whatsappConsent ? { whatsappConsent: true } : {}),
            },
          });
          const address =
            input.type === "DELIVERY"
              ? [
                  input.street + ", " + input.number,
                  input.complement,
                  input.neighborhood,
                  merchant.deliveryCity
                    ? merchant.deliveryCity + "/" + merchant.deliveryState
                    : input.city
                      ? input.city + (input.state ? "/" + input.state : "")
                      : "",
                  input.reference,
                ]
                  .filter(Boolean)
                  .join(" — ")
              : null;
          const order = await tx.order.create({
            data: {
              merchantId,
              customerId: customer.id,
              type: input.type,
              paymentMethod: input.paymentMethod,
              subtotal: subtotal / 100,
              deliveryFee: deliveryFee / 100,
              discount: discount / 100,
              total: total / 100,
              address,
              notes: input.notes,
              cpf: input.cpf || null,
              cashChangeFor: input.cashChangeFor,
              tableNumber: input.tableNumber,
              scheduledAt: input.scheduledAt
                ? new Date(input.scheduledAt)
                : null,
              conversationId: input.conversationId,
              idempotencyKey: input.idempotencyKey,
              requestHash,
              items: { create: items },
              events: { create: { status: "RECEIVED", userId } },
            },
            include,
          });
          await audit(
            tx,
            merchantId,
            userId || null,
            "Order",
            order.id,
            "CREATED",
            { code: order.code },
          );
          await enqueue(tx, merchantId, order.id, "RECEIVED");
          return order;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
  throw new ApiError(409, "CONFLICT", "Tente confirmar novamente.");
}
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["DELIVERING", "FINISHED", "CANCELED"],
  DELIVERING: ["FINISHED", "CANCELED"],
  FINISHED: [],
  CANCELED: [],
};
export async function changeStatus(
  merchantId: string,
  userId: string,
  id: string,
  status: OrderStatus,
  role: string,
) {
  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, merchantId },
        include: { items: true },
      });
      if (!order)
        throw new ApiError(404, "NOT_FOUND", "Pedido não encontrado.");
      if (!transitions[order.status].includes(status))
        throw new ApiError(
          409,
          "STATUS",
          "Transição inválida. Atualize os pedidos.",
        );
      if (!canChangeOrderStatus(role, status))
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Seu perfil não pode aplicar este status.",
        );
      if (status === "DELIVERING" && order.type !== "DELIVERY")
        throw new ApiError(400, "STATUS", "Pedido não é de entrega.");
      if (status === "CANCELED")
        for (const item of order.items)
          if (item.productId)
            await tx.product.updateMany({
              where: { id: item.productId, merchantId, stock: { not: null } },
              data: { stock: { increment: item.quantity } },
            });
      const changed = await tx.order.updateMany({
        where: { id, merchantId, status: order.status },
        data: { status },
      });
      if (!changed.count)
        throw new ApiError(409, "STATUS", "Pedido alterado por outro usuário.");
      await tx.orderEvent.create({ data: { orderId: id, status, userId } });
      await audit(
        tx,
        merchantId,
        userId,
        "Order",
        id,
        status === "CANCELED" ? "CANCELED" : "STATUS_CHANGED",
        { from: order.status, to: status },
      );
      await enqueue(tx, merchantId, id, status);
      return tx.order.findUniqueOrThrow({ where: { id }, include });
    },
    { isolationLevel: "Serializable" },
  );
}
