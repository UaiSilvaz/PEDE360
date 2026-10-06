import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { endpoint, ok, ApiError } from "@/lib/api";
import { processNotifications } from "@/lib/whatsapp/notifications";
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
  const jobs = await db.notificationJob.findMany({
    where: { state: "PENDING" },
    select: { order: { select: { merchantId: true } } },
    take: 200,
  });
  const tenants = [...new Set(jobs.map((j) => j.order.merchantId))];
  for (const id of tenants) await processNotifications(id);
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return ok({ processedTenants: tenants.length });
});
