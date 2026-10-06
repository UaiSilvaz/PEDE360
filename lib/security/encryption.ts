import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const value = Buffer.from(process.env.ENCRYPTION_KEY || "", "base64");
  if (value.length !== 32)
    throw new Error("ENCRYPTION_KEY deve ter 32 bytes em base64.");
  return value;
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function decrypt(value: string) {
  const [version, iv, tag, payload] = value.split(".");
  if (version !== "v1" || !payload) throw new Error("Token inválido.");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64"),
  );
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    cipher.update(Buffer.from(payload, "base64")),
    cipher.final(),
  ]).toString("utf8");
}
