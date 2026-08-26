ALTER TABLE "Order" ADD COLUMN "paymentTracking" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_shopId_type_entityId_dateKey_key" ON "Notification"("shopId", "type", "entityId", "dateKey");
CREATE INDEX "Notification_shopId_readAt_createdAt_idx" ON "Notification"("shopId", "readAt", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Order" o
SET "paymentTracking" = true
WHERE o."paymentStatus" IN ('unpaid', 'partial')
   OR EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o."id" AND p."scope" = 'credit-settlement');
