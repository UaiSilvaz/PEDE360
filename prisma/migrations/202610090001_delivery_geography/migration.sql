ALTER TABLE "Merchant"
ADD COLUMN "deliveryState" TEXT,
ADD COLUMN "deliveryCityId" TEXT,
ADD COLUMN "deliveryCity" TEXT;

CREATE TABLE "CityAddressDirectory" (
  "cityId" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "data" JSONB NOT NULL DEFAULT '{}',
  "sourceUrl" TEXT,
  "error" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
