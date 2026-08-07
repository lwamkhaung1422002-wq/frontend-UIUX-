-- Additive barcode, price history, promotion and immutable order pricing snapshots.
ALTER TABLE "OrderItem"
  ADD COLUMN "regularUnitPrice" INTEGER,
  ADD COLUMN "tierUnitPrice" INTEGER,
  ADD COLUMN "promotionId" TEXT,
  ADD COLUMN "promotionType" TEXT,
  ADD COLUMN "promotionValue" DECIMAL(18,4),
  ADD COLUMN "promotionDiscount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "manualDiscount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "finalUnitPrice" INTEGER,
  ADD COLUMN "priceResolvedAt" TIMESTAMP(3);

CREATE TABLE "ProductBarcode" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productUnitId" TEXT,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "symbology" TEXT NOT NULL DEFAULT 'CODE128',
  "kind" TEXT NOT NULL DEFAULT 'INTERNAL',
  "packageQuantity" DECIMAL(18,3),
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "retiredAt" TIMESTAMP(3),
  CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceBook" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'MMK',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceEntry" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "priceBookId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productUnitId" TEXT,
  "targetKey" TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'MMK',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "reason" TEXT NOT NULL,
  "actorId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productUnitId" TEXT,
  "priceGroupId" TEXT,
  "targetKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'ALL',
  "type" TEXT NOT NULL,
  "value" DECIMAL(18,4) NOT NULL,
  "discountBase" TEXT NOT NULL DEFAULT 'REGULAR_PRICE',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timeZone" TEXT NOT NULL DEFAULT 'Asia/Yangon',
  "state" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "reason" TEXT,
  "actorId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductBarcode_shopId_normalizedValue_key" ON "ProductBarcode"("shopId", "normalizedValue");
CREATE INDEX "ProductBarcode_shopId_status_normalizedValue_idx" ON "ProductBarcode"("shopId", "status", "normalizedValue");
CREATE INDEX "ProductBarcode_productId_variantId_productUnitId_idx" ON "ProductBarcode"("productId", "variantId", "productUnitId");
CREATE UNIQUE INDEX "PriceBook_shopId_name_key" ON "PriceBook"("shopId", "name");
CREATE INDEX "PriceBook_shopId_isDefault_isActive_idx" ON "PriceBook"("shopId", "isDefault", "isActive");
CREATE INDEX "PriceEntry_shopId_targetKey_effectiveFrom_effectiveTo_idx" ON "PriceEntry"("shopId", "targetKey", "effectiveFrom", "effectiveTo");
CREATE INDEX "PriceEntry_shopId_status_effectiveFrom_idx" ON "PriceEntry"("shopId", "status", "effectiveFrom");
CREATE INDEX "Promotion_shopId_targetKey_startsAt_endsAt_idx" ON "Promotion"("shopId", "targetKey", "startsAt", "endsAt");
CREATE INDEX "Promotion_shopId_state_startsAt_endsAt_idx" ON "Promotion"("shopId", "state", "startsAt", "endsAt");

ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceBook" ADD CONSTRAINT "PriceBook_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceEntry" ADD CONSTRAINT "PriceEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceEntry" ADD CONSTRAINT "PriceEntry_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceEntry" ADD CONSTRAINT "PriceEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceEntry" ADD CONSTRAINT "PriceEntry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceEntry" ADD CONSTRAINT "PriceEntry_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "CustomerPriceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One default price book per existing shop and one initial entry per product.
INSERT INTO "PriceBook" ("id", "shopId", "name", "currencyCode", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT 'default-price-book-' || s."id", s."id", 'Default', COALESCE(ss."currencyCode", 'MMK'), true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Shop" s
LEFT JOIN "ShopSetting" ss ON ss."shopId" = s."id"
ON CONFLICT ("shopId", "name") DO NOTHING;

INSERT INTO "PriceEntry" ("id", "shopId", "priceBookId", "productId", "targetKey", "unitPrice", "currencyCode", "effectiveFrom", "status", "reason", "createdAt", "updatedAt")
SELECT 'initial-price-' || p."id", p."shopId", pb."id", p."id", p."id" || ':*:*', p."price", pb."currencyCode", p."createdAt", 'ACTIVE', 'Initial compatibility price', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" p
JOIN "PriceBook" pb ON pb."shopId" = p."shopId" AND pb."name" = 'Default'
ON CONFLICT ("id") DO NOTHING;

UPDATE "OrderItem"
SET "regularUnitPrice" = "unitPrice",
    "finalUnitPrice" = "unitPrice",
    "manualDiscount" = "discount",
    "priceResolvedAt" = "createdAt"
WHERE "regularUnitPrice" IS NULL;
