import "dotenv/config";

import { prisma } from "../src/lib/prisma.js";

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { variants: { none: {} } },
    select: { id: true, name: true, sku: true, price: true, cost: true },
  });
  let created = 0;
  for (const product of products) {
    const existing = await prisma.productVariant.findFirst({
      where: { productId: product.id, isDefault: true },
    });
    if (existing) continue;
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: "Default",
        price: product.price,
        cost: product.cost,
        isDefault: true,
        variantSignature: "__default__",
        optionPath: [],
      },
    });
    created += 1;
  }
  console.log(JSON.stringify({ status: "PASS", scanned: products.length, created }));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
