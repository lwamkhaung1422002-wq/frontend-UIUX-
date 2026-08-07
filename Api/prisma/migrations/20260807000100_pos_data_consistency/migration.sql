ALTER TABLE "Shop" ADD COLUMN "saleSequence" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Purchase"
  ADD COLUMN "supplierInvoiceNumber" TEXT,
  ADD COLUMN "senderName" TEXT,
  ADD COLUMN "senderPhone" TEXT,
  ADD COLUMN "receiverName" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "cancelApprovedBy" TEXT;

ALTER TABLE "PurchasePayment"
  ADD COLUMN "payerName" TEXT,
  ADD COLUMN "payerPhone" TEXT,
  ADD COLUMN "signatureDataUrl" TEXT,
  ADD COLUMN "mobileAccountName" TEXT;

CREATE UNIQUE INDEX "Purchase_shopId_supplierInvoiceNumber_key"
  ON "Purchase"("shopId", "supplierInvoiceNumber")
  WHERE "supplierInvoiceNumber" IS NOT NULL;
