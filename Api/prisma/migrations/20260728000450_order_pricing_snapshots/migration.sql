ALTER TABLE "OrderItem"
  ADD COLUMN "appliedTierId" TEXT,
  ADD COLUMN "pricingSnapshot" JSONB;

CREATE INDEX "OrderItem_appliedTierId_idx" ON "OrderItem"("appliedTierId");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_appliedTierId_fkey"
  FOREIGN KEY ("appliedTierId") REFERENCES "PriceTier"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
