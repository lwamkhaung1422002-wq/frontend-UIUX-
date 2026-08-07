CREATE TABLE "ProductSupplier" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "lastUnitCost" INTEGER,
  "notes" TEXT,
  "lastOrderedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PurchaseItem" ADD COLUMN "plannedUnitCost" INTEGER;
ALTER TABLE "PurchaseItem" ADD COLUMN "plannedPromotionLabel" TEXT;

CREATE UNIQUE INDEX "ProductSupplier_shopId_productId_supplierId_key" ON "ProductSupplier"("shopId", "productId", "supplierId");
CREATE INDEX "ProductSupplier_shopId_productId_idx" ON "ProductSupplier"("shopId", "productId");
CREATE INDEX "ProductSupplier_shopId_supplierId_idx" ON "ProductSupplier"("shopId", "supplierId");

ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
