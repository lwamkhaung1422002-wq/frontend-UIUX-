ALTER TABLE "Shop"
  ADD COLUMN "inventoryReadMode" TEXT NOT NULL DEFAULT 'LEGACY';

ALTER TABLE "ProductVariant"
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "ProductVariant_one_default_per_product"
  ON "ProductVariant" ("productId")
  WHERE "isDefault" = true;

CREATE INDEX "InventoryLot_shopId_status_expiresAt_idx"
  ON "InventoryLot" ("shopId", "status", "expiresAt");
CREATE INDEX "InventorySerial_shopId_status_idx"
  ON "InventorySerial" ("shopId", "status");
CREATE INDEX "Order_shopId_completedAt_idx"
  ON "Order" ("shopId", "completedAt");
CREATE INDEX "Purchase_shopId_status_updatedAt_idx"
  ON "Purchase" ("shopId", "status", "updatedAt");
