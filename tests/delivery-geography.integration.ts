import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { createOrder } from "../lib/services/orders";
import { orderSchema } from "../lib/schemas/order";

async function main() {
  const merchant = await db.merchant.create({
    data: {
      name: "Delivery geography",
      slug: "geography-" + randomBytes(6).toString("hex"),
      isOpen: true,
      deliveryState: "SP",
      deliveryCityId: "3500204",
      deliveryCity: "Adolfo",
      deliveryZones: {
        create: [
          { name: "Toda a cidade", fee: 5 },
          { name: "Centro", fee: 7 },
        ],
      },
      products: { create: { name: "Test item", price: 20, active: true } },
    },
    include: { deliveryZones: true, products: true },
  });
  try {
    const general = merchant.deliveryZones.find(
      (zone) => zone.name === "Toda a cidade",
    )!;
    const central = merchant.deliveryZones.find(
      (zone) => zone.name === "Centro",
    )!;
    const input = orderSchema.parse({
      idempotencyKey: randomUUID(),
      type: "DELIVERY",
      name: "Delivery test",
      phone: "5511999999999",
      paymentMethod: "Pix",
      cityId: "3500204",
      city: "Adolfo",
      state: "SP",
      street: "RUA CASTRO ALVES",
      number: "10",
      neighborhood: "CENTRO",
      deliveryZoneId: central.id,
      items: [{ productId: merchant.products[0].id, quantity: 1 }],
    });
    assert.equal(
      (
        await createOrder(merchant.id, input, undefined, true)
      ).deliveryFee.toString(),
      "7",
    );
    await assert.rejects(
      createOrder(
        merchant.id,
        { ...input, cityId: "3550308", city: "São Paulo" },
        undefined,
        true,
      ),
      /somente em Adolfo/,
    );
    await assert.rejects(
      createOrder(
        merchant.id,
        { ...input, cityId: "", city: "Outra cidade" },
        undefined,
        true,
      ),
      /somente em Adolfo/,
    );
    await assert.rejects(
      createOrder(merchant.id, { ...input, state: "MG" }, undefined, true),
      /somente em Adolfo/,
    );
    await assert.rejects(
      createOrder(
        merchant.id,
        { ...input, deliveryZoneId: general.id },
        undefined,
        true,
      ),
      /correspondente ao bairro/,
    );
    const manual = {
      ...input,
      idempotencyKey: randomUUID(),
      cityId: "",
      city: " adolfo ",
      neighborhood: "Bairro novo",
      street: "Rua nova",
      deliveryZoneId: general.id,
    };
    const order = await createOrder(merchant.id, manual);
    assert(
      "address" in order &&
        order.address?.includes("Rua nova, 10") &&
        order.address.includes("Bairro novo") &&
        order.address.includes("Adolfo/SP"),
    );
    console.log(
      "PASS: city/state enforcement, correct neighborhood fee, manual Other address and canonical city persisted.",
    );
  } finally {
    await db.merchant.delete({ where: { id: merchant.id } });
    await db.$disconnect();
  }
}
void main();
