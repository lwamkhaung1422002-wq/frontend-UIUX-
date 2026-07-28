import type { PrismaClient } from "../generated/prisma/client.js";

const round = (value: number) => Math.round(value * 1_000) / 1_000;

export async function reconcileShopInventory(prisma: PrismaClient, shopId: string) {
  const balances = await prisma.inventoryBalance.findMany({ where: { shopId } });
  const differences: Array<{ balanceId: string; invariant: string; expected: number; actual: number }> = [];
  for (const balance of balances) {
    const [movements, reservations] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where: { shopId, productId: balance.productId, variantId: balance.variantId, locationId: balance.locationId },
        select: { direction: true, baseQuantity: true },
      }),
      prisma.inventoryReservation.aggregate({
        where: {
          shopId, productId: balance.productId, variantId: balance.variantId,
          locationId: balance.locationId, status: "ACTIVE",
        },
        _sum: { quantity: true },
      }),
    ]);
    const movementOnHand = round(movements.reduce(
      (sum, movement) => sum + (movement.direction === "IN" ? 1 : -1) * Number(movement.baseQuantity),
      0,
    ));
    const onHand = round(Number(balance.onHand));
    const reserved = round(Number(balance.reserved));
    const reservationTotal = round(Number(reservations._sum.quantity ?? 0));
    if (movementOnHand !== onHand) differences.push({ balanceId: balance.id, invariant: "movement_on_hand", expected: onHand, actual: movementOnHand });
    if (reservationTotal !== reserved) differences.push({ balanceId: balance.id, invariant: "reservation_total", expected: reserved, actual: reservationTotal });
    if (round(onHand - reserved) < 0) differences.push({ balanceId: balance.id, invariant: "non_negative_available", expected: 0, actual: round(onHand - reserved) });
  }
  return { status: differences.length ? "FAIL" : "PASS", unexplainedDifferences: differences.length, differences };
}
