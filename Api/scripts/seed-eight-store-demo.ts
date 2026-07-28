import "dotenv/config";

import bcrypt from "bcrypt";

import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";
import { STORE_TEMPLATES, type StoreTemplateKey } from "../src/lib/store-capabilities.js";

const templates = Object.keys(STORE_TEMPLATES) as StoreTemplateKey[];
const demoDate = new Date("2026-07-01T09:00:00.000Z");

function slug(value: string): string {
  return value.toLowerCase().replaceAll("_", "-");
}

async function main(): Promise<void> {
  assertLocalDatabaseUrl();
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production.");
  if (process.env.CONFIRM_DEMO_SEED !== "eight-isolated-greenmart-stores") {
    throw new Error("Set CONFIRM_DEMO_SEED=eight-isolated-greenmart-stores.");
  }
  const email = process.env.DEMO_OWNER_EMAIL;
  const passwordText = process.env.DEMO_OWNER_PASSWORD;
  if (!email || !passwordText || passwordText.length < 10) {
    throw new Error("Set DEMO_OWNER_EMAIL and a DEMO_OWNER_PASSWORD of at least 10 characters.");
  }
  const password = await bcrypt.hash(passwordText, 12);
  const owner = await prisma.user.upsert({
    where: { id: "demo-owner-eight-stores" },
    update: { name: "GreenMart Demo Owner", email, password },
    create: { id: "demo-owner-eight-stores", name: "GreenMart Demo Owner", email, password },
  });

  for (const templateKey of templates) {
    const template = STORE_TEMPLATES[templateKey];
    const id = `demo-${slug(templateKey)}`;
    await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.upsert({
        where: { id },
        update: {
          name: `${template.label} Demo`, ownerId: owner.id, templateKey,
          capabilities: Object.fromEntries(template.capabilities.map((capability) => [capability, true])),
          onboardingCompleted: true, ledgerEnabled: true, inventoryReadMode: "LEDGER", ledgerCutoverAt: demoDate,
        },
        create: {
          id, name: `${template.label} Demo`, ownerId: owner.id, templateKey,
          capabilities: Object.fromEntries(template.capabilities.map((capability) => [capability, true])),
          onboardingCompleted: true, ledgerEnabled: true, inventoryReadMode: "LEDGER", ledgerCutoverAt: demoDate,
        },
      });
      await tx.shopSetting.upsert({
        where: { shopId: shop.id },
        update: { currencyCode: "MMK", locale: "my-MM", dateFormat: "DD/MM/YYYY", timeZone: "Asia/Yangon" },
        create: { shopId: shop.id, currencyCode: "MMK", locale: "my-MM", dateFormat: "DD/MM/YYYY", timeZone: "Asia/Yangon" },
      });
      const main = await tx.inventoryLocation.upsert({
        where: { shopId_name: { shopId: shop.id, name: "Main" } },
        update: {},
        create: { id: `${id}-main`, shopId: shop.id, name: "Main", type: "SELLABLE" },
      });
      const units = [];
      for (const [name, symbol, precision] of template.units) {
        units.push(await tx.unitOfMeasure.upsert({
          where: { shopId_name: { shopId: shop.id, name } },
          update: { symbol, precision },
          create: { id: `${id}-unit-${slug(name)}`, shopId: shop.id, name, symbol, precision },
        }));
      }
      const category = await tx.category.upsert({
        where: { shopId_name: { shopId: shop.id, name: template.categories[0] } },
        update: {},
        create: { id: `${id}-category`, shopId: shop.id, name: template.categories[0] },
      });
      const trackingMode = ["MINI_MARKET", "PHARMACY", "COSMETICS"].includes(templateKey)
        ? "EXPIRY" : templateKey === "ELECTRONICS" ? "SERIAL" : "NONE";
      const product = await tx.product.upsert({
        where: { shopId_sku: { shopId: shop.id, sku: `${templateKey}-001` } },
        update: { name: `${template.terminology.product} Demo`, categoryId: category.id, trackingMode, price: 5000, cost: 3000, isActive: true },
        create: {
          id: `${id}-product`, shopId: shop.id, categoryId: category.id,
          sku: `${templateKey}-001`, name: `${template.terminology.product} Demo`,
          trackingMode, capabilities: template.capabilities, price: 5000, cost: 3000,
        },
      });
      await tx.productUnit.upsert({
        where: { productId_unitId: { productId: product.id, unitId: units[0]!.id } },
        update: { conversionFactor: 1, isBase: true },
        create: { id: `${id}-product-unit`, productId: product.id, unitId: units[0]!.id, conversionFactor: 1, isBase: true },
      });
      const batch = await tx.inventoryBatch.upsert({
        where: { id: `${id}-opening-batch` },
        update: { quantity: 30, baseQuantity: 30, reservedQuantity: 0, unitCost: 3000, receivedAt: demoDate },
        create: { id: `${id}-opening-batch`, shopId: shop.id, productId: product.id, quantity: 30, baseQuantity: 30, unitCost: 3000, receivedAt: demoDate, note: "Deterministic demo opening" },
      });
      const balance = await tx.inventoryBalance.findFirst({ where: { shopId: shop.id, productId: product.id, variantId: null, locationId: main.id } });
      if (balance) await tx.inventoryBalance.update({ where: { id: balance.id }, data: { onHand: 30, reserved: 0 } });
      else await tx.inventoryBalance.create({ data: { id: `${id}-balance`, shopId: shop.id, productId: product.id, locationId: main.id, onHand: 30, reserved: 0 } });
      await tx.inventoryMovement.upsert({
        where: { id: `${id}-opening-movement` },
        update: { baseQuantity: 30, unitCost: 3000 },
        create: {
          id: `${id}-opening-movement`, shopId: shop.id, productId: product.id,
          locationId: main.id, unitId: units[0]!.id, inventoryBatchId: batch.id,
          type: "OPENING", direction: "IN", baseQuantity: 30, enteredQuantity: 30,
          conversionFactor: 1, unitCost: 3000, sourceType: "DemoSeed", sourceId: shop.id,
          idempotencyKey: `demo-opening:${shop.id}`, occurredAt: demoDate,
        },
      });
      if (["MINI_MARKET", "PHARMACY", "COSMETICS"].includes(templateKey)) {
        await tx.inventoryLot.upsert({
          where: { shopId_lotNumber: { shopId: shop.id, lotNumber: `${templateKey}-LOT-A` } },
          update: { quantity: 29, expiresAt: new Date("2027-06-30T00:00:00.000Z"), status: "ACTIVE" },
          create: {
            id: `${id}-lot-a`, shopId: shop.id, productId: product.id, locationId: main.id,
            inventoryBatchId: batch.id, lotNumber: `${templateKey}-LOT-A`, quantity: 29,
            unitCost: 3000, expiresAt: new Date("2027-06-30T00:00:00.000Z"), receivedAt: demoDate,
          },
        });
        await tx.inventoryLot.upsert({
          where: { shopId_lotNumber: { shopId: shop.id, lotNumber: `${templateKey}-LOT-B` } },
          update: { quantity: 5, expiresAt: new Date("2027-03-31T00:00:00.000Z"), status: "ACTIVE" },
          create: {
            id: `${id}-lot-b`, shopId: shop.id, productId: product.id, locationId: main.id,
            lotNumber: `${templateKey}-LOT-B`, quantity: 5, unitCost: 3000,
            expiresAt: new Date("2027-03-31T00:00:00.000Z"), receivedAt: new Date("2026-07-03T09:00:00.000Z"),
          },
        });
      }
      if (templateKey === "ELECTRONICS") {
        for (let index = 1; index <= 34; index += 1) {
          await tx.inventorySerial.upsert({
            where: { shopId_serial: { shopId: shop.id, serial: `ELEC-SN-${String(index).padStart(3, "0")}` } },
            update: { status: "IN_STOCK", soldAt: null },
            create: {
              id: `${id}-serial-${index}`, shopId: shop.id, productId: product.id, locationId: main.id,
              serial: `ELEC-SN-${String(index).padStart(3, "0")}`, imei: `990000000000${String(index).padStart(2, "0")}`,
            },
          });
        }
      }
      if (templateKey === "WHOLESALE") {
        const group = await tx.customerPriceGroup.upsert({
          where: { shopId_name: { shopId: shop.id, name: "Retail Partners" } },
          update: {},
          create: { id: `${id}-price-group`, shopId: shop.id, name: "Retail Partners" },
        });
        const existingTier = await tx.priceTier.findFirst({ where: { productId: product.id, priceGroupId: group.id, minimumQuantity: 10 } });
        if (!existingTier) await tx.priceTier.create({
          data: { id: `${id}-tier`, productId: product.id, priceGroupId: group.id, minimumQuantity: 10, unitPrice: 4400 },
        });
      }
      if (["FASHION", "COSMETICS"].includes(templateKey)) {
        const combinations = templateKey === "FASHION"
          ? [["Black / S", 5200], ["Black / M", 5200], ["Green / S", 5400], ["Green / M", 5400]] as const
          : [["Rose / 30ml", 5200], ["Rose / 50ml", 6500], ["Nude / 30ml", 5200], ["Nude / 50ml", 6500]] as const;
        for (const [index, [name, price]] of combinations.entries()) {
          await tx.productVariant.upsert({
            where: { id: `${id}-variant-${index + 1}` },
            update: { name, price, cost: 3000, isActive: true },
            create: {
              id: `${id}-variant-${index + 1}`, productId: product.id, name,
              sku: `${templateKey}-V${index + 1}`, price, cost: 3000,
              optionPath: name.split(" / ").map((value, optionIndex) => ({
                levelId: optionIndex === 0 ? "option-1" : "option-2",
                label: optionIndex === 0 ? (templateKey === "FASHION" ? "Color" : "Shade") : "Size",
                valueId: `${slug(value)}-${optionIndex}`, value,
              })),
            },
          });
        }
      }
      if (["MINI_MARKET", "WHOLESALE"].includes(templateKey)) {
        for (const [unitIndex, factor] of [6, 24].entries()) {
          const unit = units[unitIndex + 1];
          if (!unit) continue;
          await tx.productUnit.upsert({
            where: { productId_unitId: { productId: product.id, unitId: unit.id } },
            update: { conversionFactor: factor, canSell: true, canPurchase: true },
            create: {
              id: `${id}-product-unit-${unitIndex + 2}`, productId: product.id,
              unitId: unit.id, conversionFactor: factor, canSell: true, canPurchase: true,
              minimumOrderQty: templateKey === "WHOLESALE" ? 2 : 1,
            },
          });
        }
      }
      if (templateKey === "ONLINE_RESTAURANT") {
        const ingredient = await tx.product.upsert({
          where: { shopId_sku: { shopId: shop.id, sku: "RESTAURANT-INGREDIENT-001" } },
          update: { name: "Rice ingredient", price: 0, cost: 1000 },
          create: {
            id: `${id}-ingredient`, shopId: shop.id, categoryId: category.id,
            sku: "RESTAURANT-INGREDIENT-001", name: "Rice ingredient", price: 0, cost: 1000,
          },
        });
        await tx.recipe.upsert({
          where: { productId: product.id },
          update: { yieldQuantity: 1 },
          create: {
            id: `${id}-recipe`, productId: product.id, yieldQuantity: 1,
            components: { create: [{ id: `${id}-recipe-component`, ingredientProductId: ingredient.id, quantity: 0.25 }] },
            modifierGroups: {
              create: [{
                id: `${id}-modifier-group`, name: "Portion", minSelect: 0, maxSelect: 1,
                options: { create: [{ id: `${id}-modifier-option`, name: "Extra rice", priceDelta: 500, ingredientDelta: [{ productId: ingredient.id, quantity: 0.1 }] }] },
              }],
            },
          },
        });
      }

      const customer = await tx.customer.upsert({
        where: { id: `${id}-customer` },
        update: { name: "Demo Customer", phone: "09111111111", shopId: shop.id },
        create: { id: `${id}-customer`, shopId: shop.id, name: "Demo Customer", phone: "09111111111" },
      });
      const supplier = await tx.supplier.upsert({
        where: { shopId_name: { shopId: shop.id, name: "Demo Supplier" } },
        update: { phone: "09222222222" },
        create: { id: `${id}-supplier`, shopId: shop.id, name: "Demo Supplier", phone: "09222222222" },
      });
      await tx.customerReturn.deleteMany({ where: { id: `${id}-customer-return` } });
      await tx.payment.deleteMany({ where: { id: { in: [`${id}-sale-payment`, `${id}-refund`] } } });
      await tx.order.deleteMany({ where: { id: `${id}-sale` } });
      const sale = await tx.order.create({
        data: {
          id: `${id}-sale`, shopId: shop.id, customerId: customer.id,
          orderNumber: `${templateKey}-SALE-001`, fulfillmentStatus: "completed",
          paymentStatus: "unpaid", subtotal: 10000, total: 10000,
          source: templateKey === "ONLINE_RESTAURANT" ? "Delivery" : "In-Store",
          completedAt: demoDate, createdAt: demoDate,
          items: {
            create: [{
              id: `${id}-sale-item`, productId: product.id, productName: product.name,
              quantity: 2, enteredQuantity: 2, conversionFactor: 1, baseQuantity: 2,
              unitPrice: 5000, unitCost: 3000, lineTotal: 10000, recognizedAt: demoDate,
              allocations: { create: [{ id: `${id}-sale-allocation`, inventoryBatchId: batch.id, quantity: 2, unitCost: 3000 }] },
            }],
          },
        },
      });
      await tx.payment.createMany({
        data: [
          { id: `${id}-sale-payment`, shopId: shop.id, orderId: sale.id, type: "payment", scope: "order-payment", method: "Cash", amount: 5000, paidAt: demoDate },
          { id: `${id}-refund`, shopId: shop.id, orderId: sale.id, type: "refund", scope: "financial-refund", method: "Cash", amount: 1000, reason: "Deterministic goodwill refund", paidAt: new Date("2026-07-08T09:00:00.000Z") },
        ],
      });
      await tx.customerReturn.create({
        data: {
          id: `${id}-customer-return`, shopId: shop.id, orderId: sale.id,
          orderItemId: `${id}-sale-item`, productId: product.id, quantity: 1,
          condition: "SELLABLE", reason: "Deterministic physical return",
          idempotencyKey: `demo-return:${shop.id}`, createdAt: new Date("2026-07-09T09:00:00.000Z"),
        },
      });

      await tx.purchase.deleteMany({ where: { id: `${id}-purchase` } });
      const purchaseBatch = await tx.inventoryBatch.upsert({
        where: { id: `${id}-purchase-batch` },
        update: { quantity: 5, baseQuantity: 5, reservedQuantity: 0, unitCost: 3000 },
        create: {
          id: `${id}-purchase-batch`, shopId: shop.id, productId: product.id,
          quantity: 5, baseQuantity: 5, unitCost: 3000, receivedAt: new Date("2026-07-03T09:00:00.000Z"),
        },
      });
      const demoPurchase = await tx.purchase.create({
        data: {
          id: `${id}-purchase`, shopId: shop.id, supplierId: supplier.id,
          purchaseNumber: `${templateKey}-PO-001`, status: "received",
          paymentStatus: "partial", orderedAt: new Date("2026-06-28T09:00:00.000Z"),
          receivedAt: new Date("2026-07-03T09:00:00.000Z"), total: 15000, paidAmount: 6000,
          items: {
            create: [{
              id: `${id}-purchase-item`, productId: product.id, productName: product.name,
              quantity: 5, receivedQuantity: 5, unitCost: 3000, lineTotal: 15000,
              enteredQuantity: 5, conversionFactor: 1, baseQuantity: 5,
            }],
          },
          payments: {
            create: [{ id: `${id}-purchase-payment`, amount: 6000, method: "Cash", paidAt: new Date("2026-07-04T09:00:00.000Z") }],
          },
        },
        include: { items: true },
      });
      await tx.purchaseReceipt.create({
        data: {
          id: `${id}-purchase-receipt`, purchaseId: demoPurchase.id,
          purchaseItemId: demoPurchase.items[0]!.id, inventoryBatchId: purchaseBatch.id,
          quantity: 5, idempotencyKey: `demo-receipt:${shop.id}`,
          receivedAt: new Date("2026-07-03T09:00:00.000Z"),
        },
      });
      for (const movement of [
        { suffix: "purchase", type: "PURCHASE_RECEIPT", direction: "IN", quantity: 5, sourceId: `${id}-purchase-receipt`, at: "2026-07-03T09:00:00.000Z" },
        { suffix: "sale", type: "SALE", direction: "OUT", quantity: 2, sourceId: `${id}-sale-item`, at: "2026-07-01T09:00:00.000Z" },
        { suffix: "return", type: "CUSTOMER_RETURN", direction: "IN", quantity: 1, sourceId: `${id}-customer-return`, at: "2026-07-09T09:00:00.000Z" },
      ] as const) {
        await tx.inventoryMovement.upsert({
          where: { id: `${id}-${movement.suffix}-movement` },
          update: { baseQuantity: movement.quantity, occurredAt: new Date(movement.at) },
          create: {
            id: `${id}-${movement.suffix}-movement`, shopId: shop.id, productId: product.id,
            locationId: main.id, unitId: units[0]!.id, type: movement.type,
            direction: movement.direction, baseQuantity: movement.quantity,
            enteredQuantity: movement.quantity, conversionFactor: 1, unitCost: 3000,
            sourceType: "DemoSeed", sourceId: movement.sourceId,
            idempotencyKey: `demo-${movement.suffix}:${shop.id}`, occurredAt: new Date(movement.at),
          },
        });
      }
      await tx.inventoryBalance.update({ where: { id: balance?.id || `${id}-balance` }, data: { onHand: 34, reserved: 0 } });
      await tx.expense.upsert({
        where: { id: `${id}-expense` },
        update: { amount: 2500, spentAt: demoDate },
        create: {
          id: `${id}-expense`, shopId: shop.id, title: "Demo operating expense",
          category: "Operations", method: "Cash", amount: 2500, spentAt: demoDate,
        },
      });
    }, { timeout: 30_000 });
    console.log(`PASS ${template.label}`);
  }
  console.log(JSON.stringify({ status: "PASS", owner: email, stores: templates.length }));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
