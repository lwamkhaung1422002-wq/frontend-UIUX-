ALTER TABLE "StockAdjustment" ADD COLUMN "staffName" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "InventoryMovement" ADD COLUMN "staffName" TEXT;
