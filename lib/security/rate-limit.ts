import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
// Database-backed buckets work across application instances. Keys never contain raw credentials.
export async function rateLimit(key: string, max = 30, seconds = 60) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const id = createHash("sha256")
    .update(key + ":" + bucket)
    .digest("hex");
  const row = await db.rateLimit.upsert({
    where: { id },
    create: {
      id,
      count: 1,
      expiresAt: new Date((bucket + 1) * seconds * 1000),
    },
    update: { count: { increment: 1 } },
  });
  if (row.count > max)
    throw new ApiError(
      429,
      "RATE_LIMIT",
      "Muitas tentativas. Aguarde um pouco.",
    );
}
