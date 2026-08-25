CREATE TABLE "PromotionCampaign" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "categoryId" TEXT,
  "name" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PromotionCampaign_shopId_state_idx" ON "PromotionCampaign"("shopId", "state");
CREATE INDEX "PromotionCampaign_shopId_categoryId_idx" ON "PromotionCampaign"("shopId", "categoryId");
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopSetting" ALTER COLUMN "paymentMethods" SET DEFAULT '[]';
