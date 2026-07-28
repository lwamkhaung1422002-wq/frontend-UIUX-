CREATE TABLE "CustomerReturn" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "quantity" DECIMAL(18,3) NOT NULL,
  "condition" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerReturn_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerReturn_shopId_createdAt_idx" ON "CustomerReturn"("shopId", "createdAt");
CREATE INDEX "CustomerReturn_orderId_idx" ON "CustomerReturn"("orderId");
CREATE INDEX "CustomerReturn_orderItemId_idx" ON "CustomerReturn"("orderItemId");
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
