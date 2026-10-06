import type { Prisma } from "@prisma/client";
export function audit(
  tx: Prisma.TransactionClient,
  merchantId: string,
  userId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  metadata?: Prisma.InputJsonValue,
) {
  return tx.auditLog.create({
    data: { merchantId, userId, entityType, entityId, action, metadata },
  });
}
