export function whatsappLink(number: string, message: string) {
  const phone = number.replace(/\D/g, "");
  if (!/^[1-9]\d{9,14}$/.test(phone)) return null;
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}
type Receipt = {
  code: number;
  items: {
    name: string;
    quantity: number;
    total: unknown;
    options: { name: string }[];
    notes: string | null;
  }[];
  subtotal: unknown;
  deliveryFee: unknown;
  discount: unknown;
  total: unknown;
  customer: { name: string; phone: string } | null;
  address: string | null;
  paymentMethod: string | null;
  notes: string | null;
  type: string;
};
export function orderMessage(order: Receipt) {
  const money = (v: unknown) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return [
    "Novo pedido",
    "Pedido #" + order.code,
    "",
    ...order.items.map(
      (i) =>
        i.quantity +
        "x " +
        i.name +
        (i.options.length
          ? " (" + i.options.map((o) => o.name).join(", ") + ")"
          : "") +
        (i.notes ? " — " + i.notes : "") +
        " · " +
        money(i.total),
    ),
    "",
    "Subtotal: " + money(order.subtotal),
    "Entrega: " + money(order.deliveryFee),
    "Desconto: " + money(order.discount),
    "Total: " + money(order.total),
    "",
    "Cliente: " + order.customer?.name,
    "Telefone: " + order.customer?.phone,
    order.address
      ? "Entrega: " + order.address
      : "Modalidade: " + (order.type === "PICKUP" ? "Retirada" : order.type),
    "Pagamento: " + order.paymentMethod,
    "Observações: " + (order.notes || "Nenhuma"),
  ].join("\n");
}
