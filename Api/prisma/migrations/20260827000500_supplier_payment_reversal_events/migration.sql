CREATE TABLE "SupplierDeliveryPaymentReversal" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "originalPaymentId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "reversedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierDeliveryPaymentReversal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierDeliveryPaymentReversal_originalPaymentId_key"
  ON "SupplierDeliveryPaymentReversal"("originalPaymentId");
CREATE INDEX "SupplierDeliveryPaymentReversal_shopId_reversedAt_idx"
  ON "SupplierDeliveryPaymentReversal"("shopId", "reversedAt");
ALTER TABLE "SupplierDeliveryPaymentReversal"
  ADD CONSTRAINT "SupplierDeliveryPaymentReversal_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierDeliveryPaymentReversal"
  ADD CONSTRAINT "SupplierDeliveryPaymentReversal_originalPaymentId_fkey"
  FOREIGN KEY ("originalPaymentId") REFERENCES "SupplierDeliveryPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve all historical mutable cancellation markers as immutable events.
INSERT INTO "SupplierDeliveryPaymentReversal" ("id", "shopId", "originalPaymentId", "reason", "reversedAt", "createdAt")
SELECT concat('legacy-reversal-', "id"), "shopId", "id", COALESCE("reversalReason", 'Supplier payment cancelled'), "reversedAt", COALESCE("reversedAt", CURRENT_TIMESTAMP)
FROM "SupplierDeliveryPayment"
WHERE "reversedAt" IS NOT NULL
ON CONFLICT ("originalPaymentId") DO NOTHING;
