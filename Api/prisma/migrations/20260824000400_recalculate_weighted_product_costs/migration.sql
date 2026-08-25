UPDATE "Product" AS product
SET "cost" = costs."averageCost"
FROM (
  SELECT
    "shopId",
    "productId",
    ROUND(SUM("quantity" * "unitCost")::numeric / NULLIF(SUM("quantity"), 0))::integer AS "averageCost"
  FROM "InventoryBatch"
  WHERE "quantity" > 0
  GROUP BY "shopId", "productId"
) AS costs
WHERE product."shopId" = costs."shopId"
  AND product."id" = costs."productId";
