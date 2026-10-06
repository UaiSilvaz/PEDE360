import test from "node:test";
import assert from "node:assert/strict";
import { phoneSchema } from "../lib/phone";
test("telefone aceita formato brasileiro e preserva país explícito", () => {
  assert.equal(phoneSchema.parse("(11) 99999-9999"), "5511999999999");
  assert.equal(phoneSchema.parse("(11) 3333-4444"), "551133334444");
  assert.equal(phoneSchema.parse("5511999999999"), "5511999999999");
  assert.equal(phoneSchema.parse("+1 202 555 0123"), "12025550123");
  assert.equal(phoneSchema.safeParse("123").success, false);
});
