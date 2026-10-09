import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.APP_URL || "http://localhost:3000",
  db = new PrismaClient();
const suffix = randomBytes(6).toString("hex"),
  slug = "geo-browser-" + suffix,
  password = randomBytes(24).toString("hex");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
let merchantId;
try {
  const owner = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await owner.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => errors.push(error.message));
  const mismatch = await owner.request.post(base + "/api/auth/register", {
    headers: { Origin: base },
    data: {
      name: "Geo owner",
      store: "Geo test",
      slug,
      email: slug + "@example.invalid",
      password,
      deliveryState: "MG",
      deliveryCityId: "3500204",
    },
  });
  assert.equal(mismatch.status(), 400);
  await page.goto(base + "/cadastro");
  await page.getByLabel("Seu nome", { exact: true }).fill("Geo owner");
  await page
    .getByLabel("Nome do estabelecimento", { exact: true })
    .fill("Geo test");
  await page.getByLabel("Endereço do cardápio", { exact: true }).fill(slug);
  await page.getByLabel("Estado atendido", { exact: true }).selectOption("SP");
  await page.waitForFunction(
    () => !!document.querySelector('option[value="3500204"]'),
  );
  await page
    .getByLabel("Cidade atendida", { exact: true })
    .selectOption("3500204");
  await page
    .getByLabel("Frete padrão da cidade (R$)", { exact: true })
    .fill("12.50");
  await page
    .getByLabel("WhatsApp da loja", { exact: true })
    .fill("5511999999999");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(slug + "@example.invalid");
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Criar estabelecimento", exact: true })
    .click();
  await page.waitForURL(base + "/configuracoes/integracoes/whatsapp");
  const settings = (
    await (await owner.request.get(base + "/api/settings")).json()
  ).data;
  merchantId = settings.id;
  assert.equal(settings.deliveryState, "SP");
  assert.equal(settings.deliveryCityId, "3500204");
  assert.equal(settings.deliveryCity, "Adolfo");
  const product = await db.product.create({
    data: { merchantId, name: "Produto geográfico", price: 20, active: true },
  });
  assert.equal(
    (
      await owner.request.patch(base + "/api/settings", {
        headers: { Origin: base },
        data: { isOpen: true },
      })
    ).status(),
    200,
  );
  for (let i = 0; i < 20; i++) {
    const response = await owner.request.get(
      base + "/api/geography/addresses?cityId=3500204",
    );
    if ((await response.json()).data.status === "READY") break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  await page.goto(base + "/configuracoes");
  await page.getByLabel("Cidade atendida", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Cidade atendida", { exact: true }).inputValue(),
    "3500204",
  );
  await mkdir(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/geography-owner.png",
    fullPage: true,
  });
  const customer = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  async function checkout() {
    const shop = await customer.newPage();
    shop.setDefaultTimeout(30000);
    shop.on("pageerror", (error) => errors.push(error.message));
    await shop.goto(base + "/loja/" + slug);
    await shop
      .getByRole("button", { name: "Adicionar " + product.name, exact: true })
      .click();
    await shop.getByRole("button", { name: /^Adicionar ·/ }).click();
    await shop.getByRole("button", { name: /Ver pedido/ }).click();
    await shop
      .getByRole("button", {
        name: "Continuar para identificação",
        exact: true,
      })
      .click();
    await shop.getByLabel("Nome", { exact: true }).fill("Cliente geo");
    await shop
      .getByLabel("Telefone / WhatsApp", { exact: true })
      .fill("5511988887777");
    await shop.getByRole("button", { name: "Continuar", exact: true }).click();
    await shop
      .getByLabel("Como receber", { exact: true })
      .selectOption("DELIVERY");
    assert.equal(
      await shop
        .getByLabel("Cidade", { exact: true })
        .locator("option")
        .first()
        .innerText(),
      "Outro",
    );
    assert.equal(
      await shop
        .getByLabel("Bairro", { exact: true })
        .locator("option")
        .first()
        .innerText(),
      "Outro",
    );
    assert.equal(
      await shop
        .getByLabel("Rua", { exact: true })
        .locator("option")
        .first()
        .innerText(),
      "Outro",
    );
    return shop;
  }
  const automatic = await checkout();
  await automatic.waitForFunction(() =>
    [...document.querySelectorAll("select option")].some(
      (option) => option.value === "CENTRO",
    ),
  );
  await automatic.getByLabel("Bairro", { exact: true }).selectOption("CENTRO");
  await automatic.waitForFunction(() =>
    [...document.querySelectorAll("select")].some(
      (select) =>
        select.closest("label")?.textContent?.startsWith("Rua") &&
        select.options.length > 1,
    ),
  );
  const street = await automatic
    .getByLabel("Rua", { exact: true })
    .locator("option")
    .nth(1)
    .getAttribute("value");
  await automatic.getByLabel("Rua", { exact: true }).selectOption(street);
  await automatic.getByLabel("Número", { exact: true }).fill("10");
  await automatic.screenshot({
    path: ".local/screenshots/geography-checkout-automatic.png",
    fullPage: true,
  });
  await automatic
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await automatic
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await automatic
    .getByRole("heading", { name: "Confira seu pedido" })
    .waitFor();
  await automatic
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await automatic.getByText("Pedido recebido", { exact: true }).waitFor();
  const manual = await checkout();
  await manual.getByLabel("Cidade", { exact: true }).selectOption("__other__");
  await manual.getByLabel("Nome da cidade", { exact: true }).fill("São Paulo");
  await manual
    .getByLabel("Nome do bairro", { exact: true })
    .fill("Bairro novo");
  await manual
    .getByLabel("Nome da rua", { exact: true })
    .fill("Rua criada ontem");
  await manual.getByLabel("Número", { exact: true }).fill("20");
  await manual.getByRole("button", { name: "Continuar", exact: true }).click();
  await manual
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await manual
    .getByText("Esta loja entrega somente em Adolfo — SP.", { exact: true })
    .waitFor();
  await manual.getByRole("button", { name: "Voltar", exact: true }).click();
  await manual.getByLabel("Nome da cidade", { exact: true }).fill("Adolfo");
  await manual.screenshot({
    path: ".local/screenshots/geography-checkout-manual.png",
    fullPage: true,
  });
  await manual.getByRole("button", { name: "Continuar", exact: true }).click();
  await manual
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await manual.getByRole("heading", { name: "Confira seu pedido" }).waitFor();
  await manual
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await manual.getByText("Pedido recebido", { exact: true }).waitFor();
  const orders = await db.order.findMany({ where: { merchantId } });
  assert.equal(orders.length, 2);
  assert(
    orders.every(
      (order) =>
        order.address.includes("Adolfo/SP") &&
        Number(order.deliveryFee) === 12.5,
    ),
  );
  assert(orders.some((order) => order.address.includes("Rua criada ontem")));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: official city signup/settings, actual CNEFE choices, Other first/manual fields, automatic and manual delivery checkout, outside-city rejection, freight and canonical addresses persisted, no browser errors.",
  );
} finally {
  await browser.close();
  const found =
    merchantId || (await db.merchant.findUnique({ where: { slug } }))?.id;
  if (found) await db.merchant.delete({ where: { id: found } });
  await db.$disconnect();
}
