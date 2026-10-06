import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
const configuredUrl = process.env.DATABASE_URL;
const url = configuredUrl ? new URL(configuredUrl) : undefined;
if (url && !url.searchParams.has("connection_limit"))
  url.searchParams.set("connection_limit", "5");
export const db =
  globalDb.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url.toString() } : {}),
    transactionOptions: { maxWait: 10000, timeout: 15000 },
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
