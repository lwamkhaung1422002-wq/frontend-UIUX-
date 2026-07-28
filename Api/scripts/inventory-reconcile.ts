import "dotenv/config";

import { prisma } from "../src/lib/prisma.js";

const round = (value: number) => Math.round(value * 1_000) / 1_000;

async function main(): Promise<void> {
  const shopPrefix = process.env.RECONCILE_SHOP_PREFIX?.trim();
  const shops = await prisma.shop.findMany({
    where: {
      ledgerEnabled: true,
      ...(shopPrefix ? { OR: [{ id: { startsWith: shopPrefix } }, { name: { startsWith: shopPrefix } }] } : {}),
    },
    select: { id: true, name: true, ledgerCutoverAt: true },
  });
  let differences = 0;

  for (const shop of shops) {
    const balances = await prisma.inventoryBalance.findMany({ where: { shopId: shop.id } });
    for (const balance of balances) {
      const [movements, reservations, lots, activeSerials] = await Promise.all([
        prisma.inventoryMovement.findMany({
          where: {
            shopId: shop.id,
            productId: balance.productId,
            variantId: balance.variantId,
            locationId: balance.locationId,
          },
          select: { direction: true, baseQuantity: true },
        }),
        prisma.inventoryReservation.aggregate({
          where: {
            shopId: shop.id,
            productId: balance.productId,
            variantId: balance.variantId,
            locationId: balance.locationId,
            status: "ACTIVE",
          },
          _sum: { quantity: true },
        }),
        prisma.inventoryLot.aggregate({
          where: {
            shopId: shop.id,
            productId: balance.productId,
            variantId: balance.variantId,
            locationId: balance.locationId,
            status: "ACTIVE",
          },
          _sum: { quantity: true },
        }),
        prisma.inventorySerial.count({
          where: {
            shopId: shop.id,
            productId: balance.productId,
            variantId: balance.variantId,
            locationId: balance.locationId,
            status: "IN_STOCK",
          },
        }),
      ]);
      const movementOnHand = round(movements.reduce(
        (sum, movement) => sum + (movement.direction === "IN" ? 1 : -1) * Number(movement.baseQuantity),
        0,
      ));
      const onHand = round(Number(balance.onHand));
      const reserved = round(Number(balance.reserved));
      const reservationTotal = round(Number(reservations._sum.quantity ?? 0));
      const failures: string[] = [];
      if (movementOnHand !== onHand) failures.push(`movement=${movementOnHand}, balance=${onHand}`);
      if (reservationTotal !== reserved) failures.push(`reservations=${reservationTotal}, balance=${reserved}`);
      if (round(onHand - reserved) < 0) failures.push(`available=${round(onHand - reserved)}`);
      const lotTotal = round(Number(lots._sum.quantity ?? 0));
      if (lotTotal > 0 && lotTotal !== onHand) failures.push(`lots=${lotTotal}, onHand=${onHand}`);
      if (activeSerials > 0 && activeSerials !== onHand) failures.push(`serials=${activeSerials}, onHand=${onHand}`);
      if (failures.length) {
        differences += failures.length;
        console.error(`FAIL ${shop.name} ${keyOf(balance)}: ${failures.join("; ")}`);
      }
    }
    console.log(`${differences === 0 ? "PASS" : "CHECK"} ${shop.name} high-water=${shop.ledgerCutoverAt?.toISOString() ?? "none"}`);
  }
  console.log(JSON.stringify({ status: differences === 0 ? "PASS" : "FAIL", unexplainedDifferences: differences }));
  if (differences > 0) process.exitCode = 1;
}

function keyOf(balance: { productId: string; variantId: string | null; locationId: string }): string {
  return `${balance.productId}:${balance.variantId ?? "-"}:${balance.locationId}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
