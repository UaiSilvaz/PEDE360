import test from "node:test";
import assert from "node:assert/strict";
import { autoReplyText } from "../lib/whatsapp/auto-reply-text";
test("automatic reply always includes the tenant menu on the configured public origin", () => {
  assert.equal(
    autoReplyText("  Welcome  ", "loja-a", "https://menu.example/base"),
    "Welcome\n\nhttps://menu.example/loja/loja-a",
  );
  assert.equal(
    autoReplyText("Welcome", "loja-b", "https://menu.example"),
    "Welcome\n\nhttps://menu.example/loja/loja-b",
  );
  assert.throws(() => autoReplyText("Welcome", "a", "javascript:alert(1)"));
});
