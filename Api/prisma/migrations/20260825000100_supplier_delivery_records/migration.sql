CREATE TABLE "SupplierDeliveryRecord" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "deliveryName" TEXT NOT NULL,
  "deliveryPhone" TEXT NOT NULL,
  "receiverName" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierDeliveryRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierDeliveryRecord_shopId_invoiceNumber_key" ON "SupplierDeliveryRecord"("shopId", "invoiceNumber");
CREATE INDEX "SupplierDeliveryRecord_shopId_supplierId_receivedAt_idx" ON "SupplierDeliveryRecord"("shopId", "supplierId", "receivedAt");
ALTER TABLE "SupplierDeliveryRecord" ADD CONSTRAINT "SupplierDeliveryRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierDeliveryRecord" ADD CONSTRAINT "SupplierDeliveryRecord_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
