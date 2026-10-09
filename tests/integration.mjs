import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
const base = process.env.APP_URL || "http://localhost:3000";
const db = new PrismaClient();
const suffix = randomBytes(5).toString("hex");
const slugs = ["test-a-" + suffix, "test-b-" + suffix];
const password = randomBytes(24).toString("hex");
async function call(
  path,
  { body, cookie, method = "GET", origin = base } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(path + ": " + response.status + " non-JSON");
  }
  return {
    status: response.status,
    data: result.data,
    error: result.error,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
let passed = 0;
function check(value, message) {
  assert(value, message);
  passed++;
  console.log("PASS " + message);
}
try {
  check(
    (await call("/api/orders")).status === 401,
    "pedidos protegidos sem sessão",
  );
  const a = await call("/api/auth/register", {
    method: "POST",
    body: {
      name: "Owner A",
      store: "Teste A",
      slug: slugs[0],
      email: "a@example.test",
      password,
      deliveryState: "SP",
      deliveryCityId: "3500204",
    },
  });
  check(a.status === 201 && a.cookie, "cadastro cria sessão HttpOnly");
  const ca = a.cookie;
  const b = await call("/api/auth/register", {
    method: "POST",
    body: {
      name: "Owner B",
      store: "Teste B",
      slug: slugs[1],
      email: "b@example.test",
      password,
      deliveryState: "SP",
      deliveryCityId: "3500204",
    },
  });
  check(b.status === 201 && b.cookie, "segundo estabelecimento independente");
  const cb = b.cookie;
  check(
    (await call("/api/settings", { method: "PATCH", body: { isOpen: true } }))
      .status === 401,
    "abrir loja exige sessão",
  );
  check(
    (
      await call("/api/settings", {
        method: "PATCH",
        cookie: ca,
        body: { isOpen: true, merchantId: "other" },
      })
    ).status === 400,
    "ajuste rápido rejeita troca de estabelecimento",
  );
  check(
    (
      await call("/api/settings", {
        method: "PATCH",
        cookie: ca,
        body: { phone: "inválido" },
      })
    ).status === 400,
    "ajuste rápido rejeita telefone inválido",
  );
  const quick = await call("/api/settings", {
    method: "PATCH",
    cookie: ca,
    body: { isOpen: true, phone: "(11) 99999-9999" },
  });
  check(
    quick.status === 200 &&
      quick.data.phone === "5511999999999" &&
      quick.data.isOpen,
    "ajuste rápido abre loja e normaliza telefone",
  );
  check(
    (await call("/api/settings", { cookie: cb })).data.isOpen === false,
    "abrir loja não altera outro estabelecimento",
  );
  check(
    (await call("/api/setup", { cookie: ca })).data.hasPhone === true,
    "guia inicial reflete configuração salva",
  );
  check(
    (
      await call("/api/settings", {
        method: "PUT",
        cookie: ca,
        origin: "https://malicious.example",
        body: {},
      })
    ).status === 403,
    "CSRF bloqueia outra origem",
  );
  const settings = (await call("/api/settings", { cookie: ca })).data;
  const updated = await call("/api/settings", {
    method: "PUT",
    cookie: ca,
    body: {
      ...settings,
      name: "Teste A",
      phone: "5511999999999",
      description: "Teste",
      address: "Rua do teste, 10",
      estimatedTime: "30 min",
      deliveryMinimum: 10,
      pickupMinimum: 0,
      isOpen: true,
      logoUrl: null,
      logoKey: null,
      coverUrl: null,
      coverKey: null,
      hours: undefined,
    },
  });
  check(updated.status === 200, "configurações persistidas");
  const cat = await call("/api/catalog", {
    method: "POST",
    cookie: ca,
    body: { kind: "category", name: "Lanches", active: true },
  });
  check(cat.status === 200, "categoria criada");
  const form = new FormData();
  form.set("folder", "products");
  const image = await sharp({
    create: { width: 40, height: 20, channels: 3, background: "#16856a" },
  })
    .png()
    .toBuffer();
  form.set("file", new Blob([image], { type: "image/png" }), "foto teste.png");
  const asset = await call("/api/uploads", {
    method: "POST",
    cookie: ca,
    body: form,
  });
  check(
    asset.status === 201 && asset.data.imageUrl.endsWith(".webp"),
    "upload valida e converte para WebP",
  );
  check(
    (await fetch(base + asset.data.imageUrl)).status === 200,
    "imagem local é servida",
  );
  const productInput = {
    name: "Produto teste",
    description: "Descrição",
    categoryId: cat.data.id,
    price: 20,
    active: true,
    featured: true,
    ...asset.data,
    optionGroups: [
      {
        name: "Tamanho",
        min: 1,
        max: 1,
        required: true,
        options: [{ name: "Grande", price: 5, active: true }],
      },
    ],
  };
  const p = await call("/api/catalog", {
    method: "POST",
    cookie: ca,
    body: productInput,
  });
  check(p.status === 200, "produto com imagem e adicionais salvo");
  check(
    (
      await call("/api/catalog", {
        method: "POST",
        cookie: cb,
        body: { ...productInput, id: p.data.id, categoryId: null },
      })
    ).status >= 400,
    "outro tenant não pode alterar produto nem usar imagem",
  );
  const store = (await call("/api/store/" + slugs[0])).data;
  const option = store.products[0].optionGroups[0].options[0];
  const zone = await call("/api/operations", {
    method: "POST",
    cookie: ca,
    body: { kind: "zone", name: "Centro", fee: 6, active: true },
  });
  await call("/api/operations", {
    method: "POST",
    cookie: ca,
    body: {
      kind: "coupon",
      code: "TESTE10",
      percent: 10,
      minimum: 0,
      active: true,
    },
  });
  const orderInput = {
    idempotencyKey: randomUUID(),
    type: "DELIVERY",
    name: "Cliente teste",
    phone: "5511999888777",
    street: "Rua A",
    cityId: "3500204",
    city: "Adolfo",
    state: "SP",
    number: "10",
    neighborhood: "Centro",
    deliveryZoneId: zone.data.id,
    paymentMethod: "Pix",
    coupon: "TESTE10",
    whatsappConsent: false,
    items: [
      {
        productId: p.data.id,
        quantity: 2,
        optionIds: [option.id],
        notes: "Sem cebola",
      },
    ],
  };
  const quote = await call("/api/store/" + slugs[0] + "/orders?quote=true", {
    method: "POST",
    body: orderInput,
  });
  check(
    quote.status === 200 && quote.data.total === 51,
    "servidor calcula 50 + 6 de entrega - 5 de desconto",
  );
  check(
    (
      await call("/api/store/" + slugs[0] + "/orders", {
        method: "POST",
        body: { ...orderInput, subtotal: 0.01 },
      })
    ).status === 400,
    "subtotal adulterado é rejeitado",
  );
  check(
    (
      await call("/api/store/" + slugs[1] + "/orders", {
        method: "POST",
        body: orderInput,
      })
    ).status >= 400,
    "loja não aceita produto de outro tenant",
  );
  const order = await call("/api/store/" + slugs[0] + "/orders", {
    method: "POST",
    body: orderInput,
  });
  check(
    order.status === 200 && Number(order.data.total) === 51,
    "checkout cria pedido real",
  );
  const repeat = await call("/api/store/" + slugs[0] + "/orders", {
    method: "POST",
    body: orderInput,
  });
  check(repeat.data.id === order.data.id, "retry não duplica pedido");
  const changed = await call("/api/store/" + slugs[0] + "/orders", {
    method: "POST",
    body: { ...orderInput, name: "Outro" },
  });
  check(
    changed.status === 409,
    "idempotência não reaproveita comprovante com payload diferente",
  );
  const ordersA = await call("/api/orders", { cookie: ca });
  const ordersB = await call("/api/orders", { cookie: cb });
  check(
    ordersA.data.length === 1 && ordersB.data.length === 0,
    "pedidos isolados por estabelecimento",
  );
  const advance = await call("/api/orders", {
    method: "PATCH",
    cookie: ca,
    body: { id: order.data.id, status: "CONFIRMED" },
  });
  check(advance.status === 200, "status e timeline persistidos");
  check(
    (
      await call("/api/orders", {
        method: "PATCH",
        cookie: cb,
        body: { id: order.data.id, status: "PREPARING" },
      })
    ).status === 404,
    "outro tenant não altera status",
  );
  check(
    (
      await call("/api/orders", {
        method: "PATCH",
        cookie: ca,
        body: { id: order.data.id, status: "FINISHED" },
      })
    ).status === 409,
    "transição inválida bloqueada",
  );
  const staff = await call("/api/staff", {
    method: "POST",
    cookie: ca,
    body: {
      name: "Cozinha",
      email: "k@example.test",
      password,
      deliveryState: "SP",
      deliveryCityId: "3500204",
      role: "KITCHEN",
    },
  });
  check(staff.status === 200, "funcionário cadastrado");
  const kitchen = await call("/api/auth/login", {
    method: "POST",
    body: { slug: slugs[0], email: "k@example.test", password },
  });
  check(
    (await call("/api/settings", { cookie: kitchen.cookie })).status === 403,
    "RBAC bloqueia configurações para cozinha",
  );
  check(
    (
      await call("/api/settings", {
        method: "PATCH",
        cookie: kitchen.cookie,
        body: { isOpen: false },
      })
    ).status === 403,
    "cozinha não pode pausar a loja",
  );
  check(
    (await call("/api/whatsapp/integration", { cookie: ca })).data.status ===
      "DISCONNECTED",
    "integração não finge conexão sem credenciais",
  );
  const invalid = await call("/api/webhooks/whatsapp", {
    method: "POST",
    body: { object: "whatsapp_business_account", entry: [] },
  });
  check(invalid.status === 401, "webhook sem assinatura rejeitado");
  const logs = await call("/api/operations?kind=audit", { cookie: ca });
  check(
    logs.data.some((l) => l.entityType === "Order") &&
      logs.data.some((l) => l.entityType === "Product"),
    "auditoria registra produtos e pedidos",
  );
  const courier = await call("/api/operations", {
    method: "POST",
    cookie: ca,
    body: {
      kind: "courier",
      name: "Entregador de teste",
      phone: "5511999990000",
      feeValue: 6,
      active: true,
    },
  });
  check(courier.status === 200, "entregador cadastrado");
  const assignment = await call("/api/orders/assignment", {
    method: "PUT",
    cookie: ca,
    body: { orderId: order.data.id, courierId: courier.data.id },
  });
  check(assignment.status === 200, "entregador vinculado ao pedido");
  check(
    (
      await call("/api/orders/assignment", {
        method: "PUT",
        cookie: cb,
        body: { orderId: order.data.id, courierId: courier.data.id },
      })
    ).status === 404,
    "atribuição de entregador respeita tenant",
  );
  const concurrentInput = { ...orderInput, idempotencyKey: randomUUID() };
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      call("/api/store/" + slugs[0] + "/orders", {
        method: "POST",
        body: concurrentInput,
      }),
    ),
  );
  check(
    concurrent.every((r) => r.status === 200) &&
      concurrent[0].data.id === concurrent[1].data.id,
    "confirmações concorrentes criam um único pedido",
  );
  console.log("Integration checks: " + passed + " passed.");
} finally {
  const merchants = await db.merchant.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  });
  const { rm } = await import("node:fs/promises");
  const { resolve, sep } = await import("node:path");
  const root = resolve(".local/uploads");
  for (const m of merchants) {
    const folder = resolve(root, m.id);
    if (folder.startsWith(root + sep))
      await rm(folder, { recursive: true, force: true });
  }
  await db.merchant.deleteMany({ where: { slug: { in: slugs } } });
  await db.$disconnect();
}
