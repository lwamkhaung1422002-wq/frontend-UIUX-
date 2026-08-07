import "dotenv/config";

import bcrypt from "bcrypt";

import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";
import { STORE_TEMPLATES, type StoreTemplateKey } from "../src/lib/store-capabilities.js";

const templates = Object.keys(STORE_TEMPLATES) as StoreTemplateKey[];
const demoDate = new Date("2026-07-01T09:00:00.000Z");

type CatalogFixture = { name: string; category: string; cost: number; price: number; quantity: number };

const catalogFixtures: Record<StoreTemplateKey, CatalogFixture[]> = {
  GENERAL_STORE: [
    { name: "Premium Rice 5 kg", category: "Groceries", cost: 11500, price: 13500, quantity: 18 },
    { name: "Cooking Oil 1 L", category: "Cooking Essentials", cost: 5200, price: 6000, quantity: 24 },
    { name: "Detergent Powder 800 g", category: "Household", cost: 3600, price: 4500, quantity: 12 },
    { name: "Instant Noodles Pack", category: "Groceries", cost: 450, price: 600, quantity: 48 },
    { name: "Drinking Water 1 L", category: "Beverages", cost: 500, price: 700, quantity: 4 },
  ],
  MINI_MARKET: [
    { name: "Cola 500 ml", category: "Beverages", cost: 900, price: 1200, quantity: 36 },
    { name: "UHT Milk 1 L", category: "Dairy", cost: 2800, price: 3400, quantity: 16 },
    { name: "Potato Chips", category: "Snacks", cost: 1400, price: 1800, quantity: 28 },
    { name: "Canned Tuna", category: "Canned Food", cost: 2600, price: 3200, quantity: 14 },
    { name: "Sandwich Bread", category: "Bakery", cost: 1700, price: 2200, quantity: 3 },
  ],
  FASHION: [
    { name: "Basic Cotton T-Shirt", category: "Tops", cost: 8000, price: 12000, quantity: 20 },
    { name: "Classic Denim Jeans", category: "Bottoms", cost: 18000, price: 26000, quantity: 14 },
    { name: "Zip Hoodie", category: "Outerwear", cost: 22000, price: 32000, quantity: 10 },
    { name: "Everyday Sneakers", category: "Footwear", cost: 26000, price: 39000, quantity: 8 },
    { name: "Baseball Cap", category: "Accessories", cost: 5000, price: 8500, quantity: 4 },
  ],
  ELECTRONICS: [
    { name: "USB-C Fast Charger 25W", category: "Chargers", cost: 18000, price: 25000, quantity: 15 },
    { name: "Wireless Mouse", category: "Computer Accessories", cost: 14000, price: 21000, quantity: 12 },
    { name: "Power Bank 10000mAh", category: "Power", cost: 28000, price: 39000, quantity: 9 },
    { name: "Bluetooth Earbuds", category: "Audio", cost: 32000, price: 48000, quantity: 7 },
    { name: "HDMI Cable 2 m", category: "Cables", cost: 6000, price: 9500, quantity: 3 },
  ],
  PHARMACY: [
    { name: "Paracetamol 500 mg", category: "OTC Medicines", cost: 1200, price: 1800, quantity: 40 },
    { name: "Vitamin C Tablets", category: "Supplements", cost: 4500, price: 6200, quantity: 18 },
    { name: "Antiseptic Solution 100 ml", category: "First Aid", cost: 2800, price: 3900, quantity: 12 },
    { name: "Disposable Face Masks", category: "Medical Supplies", cost: 2500, price: 3500, quantity: 25 },
    { name: "Oral Rehydration Salts", category: "OTC Medicines", cost: 500, price: 800, quantity: 4 },
  ],
  COSMETICS: [
    { name: "Matte Lipstick", category: "Makeup", cost: 8500, price: 13500, quantity: 18 },
    { name: "Sunscreen SPF50", category: "Skin Care", cost: 14500, price: 22000, quantity: 14 },
    { name: "Gentle Facial Cleanser", category: "Skin Care", cost: 9000, price: 14500, quantity: 12 },
    { name: "Body Lotion 250 ml", category: "Body Care", cost: 7800, price: 12000, quantity: 10 },
    { name: "Floral Perfume 50 ml", category: "Fragrance", cost: 22000, price: 35000, quantity: 3 },
  ],
  ONLINE_RESTAURANT: [
    { name: "Crispy Chicken Burger", category: "Burgers", cost: 3500, price: 6500, quantity: 30 },
    { name: "Chicken Fried Rice", category: "Rice Meals", cost: 2800, price: 5500, quantity: 30 },
    { name: "Iced Lemon Tea", category: "Drinks", cost: 700, price: 1800, quantity: 40 },
    { name: "French Fries", category: "Sides", cost: 1200, price: 2800, quantity: 35 },
    { name: "Chocolate Cake Slice", category: "Desserts", cost: 1800, price: 3500, quantity: 4 },
  ],
  WHOLESALE: [
    { name: "Premium Rice Wholesale Bag", category: "Staples", cost: 42000, price: 48000, quantity: 30 },
    { name: "Cooking Oil Carton", category: "Cooking Essentials", cost: 52000, price: 60000, quantity: 20 },
    { name: "Detergent Case", category: "Household", cost: 38000, price: 46000, quantity: 18 },
    { name: "Bottled Water Case", category: "Beverages", cost: 7800, price: 10500, quantity: 25 },
    { name: "Instant Noodle Carton", category: "Groceries", cost: 24000, price: 29000, quantity: 4 },
  ],
};

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
  const demoCapabilities = [...new Set(templates.flatMap((key) => [...STORE_TEMPLATES[key].capabilities]))];
  for (const capability of demoCapabilities) {
    await prisma.releaseFeature.upsert({
      where: { key: capability },
      update: { enabled: true },
      create: { key: capability, enabled: true, public: false },
    });
  }

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
        ? "LOT" : templateKey === "ELECTRONICS" ? "SERIAL" : "NONE";
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
        let firstSerialId = "";
        for (let index = 1; index <= 34; index += 1) {
          const serial = await tx.inventorySerial.upsert({
            where: { shopId_serial: { shopId: shop.id, serial: `ELEC-SN-${String(index).padStart(3, "0")}` } },
          update: {},
            create: {
              id: `${id}-serial-${index}`, shopId: shop.id, productId: product.id, locationId: main.id,
              serial: `ELEC-SN-${String(index).padStart(3, "0")}`, imei: `990000000000${String(index).padStart(2, "0")}`,
            },
          });
          if (index === 1) firstSerialId = serial.id;
        }
        if (firstSerialId) {
          await tx.warrantyRecord.upsert({
            where: { id: `${id}-warranty` },
            update: {
              serialId: firstSerialId, startsAt: demoDate,
              endsAt: new Date("2027-07-01T09:00:00.000Z"), status: "ACTIVE",
            },
            create: {
              id: `${id}-warranty`, shopId: shop.id, serialId: firstSerialId,
              startsAt: demoDate, endsAt: new Date("2027-07-01T09:00:00.000Z"),
              status: "ACTIVE", notes: "Deterministic electronics warranty",
            },
          });
        }
      }
      if (templateKey === "PHARMACY") {
        const quarantine = await tx.inventoryLocation.upsert({
          where: { shopId_name: { shopId: shop.id, name: "Quarantine" } },
          update: { type: "QUARANTINE", isActive: true },
          create: { id: `${id}-quarantine`, shopId: shop.id, name: "Quarantine", type: "QUARANTINE" },
        });
        const expiredBatch = await tx.inventoryBatch.upsert({
          where: { id: `${id}-expired-batch` },
          update: { quantity: 3, baseQuantity: 3, reservedQuantity: 0, unitCost: 2500 },
          create: {
            id: `${id}-expired-batch`, shopId: shop.id, productId: product.id,
            quantity: 3, baseQuantity: 3, unitCost: 2500, receivedAt: demoDate,
            note: "Expired stock held outside sellable inventory",
          },
        });
        const quarantineBalance = await tx.inventoryBalance.findFirst({
          where: { shopId: shop.id, productId: product.id, variantId: null, locationId: quarantine.id },
        });
        if (quarantineBalance) {
          await tx.inventoryBalance.update({ where: { id: quarantineBalance.id }, data: { onHand: 3, reserved: 0 } });
        } else {
          await tx.inventoryBalance.create({ data: {
            id: `${id}-quarantine-balance`, shopId: shop.id, productId: product.id,
            locationId: quarantine.id, onHand: 3, reserved: 0,
          } });
        }
        await tx.inventoryLot.upsert({
          where: { shopId_lotNumber: { shopId: shop.id, lotNumber: "PHARMACY-EXPIRED-Q" } },
          update: { quantity: 3, status: "ACTIVE", expiresAt: new Date("2025-12-31T00:00:00.000Z") },
          create: {
            id: `${id}-expired-lot`, shopId: shop.id, productId: product.id,
            locationId: quarantine.id, inventoryBatchId: expiredBatch.id,
            lotNumber: "PHARMACY-EXPIRED-Q", quantity: 3, unitCost: 2500,
            expiresAt: new Date("2025-12-31T00:00:00.000Z"), receivedAt: demoDate,
          },
        });
        await tx.inventoryMovement.upsert({
          where: { id: `${id}-expired-opening` },
          update: { baseQuantity: 3, occurredAt: demoDate },
          create: {
            id: `${id}-expired-opening`, shopId: shop.id, productId: product.id,
            locationId: quarantine.id, unitId: units[0]!.id, inventoryBatchId: expiredBatch.id,
            lotId: `${id}-expired-lot`, type: "OPENING", direction: "IN",
            baseQuantity: 3, enteredQuantity: 3, conversionFactor: 1, unitCost: 2500,
            sourceType: "DemoSeed", sourceId: expiredBatch.id,
            idempotencyKey: `demo-expired-opening:${shop.id}`, occurredAt: demoDate,
          },
        });
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
          const variant = await tx.productVariant.upsert({
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
          const variantBatch = await tx.inventoryBatch.upsert({
            where: { id: `${id}-variant-batch-${index + 1}` },
            update: { quantity: 4, baseQuantity: 4, reservedQuantity: 0, unitCost: 3000 },
            create: {
              id: `${id}-variant-batch-${index + 1}`, shopId: shop.id, productId: product.id,
              variantId: variant.id, quantity: 4, baseQuantity: 4, unitCost: 3000,
              receivedAt: demoDate, note: "Deterministic variant opening",
            },
          });
          const variantBalance = await tx.inventoryBalance.findFirst({
            where: { shopId: shop.id, productId: product.id, variantId: variant.id, locationId: main.id },
          });
          if (variantBalance) {
            await tx.inventoryBalance.update({ where: { id: variantBalance.id }, data: { onHand: 4, reserved: 0 } });
          } else {
            await tx.inventoryBalance.create({ data: {
              id: `${id}-variant-balance-${index + 1}`, shopId: shop.id, productId: product.id,
              variantId: variant.id, locationId: main.id, onHand: 4, reserved: 0,
            } });
          }
          await tx.inventoryMovement.upsert({
            where: { id: `${id}-variant-opening-${index + 1}` },
            update: { baseQuantity: 4, occurredAt: demoDate },
            create: {
              id: `${id}-variant-opening-${index + 1}`, shopId: shop.id, productId: product.id,
              variantId: variant.id, locationId: main.id, unitId: units[0]!.id,
              inventoryBatchId: variantBatch.id, type: "OPENING", direction: "IN",
              baseQuantity: 4, enteredQuantity: 4, conversionFactor: 1, unitCost: 3000,
              sourceType: "DemoSeed", sourceId: variant.id,
              idempotencyKey: `demo-variant-opening:${variant.id}`, occurredAt: demoDate,
            },
          });
          if (templateKey === "COSMETICS") {
            await tx.inventoryLot.upsert({
              where: { shopId_lotNumber: { shopId: shop.id, lotNumber: `COSMETICS-${index + 1}-LOT` } },
              update: { quantity: 4, status: "ACTIVE", expiresAt: new Date("2027-09-30T00:00:00.000Z") },
              create: {
                id: `${id}-variant-lot-${index + 1}`, shopId: shop.id, productId: product.id,
                variantId: variant.id, locationId: main.id, inventoryBatchId: variantBatch.id,
                lotNumber: `COSMETICS-${index + 1}-LOT`, quantity: 4, unitCost: 3000,
                expiresAt: new Date("2027-09-30T00:00:00.000Z"), receivedAt: demoDate,
              },
            });
          }
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
        await tx.productUnit.upsert({
          where: { productId_unitId: { productId: ingredient.id, unitId: units[0]!.id } },
          update: { conversionFactor: 1, isBase: true },
          create: {
            id: `${id}-ingredient-unit`, productId: ingredient.id, unitId: units[0]!.id,
            conversionFactor: 1, isBase: true,
          },
        });
        const ingredientBatch = await tx.inventoryBatch.upsert({
          where: { id: `${id}-ingredient-batch` },
          update: { quantity: 20, baseQuantity: 20, reservedQuantity: 0, unitCost: 1000 },
          create: {
            id: `${id}-ingredient-batch`, shopId: shop.id, productId: ingredient.id,
            quantity: 20, baseQuantity: 20, unitCost: 1000, receivedAt: demoDate,
          },
        });
        const ingredientBalance = await tx.inventoryBalance.findFirst({
          where: { shopId: shop.id, productId: ingredient.id, variantId: null, locationId: main.id },
        });
        if (ingredientBalance) {
          await tx.inventoryBalance.update({ where: { id: ingredientBalance.id }, data: { onHand: 20, reserved: 0 } });
        } else {
          await tx.inventoryBalance.create({ data: {
            id: `${id}-ingredient-balance`, shopId: shop.id, productId: ingredient.id,
            locationId: main.id, onHand: 20, reserved: 0,
          } });
        }
        await tx.inventoryMovement.upsert({
          where: { id: `${id}-ingredient-opening` },
          update: { baseQuantity: 20, occurredAt: demoDate },
          create: {
            id: `${id}-ingredient-opening`, shopId: shop.id, productId: ingredient.id,
            locationId: main.id, unitId: units[0]!.id, inventoryBatchId: ingredientBatch.id,
            type: "OPENING", direction: "IN", baseQuantity: 20, enteredQuantity: 20,
            conversionFactor: 1, unitCost: 1000, sourceType: "DemoSeed", sourceId: ingredient.id,
            idempotencyKey: `demo-ingredient-opening:${shop.id}`, occurredAt: demoDate,
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

      const demoProductUnits = await tx.productUnit.findMany({
        where: { productId: product.id },
        include: { unit: true },
        orderBy: [{ isBase: "desc" }, { conversionFactor: "asc" }],
      });
      const demoVariants = await tx.productVariant.findMany({
        where: { productId: product.id, isDefault: false },
        orderBy: { id: "asc" },
      });
      const priceBook = await tx.priceBook.upsert({
        where: { shopId_name: { shopId: shop.id, name: "Default" } },
        update: { currencyCode: "MMK", isDefault: true, isActive: true },
        create: { id: `${id}-price-book`, shopId: shop.id, name: "Default", currencyCode: "MMK", isDefault: true },
      });
      const productTargetKey = `${product.id}:*:*`;
      await tx.priceEntry.updateMany({
        where: { shopId: shop.id, targetKey: productTargetKey, id: { notIn: [`${id}-price-active`, `${id}-price-future`] } },
        data: { status: "EXPIRED", effectiveTo: demoDate },
      });
      await tx.priceEntry.upsert({
        where: { id: `${id}-price-active` },
        update: { unitPrice: 5000, status: "ACTIVE", effectiveFrom: demoDate, effectiveTo: new Date("2027-01-01T00:00:00.000Z") },
        create: {
          id: `${id}-price-active`, shopId: shop.id, priceBookId: priceBook.id, productId: product.id,
          targetKey: productTargetKey, unitPrice: 5000, currencyCode: "MMK", status: "ACTIVE",
          effectiveFrom: demoDate, effectiveTo: new Date("2027-01-01T00:00:00.000Z"),
          reason: "Deterministic demo regular price", actorId: owner.id,
        },
      });
      await tx.priceEntry.upsert({
        where: { id: `${id}-price-future` },
        update: { unitPrice: 5500, status: "SCHEDULED", effectiveFrom: new Date("2027-01-01T00:00:00.000Z") },
        create: {
          id: `${id}-price-future`, shopId: shop.id, priceBookId: priceBook.id, productId: product.id,
          targetKey: productTargetKey, unitPrice: 5500, currencyCode: "MMK", status: "SCHEDULED",
          effectiveFrom: new Date("2027-01-01T00:00:00.000Z"),
          reason: "Deterministic scheduled price", actorId: owner.id,
        },
      });

      for (const [catalogIndex, fixture] of catalogFixtures[templateKey].entries()) {
        const sequence = catalogIndex + 2;
        const catalogId = `${id}-catalog-${sequence}`;
        const catalogCategory = await tx.category.upsert({
          where: { shopId_name: { shopId: shop.id, name: fixture.category } },
          update: {},
          create: { id: `${catalogId}-category`, shopId: shop.id, name: fixture.category },
        });
        const catalogProduct = await tx.product.upsert({
          where: { shopId_sku: { shopId: shop.id, sku: `${templateKey}-${String(sequence).padStart(3, "0")}` } },
          update: {
            name: fixture.name, categoryId: catalogCategory.id, trackingMode: "NONE",
            cost: fixture.cost, price: fixture.price, isActive: true,
          },
          create: {
            id: catalogId, shopId: shop.id, categoryId: catalogCategory.id,
            sku: `${templateKey}-${String(sequence).padStart(3, "0")}`, name: fixture.name,
            description: `Retained ${template.label} demo catalog item`, trackingMode: "NONE",
            capabilities: {}, cost: fixture.cost, price: fixture.price,
          },
        });
        const catalogUnit = await tx.productUnit.upsert({
          where: { productId_unitId: { productId: catalogProduct.id, unitId: units[0]!.id } },
          update: { conversionFactor: 1, isBase: true, canPurchase: true, canSell: true },
          create: {
            id: `${catalogId}-product-unit`, productId: catalogProduct.id, unitId: units[0]!.id,
            conversionFactor: 1, isBase: true, canPurchase: true, canSell: true,
          },
        });
        const catalogBatch = await tx.inventoryBatch.upsert({
          where: { id: `${catalogId}-opening-batch` },
          update: {
            quantity: fixture.quantity, baseQuantity: fixture.quantity, reservedQuantity: 0,
            unitCost: fixture.cost, receivedAt: demoDate,
          },
          create: {
            id: `${catalogId}-opening-batch`, shopId: shop.id, productId: catalogProduct.id,
            quantity: fixture.quantity, baseQuantity: fixture.quantity, unitCost: fixture.cost,
            receivedAt: demoDate, note: "Deterministic retained catalog opening",
          },
        });
        const catalogBalance = await tx.inventoryBalance.findFirst({
          where: { shopId: shop.id, productId: catalogProduct.id, variantId: null, locationId: main.id },
        });
        if (catalogBalance) {
          await tx.inventoryBalance.update({
            where: { id: catalogBalance.id },
            data: { onHand: fixture.quantity, reserved: 0 },
          });
        } else {
          await tx.inventoryBalance.create({ data: {
            id: `${catalogId}-balance`, shopId: shop.id, productId: catalogProduct.id,
            locationId: main.id, onHand: fixture.quantity, reserved: 0,
          } });
        }
        await tx.inventoryMovement.upsert({
          where: { id: `${catalogId}-opening-movement` },
          update: { baseQuantity: fixture.quantity, enteredQuantity: fixture.quantity, unitCost: fixture.cost },
          create: {
            id: `${catalogId}-opening-movement`, shopId: shop.id, productId: catalogProduct.id,
            locationId: main.id, unitId: units[0]!.id, inventoryBatchId: catalogBatch.id,
            type: "OPENING", direction: "IN", baseQuantity: fixture.quantity,
            enteredQuantity: fixture.quantity, conversionFactor: 1, unitCost: fixture.cost,
            sourceType: "DemoCatalogSeed", sourceId: catalogProduct.id,
            idempotencyKey: `demo-catalog-opening:${catalogProduct.id}`, occurredAt: demoDate,
          },
        });
        const catalogTargetKey = `${catalogProduct.id}:*:*`;
        await tx.priceEntry.upsert({
          where: { id: `${catalogId}-price-active` },
          update: {
            unitPrice: fixture.price, status: "ACTIVE", effectiveFrom: demoDate,
            effectiveTo: new Date("2027-01-01T00:00:00.000Z"),
          },
          create: {
            id: `${catalogId}-price-active`, shopId: shop.id, priceBookId: priceBook.id,
            productId: catalogProduct.id, targetKey: catalogTargetKey, unitPrice: fixture.price,
            currencyCode: "MMK", status: "ACTIVE", effectiveFrom: demoDate,
            effectiveTo: new Date("2027-01-01T00:00:00.000Z"),
            reason: "Retained demo catalog price", actorId: owner.id,
          },
        });
        const barcodeValue = `GM-${templateKey}-${String(sequence).padStart(3, "0")}`;
        await tx.productBarcode.upsert({
          where: { shopId_normalizedValue: { shopId: shop.id, normalizedValue: barcodeValue } },
          update: {
            productId: catalogProduct.id, productUnitId: catalogUnit.id, status: "ACTIVE",
            kind: "INTERNAL", isPrimary: true, packageQuantity: 1,
          },
          create: {
            id: `${catalogId}-barcode`, shopId: shop.id, productId: catalogProduct.id,
            productUnitId: catalogUnit.id, value: barcodeValue, normalizedValue: barcodeValue,
            symbology: "CODE128", kind: "INTERNAL", packageQuantity: 1,
            isInternal: true, isPrimary: true,
          },
        });
        if (catalogIndex === 1) {
          await tx.promotion.upsert({
            where: { id: `${catalogId}-promotion` },
            update: {
              name: `${fixture.name} demo offer`, value: 7, state: "SCHEDULED",
              startsAt: new Date("2026-01-01T00:00:00.000Z"), endsAt: new Date("2027-01-01T00:00:00.000Z"),
            },
            create: {
              id: `${catalogId}-promotion`, shopId: shop.id, productId: catalogProduct.id,
              targetKey: `${catalogTargetKey}:*:ALL`, channel: "ALL",
              name: `${fixture.name} demo offer`, type: "PERCENTAGE", value: 7,
              discountBase: "REGULAR_PRICE", startsAt: new Date("2026-01-01T00:00:00.000Z"),
              endsAt: new Date("2027-01-01T00:00:00.000Z"), timeZone: "Asia/Yangon",
              state: "SCHEDULED", priority: 5, note: "Retained catalog promotion",
              reason: "Demo/UAT fixture", actorId: owner.id,
            },
          });
        }
      }

      const barcodeTargets = [
        { suffix: "primary", value: `GM-${templateKey}-001`, kind: "INTERNAL", unit: demoProductUnits[0], variant: demoVariants[0] },
        { suffix: "manufacturer", value: `955${String(templates.indexOf(templateKey) + 1).padStart(9, "0")}`, kind: "MANUFACTURER", unit: demoProductUnits[0], variant: demoVariants[1] },
        ...(demoProductUnits.slice(1, 3).map((unit, index) => ({ suffix: index === 0 ? "pack" : "carton", value: `GM-${templateKey}-${index === 0 ? "PACK" : "CARTON"}`, kind: index === 0 ? "PACK" : "CARTON", unit, variant: demoVariants[index] }))),
      ];
      for (const target of barcodeTargets) {
        const normalizedValue = target.value.toUpperCase();
        await tx.productBarcode.upsert({
          where: { shopId_normalizedValue: { shopId: shop.id, normalizedValue } },
          update: {
            productId: product.id, variantId: target.variant?.id || null, productUnitId: target.unit?.id || null,
            kind: target.kind, status: "ACTIVE", isPrimary: target.suffix === "primary",
            packageQuantity: target.unit?.conversionFactor || 1,
          },
          create: {
            id: `${id}-barcode-${target.suffix}`, shopId: shop.id, productId: product.id,
            variantId: target.variant?.id || null, productUnitId: target.unit?.id || null,
            value: target.value, normalizedValue, symbology: "CODE128", kind: target.kind,
            packageQuantity: target.unit?.conversionFactor || 1, isInternal: target.kind === "INTERNAL",
            isPrimary: target.suffix === "primary",
          },
        });
      }

      const promotionFixtures = [
        { suffix: "ended", name: "Demo ended promotion", type: "PERCENTAGE", value: 5, startsAt: "2025-10-01T00:00:00.000Z", endsAt: "2025-11-01T00:00:00.000Z", state: "SCHEDULED" },
        { suffix: "active", name: `${template.label} launch offer`, type: templateKey === "GENERAL_STORE" ? "FIXED_PRICE" : "PERCENTAGE", value: templateKey === "GENERAL_STORE" ? 4500 : 10, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2027-01-01T00:00:00.000Z", state: "SCHEDULED" },
        { suffix: "future", name: "Demo future promotion", type: "PERCENTAGE", value: 8, startsAt: "2027-02-01T00:00:00.000Z", endsAt: "2027-03-01T00:00:00.000Z", state: "SCHEDULED" },
        { suffix: "paused", name: "Demo paused promotion", type: "PERCENTAGE", value: 6, startsAt: "2026-06-01T00:00:00.000Z", endsAt: "2026-12-01T00:00:00.000Z", state: "PAUSED" },
      ] as const;
      for (const fixture of promotionFixtures) {
        await tx.promotion.upsert({
          where: { id: `${id}-promotion-${fixture.suffix}` },
          update: { name: fixture.name, type: fixture.type, value: fixture.value, startsAt: new Date(fixture.startsAt), endsAt: new Date(fixture.endsAt), state: fixture.state },
          create: {
            id: `${id}-promotion-${fixture.suffix}`, shopId: shop.id, productId: product.id,
            targetKey: `${productTargetKey}:*:ALL`, channel: "ALL", name: fixture.name,
            type: fixture.type, value: fixture.value, discountBase: "REGULAR_PRICE",
            startsAt: new Date(fixture.startsAt), endsAt: new Date(fixture.endsAt), timeZone: "Asia/Yangon",
            state: fixture.state, priority: fixture.suffix === "active" ? 10 : 0,
            note: "Deterministic retained demo promotion", reason: "Demo/UAT fixture", actorId: owner.id,
          },
        });
      }

      const customer = await tx.customer.upsert({
        where: { id: `${id}-customer` },
        update: { name: "Demo Customer", phone: "09111111111", shopId: shop.id },
        create: { id: `${id}-customer`, shopId: shop.id, name: "Demo Customer", phone: "09111111111" },
      });
      if (templateKey === "WHOLESALE") {
        const group = await tx.customerPriceGroup.findFirst({ where: { shopId: shop.id, name: "Retail Partners" } });
        if (group) await tx.customer.update({ where: { id: customer.id }, data: { priceGroupId: group.id } });
      }
      const supplier = await tx.supplier.upsert({
        where: { shopId_name: { shopId: shop.id, name: "Demo Supplier" } },
        update: { phone: "09222222222" },
        create: { id: `${id}-supplier`, shopId: shop.id, name: "Demo Supplier", phone: "09222222222" },
      });
      const existingSale = await tx.order.findUnique({ where: { id: `${id}-sale` } });
      if (!existingSale) {
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
      }

      const purchaseBatch = await tx.inventoryBatch.upsert({
        where: { id: `${id}-purchase-batch` },
        update: { quantity: 5, baseQuantity: 5, reservedQuantity: 0, unitCost: 3000 },
        create: {
          id: `${id}-purchase-batch`, shopId: shop.id, productId: product.id,
          quantity: 5, baseQuantity: 5, unitCost: 3000, receivedAt: new Date("2026-07-03T09:00:00.000Z"),
        },
      });
      const existingPurchase = await tx.purchase.findUnique({ where: { id: `${id}-purchase` } });
      if (!existingPurchase) {
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
      }
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
      const seededLotOpening = new Map<string, number>([
        [`${id}-lot-a`, 29], [`${id}-lot-b`, 5], [`${id}-expired-lot`, 3],
        ...demoVariants.map((_, index) => [`${id}-variant-lot-${index + 1}`, 4] as [string, number]),
      ]);
      for (const [lotId, openingQuantity] of seededLotOpening) {
        const seededLot = await tx.inventoryLot.findUnique({ where: { id: lotId } });
        if (!seededLot) continue;
        const lotMovements = await tx.inventoryMovement.findMany({
          where: { shopId: shop.id, lotId, type: { not: "OPENING" } },
          select: { direction: true, baseQuantity: true },
        });
        const quantity = lotMovements.reduce(
          (sum, movement) => sum + (movement.direction === "IN" ? 1 : -1) * Number(movement.baseQuantity),
          openingQuantity,
        );
        await tx.inventoryLot.update({ where: { id: lotId }, data: { quantity: Math.max(0, quantity) } });
      }
      const shopBalances = await tx.inventoryBalance.findMany({ where: { shopId: shop.id } });
      for (const shopBalance of shopBalances) {
        const balanceMovements = await tx.inventoryMovement.findMany({
          where: {
            shopId: shop.id, productId: shopBalance.productId,
            variantId: shopBalance.variantId, locationId: shopBalance.locationId,
          },
          select: { direction: true, baseQuantity: true },
        });
        const onHand = balanceMovements.reduce(
          (sum, movement) => sum + (movement.direction === "IN" ? 1 : -1) * Number(movement.baseQuantity),
          0,
        );
        const activeReservations = await tx.inventoryReservation.aggregate({
          where: {
            shopId: shop.id, productId: shopBalance.productId, variantId: shopBalance.variantId,
            locationId: shopBalance.locationId, status: "ACTIVE",
          },
          _sum: { quantity: true },
        });
        await tx.inventoryBalance.update({
          where: { id: shopBalance.id },
          data: { onHand, reserved: activeReservations._sum.quantity || 0 },
        });
      }
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
