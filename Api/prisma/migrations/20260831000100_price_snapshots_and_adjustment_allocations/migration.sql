ALTER TABLE "PriceEntry" ADD COLUMN "previousUnitPrice" INTEGER;

ALTER TABLE "StockAdjustment" ADD COLUMN "productId" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN "selectedUnitCost" INTEGER;
UPDATE "StockAdjustment" AS adjustment
SET "productId" = batch."productId"
FROM "InventoryBatch" AS batch
WHERE adjustment."inventoryBatchId" = batch."id";
ALTER TABLE "StockAdjustment" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "StockAdjustment" ALTER COLUMN "inventoryBatchId" DROP NOT NULL;
ALTER TABLE "StockAdjustment" DROP CONSTRAINT IF EXISTS "StockAdjustment_inventoryBatchId_fkey";
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_inventoryBatchId_fkey"
  FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "StockAdjustment_productId_idx" ON "StockAdjustment"("productId");

CREATE TABLE "StockAdjustmentAllocation" (
  "id" TEXT NOT NULL,
  "stockAdjustmentId" TEXT NOT NULL,
  "inventoryBatchId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockAdjustmentAllocation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockAdjustmentAllocation_stockAdjustmentId_idx" ON "StockAdjustmentAllocation"("stockAdjustmentId");
CREATE INDEX "StockAdjustmentAllocation_inventoryBatchId_idx" ON "StockAdjustmentAllocation"("inventoryBatchId");
ALTER TABLE "StockAdjustmentAllocation" ADD CONSTRAINT "StockAdjustmentAllocation_stockAdjustmentId_fkey"
  FOREIGN KEY ("stockAdjustmentId") REFERENCES "StockAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockAdjustmentAllocation" ADD CONSTRAINT "StockAdjustmentAllocation_inventoryBatchId_fkey"
  FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
