import { db } from "@/lib/db";
import { endpoint, ok, json, ApiError } from "@/lib/api";
import { authorize } from "@/lib/security/auth";
import { productSchema, categorySchema } from "@/lib/schemas/catalog";
import { audit } from "@/lib/services/audit";
import { ownedImage, cleanupImage } from "@/lib/storage";
export const GET = endpoint(async (request) => {
  const user = await authorize(request, "catalog");
  return ok(
    await db.merchant.findUnique({
      where: { id: user.merchantId },
      select: {
        categories: { orderBy: { position: "asc" } },
        products: {
          include: {
            optionGroups: {
              include: { options: true },
              orderBy: { position: "asc" },
            },
          },
        },
        slug: true,
      },
    }),
  );
});
export const POST = endpoint(async (request) => {
  const user = await authorize(request, "catalog");
  const raw = await json(request);
  const category = raw.kind === "category";
  const input = category ? categorySchema.parse(raw) : productSchema.parse(raw);
  await ownedImage(user.merchantId, input.imageKey, input.imageUrl);
  let oldKey: string | null | undefined;
  const result = await db.$transaction(async (tx) => {
    if (category) {
      const value = categorySchema.parse(input);
      const old = value.id
        ? await tx.category.findFirst({
            where: { id: value.id, merchantId: user.merchantId },
          })
        : null;
      if (value.id && !old)
        throw new ApiError(404, "NOT_FOUND", "Categoria não encontrada.");
      oldKey = old?.imageKey;
      const { id, ...data } = value;
      const item = id
        ? await tx.category.update({
            where: { id, merchantId: user.merchantId },
            data,
          })
        : await tx.category.create({
            data: { ...data, merchantId: user.merchantId },
          });
      await audit(
        tx,
        user.merchantId,
        user.id,
        "Category",
        item.id,
        id ? "UPDATED" : "CREATED",
      );
      return item;
    }
    const value = productSchema.parse(input);
    if (
      value.categoryId &&
      !(await tx.category.findFirst({
        where: { id: value.categoryId, merchantId: user.merchantId },
      }))
    )
      throw new ApiError(400, "CATEGORY", "Categoria inválida.");
    const old = value.id
      ? await tx.product.findFirst({
          where: { id: value.id, merchantId: user.merchantId },
        })
      : null;
    if (value.id && !old)
      throw new ApiError(404, "NOT_FOUND", "Produto não encontrado.");
    oldKey = old?.imageKey;
    const { id, optionGroups, ...data } = value;
    const groups = {
      create: optionGroups.map((g, position) => ({
        ...g,
        position,
        options: {
          create: g.options.map((o, position) => ({ ...o, position })),
        },
      })),
    };
    const item = id
      ? await tx.product.update({
          where: { id, merchantId: user.merchantId },
          data: { ...data, optionGroups: { deleteMany: {}, ...groups } },
        })
      : await tx.product.create({
          data: { ...data, merchantId: user.merchantId, optionGroups: groups },
        });
    await audit(
      tx,
      user.merchantId,
      user.id,
      "Product",
      item.id,
      id ? "UPDATED" : "CREATED",
    );
    return item;
  });
  if (oldKey !== input.imageKey) await cleanupImage(user.merchantId, oldKey);
  return ok(result);
});
