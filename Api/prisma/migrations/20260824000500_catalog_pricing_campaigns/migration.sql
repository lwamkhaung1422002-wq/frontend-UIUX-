ALTER TABLE "Product" ADD COLUMN "minimumStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Promotion" ADD COLUMN "campaignId" TEXT;
CREATE INDEX "Promotion_shopId_campaignId_idx" ON "Promotion"("shopId", "campaignId");
