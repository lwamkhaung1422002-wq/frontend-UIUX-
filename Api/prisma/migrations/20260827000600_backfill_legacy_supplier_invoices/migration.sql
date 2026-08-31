-- Purchase was the legacy supplier-balance store.  Preserve it for inventory
-- history, but project every purchase into the canonical supplier invoice feed.
INSERT INTO "SupplierDeliveryRecord" (
  "id", "shopId", "supplierId", "supplierName", "supplierPhone", "invoiceNumber",
  "deliveryName", "deliveryPhone", "receiverName", "receivedAt", "dueAt", "amount",
  "status", "cancelledAt", "cancelReason", "createdAt", "updatedAt"
)
SELECT
  concat('legacy-invoice-', p."id"), p."shopId", p."supplierId", s."name", COALESCE(s."phone", ''),
  COALESCE(NULLIF(p."supplierInvoiceNumber", ''), p."purchaseNumber"),
  COALESCE(p."senderName", s."name"), COALESCE(p."senderPhone", s."phone", ''), COALESCE(p."receiverName", ''),
  COALESCE(p."receivedAt", p."orderedAt", p."createdAt"), COALESCE(p."expectedAt", p."receivedAt", p."orderedAt", p."createdAt"), p."total",
  CASE WHEN p."status" = 'cancelled' THEN 'cancelled' ELSE 'active' END, p."cancelledAt", p."cancelReason", p."createdAt", p."updatedAt"
FROM "Purchase" p
JOIN "Supplier" s ON s."id" = p."supplierId"
WHERE NOT EXISTS (
  SELECT 1 FROM "SupplierDeliveryRecord" d
  WHERE d."shopId" = p."shopId"
    AND d."invoiceNumber" = COALESCE(NULLIF(p."supplierInvoiceNumber", ''), p."purchaseNumber")
);

INSERT INTO "SupplierDeliveryPayment" (
  "id", "shopId", "deliveryRecordId", "amount", "method", "reference", "notes",
  "payerName", "payerPhone", "signatureDataUrl", "mobileAccountName", "paidAt", "reversedAt", "reversalReason", "createdAt"
)
SELECT
  concat('legacy-supplier-payment-', pp."id"), p."shopId", d."id", pp."amount", pp."method", pp."reference", pp."notes",
  pp."payerName", pp."payerPhone", pp."signatureDataUrl", pp."mobileAccountName", pp."paidAt", pp."reversedAt", pp."reversalReason", pp."createdAt"
FROM "PurchasePayment" pp
JOIN "Purchase" p ON p."id" = pp."purchaseId"
JOIN "SupplierDeliveryRecord" d ON d."shopId" = p."shopId" AND d."invoiceNumber" = COALESCE(NULLIF(p."supplierInvoiceNumber", ''), p."purchaseNumber")
WHERE NOT EXISTS (SELECT 1 FROM "SupplierDeliveryPayment" dp WHERE dp."id" = concat('legacy-supplier-payment-', pp."id"));

INSERT INTO "SupplierDeliveryPaymentReversal" ("id", "shopId", "originalPaymentId", "reason", "reversedAt", "createdAt")
SELECT concat('legacy-purchase-reversal-', pp."id"), p."shopId", concat('legacy-supplier-payment-', pp."id"),
  COALESCE(pp."reversalReason", 'Supplier payment cancelled'), pp."reversedAt", pp."reversedAt"
FROM "PurchasePayment" pp
JOIN "Purchase" p ON p."id" = pp."purchaseId"
WHERE pp."reversedAt" IS NOT NULL
ON CONFLICT ("originalPaymentId") DO NOTHING;
