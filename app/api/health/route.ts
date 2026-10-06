import { db } from "@/lib/db";
import { endpoint, ok } from "@/lib/api";
export const GET = endpoint(async () => {
  await db.$queryRaw`SELECT 1`;
  return ok({
    app: "pede360",
    database: "available",
    timestamp: new Date().toISOString(),
  });
});
