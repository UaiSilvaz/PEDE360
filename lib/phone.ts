import { z } from "zod";
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return !value.trim().startsWith("+") &&
    (digits.length === 10 || digits.length === 11)
    ? "55" + digits
    : digits;
}
export const phoneSchema = z
  .string()
  .max(40)
  .transform(normalizePhone)
  .refine(
    (value) => /^[1-9]\d{9,14}$/.test(value),
    "Informe um telefone com DDD, como (11) 99999-9999.",
  );
