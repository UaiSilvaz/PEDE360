import { timingSafeEqual } from "node:crypto";
import { endpoint, ok, ApiError } from "@/lib/api";
import { processAutoReplies } from "@/lib/whatsapp/auto-reply";

export const maxDuration = 60;
export const POST = endpoint(async (request) => {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from("Bearer " + secret);
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    throw new ApiError(401, "AUTH_REQUIRED", "Não autorizado.");
  return ok({ processed: await processAutoReplies() });
});
