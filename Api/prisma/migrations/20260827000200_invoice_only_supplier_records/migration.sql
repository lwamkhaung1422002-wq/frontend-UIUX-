DROP INDEX IF EXISTS "Supplier_shopId_name_phone_key";

ALTER TABLE "SupplierDeliveryRecord" ADD COLUMN "supplierName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupplierDeliveryRecord" ADD COLUMN "supplierPhone" TEXT NOT NULL DEFAULT '';
UPDATE "SupplierDeliveryRecord" AS record
SET "supplierName" = supplier."name", "supplierPhone" = COALESCE(supplier."phone", '')
FROM "Supplier" AS supplier
WHERE record."supplierId" = supplier."id";

ALTER TABLE "SupplierDeliveryRecord" DROP CONSTRAINT "SupplierDeliveryRecord_supplierId_fkey";
ALTER TABLE "SupplierDeliveryRecord" ALTER COLUMN "supplierId" DROP NOT NULL;
ALTER TABLE "SupplierDeliveryRecord" ADD CONSTRAINT "SupplierDeliveryRecord_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SupplierDeliveryPayment" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "deliveryRecordId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "payerName" TEXT,
  "payerPhone" TEXT,
  "signatureDataUrl" TEXT,
  "mobileAccountName" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedAt" TIMESTAMP(3),
  "reversalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierDeliveryPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierDeliveryPayment_shopId_paidAt_idx" ON "SupplierDeliveryPayment"("shopId", "paidAt");
CREATE INDEX "SupplierDeliveryPayment_deliveryRecordId_idx" ON "SupplierDeliveryPayment"("deliveryRecordId");
ALTER TABLE "SupplierDeliveryPayment" ADD CONSTRAINT "SupplierDeliveryPayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierDeliveryPayment" ADD CONSTRAINT "SupplierDeliveryPayment_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "SupplierDeliveryRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
