import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHmac } from "node:crypto";
import { encrypt, decrypt } from "../lib/security/encryption";
import { hashPassword, verifyPassword } from "../lib/security/password";
import { can } from "../lib/security/permissions";
import { priceItem, cents } from "../lib/services/pricing";
import { orderSchema } from "../lib/schemas/order";
import { whatsappLink } from "../lib/whatsapp/link";
import { verifySignature, shouldAdvanceMessage } from "../lib/whatsapp/webhook";
import { validateKey } from "../lib/storage/provider";
const product = {
  id: "p1",
  name: "Hambúrguer",
  active: true,
  price: "19.90",
  optionGroups: [
    {
      id: "g1",
      name: "Tamanho",
      min: 1,
      max: 1,
      required: true,
      options: [
        { id: "o1", name: "Grande", price: "5.10", active: true },
        { id: "o2", name: "Pequeno", price: 0, active: true },
      ],
    },
  ],
};
test("preço usa valores do catálogo e adicionais em centavos", () => {
  const item = priceItem(product, 3, ["o1"]);
  assert.equal(item.total, 75);
  assert.equal(item.unitPrice, 25);
  assert.equal(cents("0.29"), 29);
});
test("rejeita adicionais obrigatórios ausentes, repetidos, de outro produto e seleção excessiva", () => {
  for (const ids of [[], ["o1", "o1"], ["foreign"], ["o1", "o2"]])
    assert.throws(() => priceItem(product, 1, ids));
});
test("rejeita produto e adicional pausados", () => {
  assert.throws(() => priceItem({ ...product, active: false }, 1, ["o1"]));
  assert.throws(() =>
    priceItem(
      {
        ...product,
        optionGroups: [
          {
            ...product.optionGroups[0],
            options: [{ ...product.optionGroups[0].options[0], active: false }],
          },
        ],
      },
      1,
      ["o1"],
    ),
  );
});
test("schema não aceita preços arbitrários no pedido", () => {
  const input = {
    idempotencyKey: crypto.randomUUID(),
    type: "PICKUP",
    name: "Cliente",
    phone: "5511999999999",
    paymentMethod: "Pix",
    items: [{ productId: "p1", quantity: 1, optionIds: ["o1"], price: 0.01 }],
    subtotal: 0.01,
  };
  assert.equal(orderSchema.safeParse(input).success, false);
});
test("criptografia autenticada protege tokens e detecta adulteração", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const value = encrypt("token-sensivel");
  assert.equal(decrypt(value), "token-sensivel");
  const parts = value.split(".");
  parts[2] = randomBytes(16).toString("base64");
  assert.throws(() => decrypt(parts.join(".")));
});
test("senhas têm salt e comparação segura", () => {
  const a = hashPassword("senha-de-teste-segura");
  const b = hashPassword("senha-de-teste-segura");
  assert.notEqual(a, b);
  assert(verifyPassword("senha-de-teste-segura", a));
  assert(!verifyPassword("incorreta", a));
});
test("permissões são restritas por perfil", () => {
  assert(can("OWNER", "settings"));
  assert(!can("KITCHEN", "settings"));
  assert(!can("DELIVERY", "finance"));
  assert(!can("unknown", "orders.read"));
});
test("assinatura HMAC exige corpo original e secret", () => {
  const raw = '{"test":true}';
  const secret = "test-secret";
  const signature =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  assert(verifySignature(raw, signature, secret));
  assert(!verifySignature(raw + " ", signature, secret));
  assert(!verifySignature(raw, null, secret));
  assert(!verifySignature(raw, signature, ""));
});
test("webhooks fora de ordem não regridem mensagens lidas", () => {
  assert(shouldAdvanceMessage("SENT", "DELIVERED"));
  assert(shouldAdvanceMessage("DELIVERED", "READ"));
  assert(!shouldAdvanceMessage("READ", "SENT"));
  assert(!shouldAdvanceMessage("DELIVERED", "SENT"));
});
test("wa.me codifica texto sem injetar parâmetros", () => {
  const link = whatsappLink(
    "+55 (11) 99999-9999",
    "Olá & pedido #42\nTotal: R$ 10",
  );
  assert(link);
  assert.equal(
    new URL(link).searchParams.get("text"),
    "Olá & pedido #42\nTotal: R$ 10",
  );
  assert.equal(whatsappLink("123", "teste"), null);
});
test("storage bloqueia caminhos fora da pasta", () => {
  assert.throws(() => validateKey("../.env"));
  assert.throws(() => validateKey("tenant/products/../../secret"));
  assert.equal(
    validateKey("tenant/products/file.webp"),
    "tenant/products/file.webp",
  );
});
