CREATE TABLE "OrderItemSerialAllocation" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "serialId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItemSerialAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderItemSerialAllocation_orderItemId_serialId_key"
  ON "OrderItemSerialAllocation"("orderItemId", "serialId");
CREATE UNIQUE INDEX "OrderItemSerialAllocation_serialId_key"
  ON "OrderItemSerialAllocation"("serialId");
CREATE INDEX "OrderItemSerialAllocation_orderItemId_idx"
  ON "OrderItemSerialAllocation"("orderItemId");

ALTER TABLE "OrderItemSerialAllocation"
  ADD CONSTRAINT "OrderItemSerialAllocation_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItemSerialAllocation"
  ADD CONSTRAINT "OrderItemSerialAllocation_serialId_fkey"
  FOREIGN KEY ("serialId") REFERENCES "InventorySerial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
