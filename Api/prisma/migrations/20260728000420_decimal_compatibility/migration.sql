ALTER TABLE "InventoryBatch" ADD COLUMN "baseQuantity" DECIMAL(18,3);
ALTER TABLE "PurchaseItem" ADD COLUMN "unitId" TEXT;
ALTER TABLE "PurchaseItem" ADD COLUMN "enteredQuantity" DECIMAL(18,3);
ALTER TABLE "PurchaseItem" ADD COLUMN "conversionFactor" DECIMAL(18,6);
ALTER TABLE "PurchaseItem" ADD COLUMN "baseQuantity" DECIMAL(18,3);
ALTER TABLE "OrderItem" ADD COLUMN "unitId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "enteredQuantity" DECIMAL(18,3);
ALTER TABLE "OrderItem" ADD COLUMN "conversionFactor" DECIMAL(18,6);
ALTER TABLE "OrderItem" ADD COLUMN "baseQuantity" DECIMAL(18,3);
ALTER TABLE "OrderItem" ADD COLUMN "recognizedAt" TIMESTAMP(3);

UPDATE "InventoryBatch" SET "baseQuantity" = "quantity";
UPDATE "PurchaseItem" SET "enteredQuantity" = "quantity", "conversionFactor" = 1, "baseQuantity" = "quantity";
UPDATE "OrderItem" SET "enteredQuantity" = "quantity", "conversionFactor" = 1, "baseQuantity" = "quantity", "recognizedAt" = (
  SELECT COALESCE(o."completedAt", o."createdAt") FROM "Order" o WHERE o."id" = "OrderItem"."orderId"
);
