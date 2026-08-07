import type { Prisma } from "../generated/prisma/client.js";

/**
 * Stores the weighted average cost of stock that is still on hand. Individual
 * receipts keep their own unit cost in InventoryBatch for audit and FIFO COGS.
 */
export async function refreshProductWeightedCost(
  tx: Prisma.TransactionClient,
  shopId: string,
  productId: string,
): Promise<number> {
  const batches = await tx.inventoryBatch.findMany({
    where: { shopId, productId, quantity: { gt: 0 } },
    select: { quantity: true, baseQuantity: true, unitCost: true },
  });

  const totals = batches.reduce(
    (current, batch) => {
      const quantity = Number(batch.baseQuantity ?? batch.quantity ?? 0);
      return {
        quantity: current.quantity + quantity,
        value: current.value + (quantity * Number(batch.unitCost || 0)),
      };
    },
    { quantity: 0, value: 0 },
  );

  const cost = totals.quantity > 0 ? Math.round(totals.value / totals.quantity) : 0;
  await tx.product.update({ where: { id: productId }, data: { cost } });
  return cost;
}
