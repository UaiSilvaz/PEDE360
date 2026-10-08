ALTER TABLE "Merchant" ADD COLUMN "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoReplyMessage" TEXT NOT NULL DEFAULT 'Olá! Confira nosso cardápio e faça seu pedido:';
CREATE TABLE "AutoReplyJob" (
"id" TEXT NOT NULL PRIMARY KEY, "messageId" TEXT NOT NULL UNIQUE,
"state" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
"error" TEXT, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "AutoReplyJob_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "AutoReplyJob_state_nextAttemptAt_idx" ON "AutoReplyJob"("state", "nextAttemptAt");
