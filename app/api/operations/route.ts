import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint, ok, json, ApiError } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { audit } from "@/lib/services/audit";
import type { Permission } from "@/lib/security/permissions";
const permissions: Record<string, Permission> = {
  customers: "customers",
  couriers: "orders.read",
  zones: "settings",
  tables: "orders.write",
  cash: "finance",
  coupons: "catalog",
  summary: "orders.read",
  audit: "audit",
  staff: "staff",
};
export const GET = endpoint(async (request) => {
  const kind = new URL(request.url).searchParams.get("kind") || "summary";
  if (!permissions[kind])
    throw new ApiError(404, "NOT_FOUND", "Seção inválida.");
  const user = await authorize(request, permissions[kind]);
  const merchantId = user.merchantId;
  if (kind === "customers")
    return ok(
      await db.customer.findMany({
        where: { merchantId },
        include: {
          orders: {
            select: {
              id: true,
              code: true,
              total: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { name: "asc" },
        take: 500,
      }),
    );
  if (kind === "couriers")
    return ok(
      await db.courier.findMany({
        where: { merchantId },
        include: {
          orders: {
            where: { status: "FINISHED" },
            select: { id: true, total: true },
          },
        },
      }),
    );
  if (kind === "zones")
    return ok(await db.deliveryZone.findMany({ where: { merchantId } }));
  if (kind === "tables") {
    const tables = await db.diningTable.findMany({
      where: { merchantId },
      orderBy: { number: "asc" },
    });
    const consumption = await db.order.groupBy({
      by: ["tableNumber"],
      where: {
        merchantId,
        type: "TABLE",
        status: { notIn: ["FINISHED", "CANCELED"] },
      },
      _sum: { total: true },
    });
    return ok(
      tables.map((table) => ({
        ...table,
        total: Number(
          consumption.find((row) => row.tableNumber === table.number)?._sum
            .total || 0,
        ),
      })),
    );
  }
  if (kind === "coupons")
    return ok(await db.coupon.findMany({ where: { merchantId } }));
  if (kind === "cash")
    return ok(
      await db.cashSession.findMany({
        where: { merchantId },
        include: { movements: true },
        orderBy: { openedAt: "desc" },
        take: 50,
      }),
    );
  if (kind === "staff")
    return ok(
      await db.user.findMany({
        where: { merchantId },
        select: { id: true, name: true, email: true, role: true },
      }),
    );
  if (kind === "audit")
    return ok(
      await db.auditLog.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  const orders = await db.order.findMany({
    where: {
      merchantId,
      status: { not: "CANCELED" },
      createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
    select: {
      total: true,
      status: true,
      type: true,
      createdAt: true,
      items: { select: { name: true, quantity: true, total: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const customers = await db.customer.count({ where: { merchantId } });
  return ok({ orders, customers });
});
const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("zone"),
    id: z.string().optional(),
    name: z.string().min(2).max(100),
    fee: z.number().min(0).max(10000),
    active: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal("courier"),
    id: z.string().optional(),
    name: z.string().min(2).max(120),
    phone: z.string().regex(/^\d{10,15}$/),
    feeValue: z.number().min(0).max(10000),
    active: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal("table"),
    id: z.string().optional(),
    number: z.string().min(1).max(20),
    occupied: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("coupon"),
    id: z.string().optional(),
    code: z
      .string()
      .min(3)
      .max(40)
      .transform((v) => v.toUpperCase()),
    percent: z.number().int().min(1).max(100),
    minimum: z.number().min(0),
    active: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal("cash-open"),
    openingAmount: z.number().min(0).max(1000000),
  }),
  z.object({
    kind: z.literal("cash-close"),
    id: z.string(),
    closingAmount: z.number().min(0).max(1000000),
  }),
  z.object({
    kind: z.literal("movement"),
    id: z.string(),
    amount: z
      .number()
      .min(-1000000)
      .max(1000000)
      .refine((v) => v !== 0),
    notes: z.string().min(3).max(500),
  }),
]);
export const POST = endpoint(async (request) => {
  const input = schema.parse(await json(request));
  const permission: Permission =
    input.kind === "zone"
      ? "settings"
      : input.kind === "coupon"
        ? "catalog"
        : input.kind.startsWith("cash") || input.kind === "movement"
          ? "finance"
          : "orders.write";
  const user = await authorize(request, permission);
  const merchantId = user.merchantId;
  const result = await db.$transaction(
    async (tx) => {
      let item: { id: string };
      if (input.kind === "zone") {
        const { kind: _kind, id, ...data } = input;
        item = id
          ? await tx.deliveryZone.update({ where: { id, merchantId }, data })
          : await tx.deliveryZone.create({ data: { ...data, merchantId } });
      } else if (input.kind === "courier") {
        const { kind: _kind, id, ...data } = input;
        item = id
          ? await tx.courier.update({ where: { id, merchantId }, data })
          : await tx.courier.create({ data: { ...data, merchantId } });
      } else if (input.kind === "table") {
        const { kind: _kind, id, ...data } = input;
        item = id
          ? await tx.diningTable.update({ where: { id, merchantId }, data })
          : await tx.diningTable.create({ data: { ...data, merchantId } });
      } else if (input.kind === "coupon") {
        const { kind: _kind, id, ...data } = input;
        item = id
          ? await tx.coupon.update({ where: { id, merchantId }, data })
          : await tx.coupon.create({ data: { ...data, merchantId } });
      } else if (input.kind === "cash-open") {
        if (
          await tx.cashSession.findFirst({
            where: { merchantId, closedAt: null },
          })
        )
          throw new ApiError(409, "CASH_OPEN", "Já existe um caixa aberto.");
        item = await tx.cashSession.create({
          data: {
            merchantId,
            openedBy: user.id,
            openingAmount: input.openingAmount,
          },
        });
      } else {
        const cash = await tx.cashSession.findFirst({
          where: { id: input.id, merchantId, closedAt: null },
        });
        if (!cash)
          throw new ApiError(409, "CASH_CLOSED", "Caixa não está aberto.");
        if (input.kind === "cash-close")
          item = await tx.cashSession.update({
            where: { id: cash.id },
            data: { closingAmount: input.closingAmount, closedAt: new Date() },
          });
        else
          item = await tx.cashMovement.create({
            data: {
              sessionId: cash.id,
              amount: input.amount,
              notes: input.notes,
            },
          });
      }
      await audit(
        tx,
        merchantId,
        user.id,
        input.kind,
        item.id,
        input.kind === "cash-open"
          ? "OPENED"
          : input.kind === "cash-close"
            ? "CLOSED"
            : "SAVED",
      );
      return item;
    },
    { isolationLevel: "Serializable" },
  );
  return ok(result);
});
