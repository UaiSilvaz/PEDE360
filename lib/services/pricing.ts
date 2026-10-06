import { ApiError } from "@/lib/api";
export const cents = (value: number | string | { toString(): string }) =>
  Math.round(Number(value.toString()) * 100);
type ProductPrice = {
  id: string;
  name: string;
  price: number | string | { toString(): string };
  active: boolean;
  optionGroups: {
    id: string;
    name: string;
    min: number;
    max: number;
    required: boolean;
    options: {
      id: string;
      name: string;
      active: boolean;
      price: number | string | { toString(): string };
    }[];
  }[];
};
export function priceItem(
  product: ProductPrice,
  quantity: number,
  optionIds: string[],
) {
  if (!product.active)
    throw new ApiError(
      400,
      "UNAVAILABLE_PRODUCT",
      "Produto indisponível: " + product.name,
    );
  if (new Set(optionIds).size !== optionIds.length)
    throw new ApiError(400, "OPTIONS", "Adicionais duplicados.");
  const selected = product.optionGroups
    .flatMap((g) => g.options)
    .filter((o) => optionIds.includes(o.id));
  if (selected.length !== optionIds.length || selected.some((o) => !o.active))
    throw new ApiError(400, "OPTIONS", "Adicional inválido ou indisponível.");
  for (const group of product.optionGroups) {
    const count = selected.filter((o) =>
      group.options.some((x) => x.id === o.id),
    ).length;
    if (
      count < Math.max(group.min, group.required ? 1 : 0) ||
      count > group.max
    )
      throw new ApiError(
        400,
        "OPTIONS",
        "Confira as escolhas de " + group.name + ".",
      );
  }
  const unit =
    cents(product.price) + selected.reduce((sum, o) => sum + cents(o.price), 0);
  return {
    productId: product.id,
    name: product.name,
    quantity,
    unitPrice: unit / 100,
    total: (unit * quantity) / 100,
    options: {
      create: selected.map((o) => ({
        name: o.name,
        price: cents(o.price) / 100,
      })),
    },
  };
}
