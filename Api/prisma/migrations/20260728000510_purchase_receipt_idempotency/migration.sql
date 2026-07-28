ALTER TABLE "PurchaseReceipt"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "PurchaseReceipt_purchaseId_purchaseItemId_idempotencyKey_key"
ON "PurchaseReceipt"("purchaseId", "purchaseItemId", "idempotencyKey");
