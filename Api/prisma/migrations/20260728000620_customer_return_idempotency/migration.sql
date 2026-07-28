ALTER TABLE "CustomerReturn" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "CustomerReturn_shopId_idempotencyKey_key"
ON "CustomerReturn"("shopId", "idempotencyKey");
