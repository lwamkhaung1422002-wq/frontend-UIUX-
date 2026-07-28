CREATE TABLE "OrderItemModifierSelection" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "modifierOptionId" TEXT,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "ingredientDelta" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemModifierSelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderItemModifierSelection_orderItemId_modifierOptionId_key"
ON "OrderItemModifierSelection"("orderItemId", "modifierOptionId");

CREATE INDEX "OrderItemModifierSelection_orderItemId_idx"
ON "OrderItemModifierSelection"("orderItemId");

ALTER TABLE "OrderItemModifierSelection"
ADD CONSTRAINT "OrderItemModifierSelection_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItemModifierSelection"
ADD CONSTRAINT "OrderItemModifierSelection_modifierOptionId_fkey"
FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
