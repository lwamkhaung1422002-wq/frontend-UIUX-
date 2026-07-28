import "dotenv/config";

import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";

type StockKey = {
  productId: string;
  variantId: string | null;
  original: number;
  completed: number;
  returned: number;
  reserved: number;
};

function key(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? "-"}`;
}

async function main(): Promise<void> {
  assertLocalDatabaseUrl();
  if (process.env.CONFIRM_INVENTORY_CUTOVER !== "online_shop_local_dev") {
    throw new Error("Set CONFIRM_INVENTORY_CUTOVER=online_shop_local_dev to run the guarded local cutover.");
  }

  const shops = await prisma.shop.findMany({ select: { id: true, name: true, ledgerEnabled: true } });
  for (const shop of shops) {
    if (shop.ledgerEnabled) {
      console.log(`SKIP ${shop.name}: ledger already enabled`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      // Serializes cutover tooling without rewriting any historical transaction.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`greenmart-cutover:${shop.id}`}))`;
      const existingMovements = await tx.inventoryMovement.count({ where: { shopId: shop.id } });
      if (existingMovements > 0) {
        throw new Error(`Refusing ${shop.name}: movements exist while ledgerEnabled is false.`);
      }

      const [batches, completedAllocations, activeAllocations, sellableReturns, defaults] = await Promise.all([
        tx.inventoryBatch.findMany({
          where: { shopId: shop.id },
          select: { productId: true, variantId: true, quantity: true },
        }),
        tx.orderItemAllocation.findMany({
          where: { orderItem: { order: { shopId: shop.id, fulfillmentStatus: "completed" } } },
          select: { quantity: true, orderItem: { select: { productId: true, variantId: true } } },
        }),
        tx.orderItemAllocation.findMany({
          where: {
            orderItem: {
              order: {
                shopId: shop.id,
                fulfillmentStatus: { notIn: ["completed", "cancelled"] },
              },
            },
          },
          select: { quantity: true, orderItem: { select: { id: true, productId: true, variantId: true } } },
        }),
        tx.customerReturn.findMany({
          where: { shopId: shop.id, condition: "SELLABLE" },
          select: { quantity: true, productId: true, variantId: true },
        }),
        Promise.all([
          tx.inventoryLocation.upsert({
            where: { shopId_name: { shopId: shop.id, name: "Main" } },
            update: {},
            create: { shopId: shop.id, name: "Main", type: "SELLABLE" },
          }),
          tx.unitOfMeasure.upsert({
            where: { shopId_name: { shopId: shop.id, name: "Piece" } },
            update: {},
            create: { shopId: shop.id, name: "Piece", symbol: "pc", precision: 0 },
          }),
        ]),
      ]);

      const stock = new Map<string, StockKey>();
      const entry = (productId: string, variantId: string | null) => {
        const id = key(productId, variantId);
        let value = stock.get(id);
        if (!value) {
          value = { productId, variantId, original: 0, completed: 0, returned: 0, reserved: 0 };
          stock.set(id, value);
        }
        return value;
      };
      for (const batch of batches) entry(batch.productId, batch.variantId).original += batch.quantity;
      for (const allocation of completedAllocations) {
        entry(allocation.orderItem.productId, allocation.orderItem.variantId).completed += allocation.quantity;
      }
      for (const allocation of activeAllocations) {
        entry(allocation.orderItem.productId, allocation.orderItem.variantId).reserved += allocation.quantity;
      }
      for (const returned of sellableReturns) {
        entry(returned.productId, returned.variantId).returned += Number(returned.quantity);
      }

      const [location, unit] = defaults;
      const cutoverAt = new Date();
      for (const value of stock.values()) {
        const onHand = value.original - value.completed + value.returned;
        if (onHand < value.reserved || onHand < 0) {
          throw new Error(
            `Ambiguous stock ${key(value.productId, value.variantId)}: onHand=${onHand}, reserved=${value.reserved}.`,
          );
        }
        const balance = await tx.inventoryBalance.create({
          data: {
            shopId: shop.id,
            productId: value.productId,
            ...(value.variantId ? { variantId: value.variantId } : {}),
            locationId: location.id,
            onHand: String(onHand),
            reserved: String(value.reserved),
          },
        });
        if (onHand > 0) {
          await tx.inventoryMovement.create({
            data: {
              shopId: shop.id,
              productId: value.productId,
              ...(value.variantId ? { variantId: value.variantId } : {}),
              locationId: location.id,
              unitId: unit.id,
              type: "OPENING",
              direction: "IN",
              baseQuantity: String(onHand),
              enteredQuantity: String(onHand),
              conversionFactor: 1,
              sourceType: "CutoverBalance",
              sourceId: balance.id,
              idempotencyKey: `cutover:${shop.id}:${key(value.productId, value.variantId)}`,
              occurredAt: cutoverAt,
              reason: "Cutover snapshot; historical sales remain represented by OrderItem cost snapshots.",
            },
          });
        }
      }
      for (const allocation of activeAllocations) {
        await tx.inventoryReservation.create({
          data: {
            shopId: shop.id,
            productId: allocation.orderItem.productId,
            ...(allocation.orderItem.variantId ? { variantId: allocation.orderItem.variantId } : {}),
            locationId: location.id,
            sourceType: "OrderItem",
            sourceId: allocation.orderItem.id,
            quantity: String(allocation.quantity),
          },
        });
      }
      await tx.shop.update({
        where: { id: shop.id },
        data: { ledgerEnabled: true, ledgerCutoverAt: cutoverAt },
      });
      console.log(`PASS ${shop.name}: cutover ${cutoverAt.toISOString()} (${stock.size} balances)`);
    }, { isolationLevel: "Serializable", timeout: 60_000 });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
