ALTER TABLE "PurchaseItem"
ADD COLUMN "receivedBaseQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0;

ALTER TABLE "PurchaseReceipt"
ADD COLUMN "baseQuantity" DECIMAL(18,3);

ALTER TABLE "PurchaseReturn"
ADD COLUMN "baseQuantity" DECIMAL(18,3);

ALTER TABLE "OrderItemAllocation"
ADD COLUMN "baseQuantity" DECIMAL(18,3);

UPDATE "PurchaseItem"
SET "receivedBaseQuantity" = "receivedQuantity";

UPDATE "PurchaseReceipt"
SET "baseQuantity" = "quantity"
WHERE "baseQuantity" IS NULL;

UPDATE "PurchaseReturn"
SET "baseQuantity" = "quantity"
WHERE "baseQuantity" IS NULL;

UPDATE "OrderItemAllocation"
SET "baseQuantity" = "quantity"
WHERE "baseQuantity" IS NULL;
