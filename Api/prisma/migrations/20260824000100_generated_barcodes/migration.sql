CREATE TABLE "GeneratedBarcode" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "assignedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "retiredAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedBarcode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedBarcode_shopId_normalizedValue_key" ON "GeneratedBarcode"("shopId", "normalizedValue");
CREATE INDEX "GeneratedBarcode_shopId_status_idx" ON "GeneratedBarcode"("shopId", "status");
CREATE INDEX "GeneratedBarcode_assignedProductId_idx" ON "GeneratedBarcode"("assignedProductId");

ALTER TABLE "GeneratedBarcode" ADD CONSTRAINT "GeneratedBarcode_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedBarcode" ADD CONSTRAINT "GeneratedBarcode_assignedProductId_fkey" FOREIGN KEY ("assignedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
