ALTER TABLE "ShopSetting"
ADD COLUMN "lowStockDefault" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'MMK',
ADD COLUMN "dateFormat" TEXT NOT NULL DEFAULT 'yyyy-MM-dd',
ADD COLUMN "receiptFooter" TEXT NOT NULL DEFAULT 'Thank you for shopping with us.',
ADD COLUMN "notifyLowStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyPayments" BOOLEAN NOT NULL DEFAULT true;
