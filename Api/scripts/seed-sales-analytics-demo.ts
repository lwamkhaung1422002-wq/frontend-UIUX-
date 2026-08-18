import "dotenv/config";

import bcrypt from "bcrypt";

import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";

const shopId = "sales-analytics-demo-shop";
const email = "sales.analytics@example.local";
const passwordText = "Password123!";

function yangonDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function atYangonDay(key: string, hour: number): Date {
  return new Date(`${key}T${String(hour).padStart(2, "0")}:15:00.000+06:30`);
}

function addDays(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000+06:30`);
  date.setUTCDate(date.getUTCDate() + days);
  return yangonDateKey(date);
}

async function main(): Promise<void> {
  assertLocalDatabaseUrl();
  if (process.env.NODE_ENV === "production") throw new Error("Sales analytics demo seed is disabled in production.");
  if (process.env.CONFIRM_SALES_ANALYTICS_DEMO !== "seed-ten-sales-analytics-orders") {
    throw new Error("Set CONFIRM_SALES_ANALYTICS_DEMO=seed-ten-sales-analytics-orders before running this seed.");
  }

  const password = await bcrypt.hash(passwordText, 12);
  const owner = await prisma.user.upsert({
    where: { email },
    update: { name: "Sales Analytics Demo Owner", password },
    create: { name: "Sales Analytics Demo Owner", email, password },
  });
  await prisma.shop.upsert({
    where: { id: shopId },
    update: { name: "Sales Analytics Demo", ownerId: owner.id },
    create: { id: shopId, name: "Sales Analytics Demo", ownerId: owner.id },
  });
  await prisma.shopSetting.upsert({
    where: { shopId },
    update: { timeZone: "Asia/Yangon" },
    create: { shopId, timeZone: "Asia/Yangon" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { shopId } });
    await tx.order.deleteMany({ where: { shopId } });
    await tx.product.deleteMany({ where: { shopId } });
    await tx.category.deleteMany({ where: { shopId } });

    const categories = await Promise.all([
      "Groceries",
      "Beverages",
      "Personal Care",
      "Household",
    ].map((name) => tx.category.create({ data: { id: `sales-analytics-${name.toLowerCase().replace(/ /g, "-")}`, shopId, name } })));
    const categoryByName = new Map(categories.map((category) => [category.name, category]));
    const catalog = [
      { id: "rice", name: "Premium Rice 5kg", category: "Groceries", price: 12500, cost: 8600 },
      { id: "cola", name: "Coca-Cola 330ml", category: "Beverages", price: 1400, cost: 780 },
      { id: "shampoo", name: "Jasmine Shampoo", category: "Personal Care", price: 7600, cost: 4400 },
      { id: "tissue", name: "Cellox Facial Tissue", category: "Household", price: 2800, cost: 1600 },
    ];
    const products = new Map<string, { id: string; name: string; price: number; cost: number }>();
    for (const product of catalog) {
      const created = await tx.product.create({
        data: {
          id: `sales-analytics-${product.id}`,
          shopId,
          categoryId: categoryByName.get(product.category)?.id,
          sku: `SA-${product.id.toUpperCase()}`,
          name: product.name,
          price: product.price,
          cost: product.cost,
        },
      });
      products.set(product.id, { id: created.id, name: product.name, price: product.price, cost: product.cost });
    }

    const today = yangonDateKey(new Date());
    const monthStart = `${today.slice(0, 7)}-01`;
    const currentDays = Math.max(1, Math.floor((new Date(`${today}T00:00:00.000+06:30`).getTime() - new Date(`${monthStart}T00:00:00.000+06:30`).getTime()) / 86_400_000) + 1);
    const priorStart = addDays(monthStart, -currentDays);
    const currentOffsets = [0, 1, 2, 3, 4, 5].map((index) => Math.round(index * (currentDays - 1) / 5));
    const previousOffsets = [1, 2, 3, 4].map((index) => Math.round(index * (currentDays - 1) / 5));
    const fixtures = [
      { key: "01", date: addDays(monthStart, currentOffsets[0] ?? 0), product: "rice", quantity: 2, discount: 0, method: "Cash", paid: "paid" },
      { key: "02", date: addDays(monthStart, currentOffsets[1] ?? 0), product: "cola", quantity: 8, discount: 400, method: "KPay", paid: "paid" },
      { key: "03", date: addDays(monthStart, currentOffsets[2] ?? 0), product: "shampoo", quantity: 2, discount: 0, method: "Wave", paid: "paid" },
      { key: "04", date: addDays(monthStart, currentOffsets[3] ?? 0), product: "tissue", quantity: 6, discount: 500, method: "Cash", paid: "partial" },
      { key: "05", date: addDays(monthStart, currentOffsets[4] ?? 0), product: "rice", quantity: 1, discount: 0, method: "KPay", paid: "unpaid" },
      { key: "06", date: addDays(monthStart, currentOffsets[5] ?? 0), product: "cola", quantity: 10, discount: 0, method: "KPay", paid: "paid" },
      { key: "07", date: addDays(priorStart, previousOffsets[0] ?? 0), product: "tissue", quantity: 4, discount: 0, method: "Cash", paid: "paid" },
      { key: "08", date: addDays(priorStart, previousOffsets[1] ?? 0), product: "shampoo", quantity: 1, discount: 600, method: "Wave", paid: "paid" },
      { key: "09", date: addDays(priorStart, previousOffsets[2] ?? 0), product: "cola", quantity: 12, discount: 0, method: "KPay", paid: "paid" },
      { key: "10", date: addDays(priorStart, previousOffsets[3] ?? 0), product: "rice", quantity: 3, discount: 500, method: "Cash", paid: "paid", refund: 800 },
    ] as const;

    for (const [index, fixture] of fixtures.entries()) {
      const product = products.get(fixture.product);
      if (!product) throw new Error(`Missing product fixture: ${fixture.product}`);
      const subtotal = product.price * fixture.quantity;
      const total = subtotal - fixture.discount;
      const completedAt = atYangonDay(fixture.date, 9 + (index % 8));
      const orderId = `sales-analytics-order-${fixture.key}`;
      await tx.order.create({
        data: {
          id: orderId,
          shopId,
          orderNumber: `SA-2026-${fixture.key}`,
          fulfillmentStatus: "completed",
          paymentStatus: fixture.paid === "unpaid" ? "unpaid" : fixture.paid === "partial" ? "partial" : "paid",
          subtotal,
          discount: fixture.discount,
          total,
          completedAt,
          createdAt: completedAt,
          items: {
            create: [{
              id: `sales-analytics-item-${fixture.key}`,
              productId: product.id,
              productName: product.name,
              quantity: fixture.quantity,
              unitPrice: product.price,
              unitCost: product.cost,
              discount: fixture.discount,
              lineTotal: total,
              recognizedAt: completedAt,
            }],
          },
        },
      });
      if (fixture.paid !== "unpaid") {
        const amount = fixture.paid === "partial" ? Math.floor(total / 2) : total;
        const paymentId = `sales-analytics-payment-${fixture.key}`;
        await tx.payment.create({
          data: { id: paymentId, shopId, orderId, type: "payment", scope: "order-payment", method: fixture.method, amount, paidAt: completedAt },
        });
        if ("refund" in fixture) {
          await tx.payment.create({
            data: {
              id: `sales-analytics-refund-${fixture.key}`,
              shopId,
              orderId,
              type: "refund",
              scope: "financial-refund",
              method: fixture.method,
              amount: fixture.refund,
              originalPaymentId: paymentId,
              paidAt: atYangonDay(fixture.date, 18),
            },
          });
        }
      }
    }
  });

  console.log(`Sales analytics demo ready. Login: ${email} / ${passwordText}; shop: ${shopId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
