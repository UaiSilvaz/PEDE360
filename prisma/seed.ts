import { PrismaClient } from "@prisma/client";
import { products } from "../lib/data";
import { hashPassword } from "../lib/security/password";
const db = new PrismaClient();
async function main() {
  const merchant = await db.merchant.upsert({
    where: { slug: "demo" },
    create: {
      name: "Agora na Brasa",
      slug: "demo",
      description:
        "Hambúrgueres artesanais, pizzas e porções. Cardápio de exemplo para explorar o PEDE360.",
      isOpen: true,
      deliveryMinimum: 20,
      pickupMinimum: 0,
      address: "Configure o endereço em Configurações",
      notifications: { create: {} },
    },
    update: {},
  });
  for (const name of [...new Set(products.map((p) => p.category))]) {
    const id =
      "demo-category-" +
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    await db.category.upsert({
      where: { id },
      create: { id, merchantId: merchant.id, name },
      update: {},
    });
    for (const product of products.filter((p) => p.category === name))
      await db.product.upsert({
        where: { id: "demo-product-" + product.id },
        create: {
          id: "demo-product-" + product.id,
          merchantId: merchant.id,
          categoryId: id,
          name: product.name,
          description: product.description,
          price: product.price,
          active: product.active,
          featured: product.featured || false,
        },
        update: {},
      });
  }
  for (const [index, name, fee] of [
    [1, "Centro", 5],
    [2, "Jardim Paulista", 7],
  ] as const)
    await db.deliveryZone.upsert({
      where: { id: "demo-zone-" + index },
      create: { id: "demo-zone-" + index, merchantId: merchant.id, name, fee },
      update: {},
    });
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  if (email && password) {
    if (password.length < 12)
      throw new Error("Use uma senha de pelo menos 12 caracteres.");
    await db.user.upsert({
      where: { merchantId_email: { merchantId: merchant.id, email } },
      create: {
        merchantId: merchant.id,
        name: "Administrador",
        email,
        password: hashPassword(password),
        role: "OWNER",
      },
      update: {},
    });
  }
  console.log(
    "Loja demo criada sem pedidos ou indicadores fictícios. Cadastre seu estabelecimento em /cadastro.",
  );
}
main().finally(() => db.$disconnect());
