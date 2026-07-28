-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "capabilities" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "capabilityStates" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "ledgerCutoverAt" TIMESTAMP(3),
ADD COLUMN     "ledgerEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateKey" TEXT NOT NULL DEFAULT 'GENERAL_STORE';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "priceGroupId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "capabilities" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "quantityPrecision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackingMode" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ReleaseFeature" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseFeature_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "conversionFactor" DECIMAL(18,6) NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "canSell" BOOLEAN NOT NULL DEFAULT true,
    "canPurchase" BOOLEAN NOT NULL DEFAULT true,
    "minimumOrderQty" DECIMAL(18,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLocation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SELLABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "locationId" TEXT NOT NULL,
    "onHand" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "locationId" TEXT NOT NULL,
    "unitId" TEXT,
    "inventoryBatchId" TEXT,
    "lotId" TEXT,
    "serialId" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "baseQuantity" DECIMAL(18,3) NOT NULL,
    "enteredQuantity" DECIMAL(18,3) NOT NULL,
    "conversionFactor" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "unitCost" INTEGER,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "locationId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "locationId" TEXT NOT NULL,
    "inventoryBatchId" TEXT,
    "lotNumber" TEXT NOT NULL,
    "manufacturedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySerial" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "locationId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "imei" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySerial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyRecord" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "serialId" TEXT NOT NULL,
    "orderId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "yieldQuantity" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientProductId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,

    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "ingredientDelta" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPriceGroup" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CustomerPriceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productUnitId" TEXT,
    "priceGroupId" TEXT,
    "minimumQuantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitOfMeasure_shopId_idx" ON "UnitOfMeasure"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_shopId_name_key" ON "UnitOfMeasure"("shopId", "name");

-- CreateIndex
CREATE INDEX "ProductUnit_unitId_idx" ON "ProductUnit"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_productId_unitId_key" ON "ProductUnit"("productId", "unitId");

-- CreateIndex
CREATE INDEX "InventoryLocation_shopId_idx" ON "InventoryLocation"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLocation_shopId_name_key" ON "InventoryLocation"("shopId", "name");

-- CreateIndex
CREATE INDEX "InventoryBalance_shopId_locationId_idx" ON "InventoryBalance"("shopId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_shopId_productId_variantId_locationId_key" ON "InventoryBalance"("shopId", "productId", "variantId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_occurredAt_idx" ON "InventoryMovement"("shopId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_variantId_locationId_idx" ON "InventoryMovement"("productId", "variantId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryMovement_sourceType_sourceId_idx" ON "InventoryMovement"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_shopId_idempotencyKey_key" ON "InventoryMovement"("shopId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryReservation_shopId_status_idx" ON "InventoryReservation"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_shopId_sourceType_sourceId_productId_v_key" ON "InventoryReservation"("shopId", "sourceType", "sourceId", "productId", "variantId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryLot_shopId_expiresAt_idx" ON "InventoryLot"("shopId", "expiresAt");

-- CreateIndex
CREATE INDEX "InventoryLot_productId_variantId_locationId_idx" ON "InventoryLot"("productId", "variantId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_shopId_lotNumber_key" ON "InventoryLot"("shopId", "lotNumber");

-- CreateIndex
CREATE INDEX "InventorySerial_productId_status_idx" ON "InventorySerial"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySerial_shopId_serial_key" ON "InventorySerial"("shopId", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySerial_shopId_imei_key" ON "InventorySerial"("shopId", "imei");

-- CreateIndex
CREATE INDEX "WarrantyRecord_shopId_status_idx" ON "WarrantyRecord"("shopId", "status");

-- CreateIndex
CREATE INDEX "WarrantyRecord_serialId_idx" ON "WarrantyRecord"("serialId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_productId_key" ON "Recipe"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeComponent_recipeId_ingredientProductId_key" ON "RecipeComponent"("recipeId", "ingredientProductId");

-- CreateIndex
CREATE INDEX "ModifierGroup_recipeId_idx" ON "ModifierGroup"("recipeId");

-- CreateIndex
CREATE INDEX "ModifierOption_modifierGroupId_idx" ON "ModifierOption"("modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPriceGroup_shopId_name_key" ON "CustomerPriceGroup"("shopId", "name");

-- CreateIndex
CREATE INDEX "PriceTier_productId_variantId_idx" ON "PriceTier"("productId", "variantId");

-- CreateIndex
CREATE INDEX "PriceTier_priceGroupId_idx" ON "PriceTier"("priceGroupId");

-- CreateIndex
CREATE INDEX "Customer_priceGroupId_idx" ON "Customer"("priceGroupId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "CustomerPriceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "InventorySerial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerial" ADD CONSTRAINT "InventorySerial_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerial" ADD CONSTRAINT "InventorySerial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerial" ADD CONSTRAINT "InventorySerial_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerial" ADD CONSTRAINT "InventorySerial_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyRecord" ADD CONSTRAINT "WarrantyRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyRecord" ADD CONSTRAINT "WarrantyRecord_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "InventorySerial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_ingredientProductId_fkey" FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPriceGroup" ADD CONSTRAINT "CustomerPriceGroup_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "CustomerPriceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill safe defaults for every existing store without changing legacy behavior.
INSERT INTO "UnitOfMeasure" ("id", "shopId", "name", "symbol", "precision", "isActive", "createdAt", "updatedAt")
SELECT "id" || '-unit-piece', "id", 'Piece', 'pc', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Shop"
ON CONFLICT ("shopId", "name") DO NOTHING;

INSERT INTO "InventoryLocation" ("id", "shopId", "name", "type", "isActive", "createdAt", "updatedAt")
SELECT "id" || '-location-main', "id", 'Main', 'SELLABLE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Shop"
ON CONFLICT ("shopId", "name") DO NOTHING;

INSERT INTO "ProductUnit" ("id", "productId", "unitId", "conversionFactor", "isBase", "canSell", "canPurchase", "createdAt", "updatedAt")
SELECT p."id" || '-base-unit', p."id", s."id" || '-unit-piece', 1, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" p
JOIN "Shop" s ON s."id" = p."shopId"
ON CONFLICT ("productId", "unitId") DO NOTHING;

INSERT INTO "ReleaseFeature" ("key", "enabled", "public", "updatedAt") VALUES
('catalog.units', true, true, CURRENT_TIMESTAMP),
('inventory.ledger', true, false, CURRENT_TIMESTAMP),
('inventory.lots', true, false, CURRENT_TIMESTAMP),
('inventory.serials', true, false, CURRENT_TIMESTAMP),
('restaurant.recipes', true, false, CURRENT_TIMESTAMP),
('wholesale.tierPricing', true, false, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
