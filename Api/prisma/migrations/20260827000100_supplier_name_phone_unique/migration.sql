DROP INDEX "Supplier_shopId_name_key";

CREATE UNIQUE INDEX "Supplier_shopId_name_phone_key"
  ON "Supplier"("shopId", "name", "phone");
