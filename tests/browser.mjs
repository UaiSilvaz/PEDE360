import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.APP_URL || "http://localhost:3000";
const slug = "browser-" + randomBytes(5).toString("hex");
const password = randomBytes(24).toString("hex");
const db = new PrismaClient();
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(20000);
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame())
    console.log("Browser route: " + new URL(frame.url()).pathname);
});
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(base + "/cadastro");
  await page.getByLabel("Estado atendido", { exact: true }).selectOption("SP");
  await page.waitForFunction(
    () => !!document.querySelector('option[value="3500204"]'),
  );
  await page
    .getByLabel("Cidade atendida", { exact: true })
    .selectOption("3500204");
  await page
    .getByLabel("WhatsApp da loja", { exact: true })
    .fill("5511999999999");
  await page.getByLabel("Seu nome").fill("Gestor de teste");
  await page.getByLabel("Nome do estabelecimento").fill("Cozinha de teste");
  await page.getByLabel("Endereço do cardápio", { exact: true }).fill(slug);
  await page.getByLabel("E-mail", { exact: true }).fill("browser@example.test");
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Criar estabelecimento", exact: true })
    .click();
  await page.waitForURL(base + "/configuracoes/integracoes/whatsapp");
  await page.goto(base + "/painel");
  await page
    .getByRole("heading", { name: "Seu negócio, mais leve." })
    .waitFor();
  await mkdir(".local/screenshots", { recursive: true });
  await page.getByText("Monte seu cardápio", { exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector(".skeleton-stack"));
  await page.screenshot({
    path: ".local/screenshots/home-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Abrir loja para pedidos" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Pausar pedidos da loja" })
    .first()
    .waitFor();
  await page
    .getByRole("button", { name: "Compartilhar cardápio" })
    .first()
    .click();
  assert.equal(
    await page.getByLabel("Link do seu cardápio").inputValue(),
    base + "/loja/" + slug,
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar link" }).click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    base + "/loja/" + slug,
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.goto(base + "/configuracoes/integracoes/whatsapp");
  await page
    .getByLabel("WhatsApp da loja", { exact: true })
    .fill("(11) 99999-9999");
  await page.getByRole("button", { name: "Salvar meu WhatsApp" }).click();
  await page.getByText("WhatsApp da loja salvo!", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Conferir meu número no WhatsApp" })
      .getAttribute("href"),
    "https://wa.me/5511999999999",
  );
  assert.equal(
    await page.locator(".advanced-settings").getAttribute("open"),
    null,
  );
  await page.screenshot({
    path: ".local/screenshots/whatsapp-desktop.png",
    fullPage: true,
  });
  await page.goto(base + "/configuracoes?section=aparencia");
  await page
    .getByRole("heading", { name: "Fotos e marca", exact: true })
    .waitFor();
  await page.goto(base + "/configuracoes");
  await page
    .getByLabel("WhatsApp da loja", { exact: true })
    .fill("(11) 99999-9999");
  await page.getByLabel("Endereço para retirada").fill("Rua das Flores, 123");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.getByText("Configurações salvas.", { exact: true }).waitFor();
  await page.screenshot({
    path: ".local/screenshots/settings-desktop.png",
    fullPage: true,
  });
  await page.goto(base + "/cardapio");
  await page
    .getByRole("button", { name: "Nova categoria", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill("Lanches");
  await page.getByRole("button", { name: "Salvar categoria" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Novo produto", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Burger da casa");
  await dialog.getByLabel("Preço (R$)").fill("25");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Hambúrguer com queijo e molho da casa.");
  await dialog.getByRole("button", { name: "Salvar produto" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Burger da casa", exact: true })
    .waitFor();
  await mkdir(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/catalog-desktop.png",
    fullPage: true,
  });
  const publicContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const shop = await publicContext.newPage();
  shop.on("pageerror", (e) => errors.push(e.message));
  await shop.goto(base + "/loja/" + slug);
  await page
    .getByRole("button", { name: "Pausar pedidos da loja" })
    .first()
    .click();
  await page.getByRole("button", { name: "Sim, pausar pedidos" }).click();
  await page
    .getByRole("button", { name: "Abrir loja para pedidos" })
    .first()
    .waitFor();
  await shop.reload();
  assert(
    await shop
      .getByRole("button", { name: "Adicionar Burger da casa", exact: true })
      .isDisabled(),
  );
  await shop.locator("#store-closed-notice").waitFor();
  await page
    .getByRole("button", { name: "Abrir loja para pedidos" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Pausar pedidos da loja" })
    .first()
    .waitFor();
  await shop.reload();
  await shop
    .getByRole("button", { name: "Adicionar Burger da casa", exact: true })
    .click();
  await shop.getByRole("button", { name: /Adicionar ·/ }).click();
  await shop.getByRole("button", { name: /Ver pedido/ }).click();
  await shop
    .getByRole("button", { name: "Continuar para identificação" })
    .click();
  await shop.getByLabel("Nome", { exact: true }).fill("Cliente mobile");
  await shop
    .getByLabel("Telefone / WhatsApp", { exact: true })
    .fill("5511988887777");
  await shop.getByRole("button", { name: "Continuar", exact: true }).click();
  await shop.getByRole("button", { name: "Continuar", exact: true }).click();
  await shop
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await shop.getByRole("heading", { name: "Confira seu pedido" }).waitFor();
  await shop.screenshot({
    path: ".local/screenshots/checkout-mobile.png",
    fullPage: true,
  });
  await shop
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await shop.getByText("Pedido recebido", { exact: true }).waitFor();
  assert(
    await shop
      .getByRole("link", { name: "Enviar pedido pelo WhatsApp" })
      .getAttribute("href"),
  );
  await page.goto(base + "/pedidos");
  await page.getByText("Cliente mobile", { exact: true }).click();
  await page.getByRole("button", { name: "Confirmado", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByText("Confirmado", { exact: true })
    .first()
    .waitFor();
  await page.screenshot({
    path: ".local/screenshots/order-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  for (const route of [
    "/whatsapp",
    "/configuracoes/integracoes/whatsapp",
    "/clientes",
    "/caixa",
    "/mesas",
    "/marketing",
    "/equipe",
    "/perfil",
    "/relatorios",
    "/entregas",
    "/pdv",
  ]) {
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    await page.waitForFunction(
      () => !document.querySelector(".skeleton-stack"),
    );
  }
  await shop.getByRole("button", { name: "Concluir", exact: true }).click();
  await shop.screenshot({
    path: ".local/screenshots/store-mobile.png",
    fullPage: true,
  });
  const overflow = await shop.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  assert(!overflow, "Public menu must fit mobile width");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/painel",
    "/configuracoes",
    "/configuracoes/integracoes/whatsapp",
  ]) {
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    await page.waitForFunction(
      () => !document.querySelector(".skeleton-stack"),
    );
    await page.screenshot({
      path:
        ".local/screenshots/" +
        (route === "/painel"
          ? "home"
          : route.endsWith("whatsapp")
            ? "whatsapp"
            : "settings") +
        "-mobile.png",
      fullPage: true,
    });
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )),
      "Admin must fit mobile: " + route,
    );
  }
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page.getByRole("link", { name: "Início", exact: true }).click();
  await page
    .getByRole("heading", { name: "Seu negócio, mais leve." })
    .waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Alternar tema" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.waitForFunction(() => !document.querySelector(".skeleton-stack"));
  await page.screenshot({
    path: ".local/screenshots/home-dark.png",
    fullPage: true,
  });
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "Browser flow passed: cadastro → configuração → categoria → produto → checkout mobile → painel → status. Rotas administrativas e responsividade verificadas.",
  );
  await publicContext.close();
} finally {
  await context.close();
  await browser.close();
  await db.merchant.deleteMany({ where: { slug } });
  await db.$disconnect();
}
