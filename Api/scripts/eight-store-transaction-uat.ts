import "dotenv/config";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

import { app } from "../src/app.js";
import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";

type Json = Record<string, any>;
type TemplateKey = "GENERAL_STORE" | "MINI_MARKET" | "FASHION" | "ELECTRONICS" |
  "PHARMACY" | "COSMETICS" | "ONLINE_RESTAURANT" | "WHOLESALE";

async function request(baseUrl: string, path: string, options: {
  method?: string;
  token?: string;
  body?: Json;
  headers?: Record<string, string>;
  expectedStatus?: number;
} = {}): Promise<any> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (options.expectedStatus !== undefined) {
    assert.equal(response.status, options.expectedStatus, `${path}: ${text}`);
    return data;
  }
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} failed ${response.status}: ${text}`);
  return data;
}

async function runStoreScenario(baseUrl: string, token: string, shop: Json, stamp: string) {
  const shopId = shop.id as string;
  const templateKey = shop.templateKey as TemplateKey;
  const productsResult = await request(baseUrl, `/shops/${shopId}/products?page=1&pageSize=25`, { token });
  const configuration = await request(baseUrl, `/shops/${shopId}/configuration`, { token });
  const product = productsResult.products.find((entry: Json) => entry.sku === `${templateKey}-001`);
  assert.ok(product, `${templateKey}: deterministic product is missing`);
  assert.equal(configuration.configuration.templateKey, templateKey);
  const barcodes = await request(baseUrl, `/shops/${shopId}/barcodes?page=1&pageSize=25`, { token });
  assert.ok(barcodes.barcodes.length >= 2, `${templateKey}: barcode fixtures are missing`);
  const primaryBarcode = barcodes.barcodes.find((entry: Json) => entry.productId === product.id && entry.isPrimary) || barcodes.barcodes[0];
  const barcodeLookup = await request(baseUrl, `/shops/${shopId}/barcode-lookup/${encodeURIComponent(primaryBarcode.value)}?channel=POS`, { token });
  assert.equal(barcodeLookup.barcode.productId, product.id);
  assert.ok(barcodeLookup.pricing.finalUnitPrice >= 0);
  const promotions = await request(baseUrl, `/shops/${shopId}/promotions?page=1&pageSize=25`, { token });
  assert.ok(promotions.promotions.length >= 4, `${templateKey}: promotion state fixtures are missing`);
  const pricingOverview = await request(baseUrl, `/shops/${shopId}/pricing/overview`, { token });
  assert.ok(pricingOverview.overview.activeBarcodes >= 2);
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { shopId, name: "Demo Supplier" } });
  const customer = await prisma.customer.findFirstOrThrow({ where: { shopId, name: "Demo Customer" } });
  const main = await prisma.inventoryLocation.findFirstOrThrow({ where: { shopId, name: "Main" } });
  const baseUnit = await prisma.productUnit.findFirst({
    where: { productId: product.id, isBase: true }, include: { unit: true },
  });
  const variant = ["FASHION", "COSMETICS"].includes(templateKey)
    ? await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id }, orderBy: { name: "asc" } })
    : null;

  let receivedSerialId: string | undefined;
  if (templateKey !== "ONLINE_RESTAURANT") {
    const purchaseUnit = templateKey === "MINI_MARKET" || templateKey === "WHOLESALE"
      ? await prisma.productUnit.findFirst({
        where: { productId: product.id, isBase: false, canPurchase: true }, include: { unit: true },
        orderBy: { conversionFactor: "asc" },
      })
      : baseUnit;
    const purchase = await request(baseUrl, `/shops/${shopId}/purchases`, {
      method: "POST", token,
      body: {
        supplierId: supplier.id,
        notes: `Eight-store UAT ${stamp}`,
        items: [{
          productId: product.id,
          ...(variant ? { variantId: variant.id } : {}),
          ...(purchaseUnit ? { unitId: purchaseUnit.unitId } : {}),
          quantity: 1,
          unitCost: templateKey === "WHOLESALE" ? 12000 : 3200,
        }],
      },
    });
    await request(baseUrl, `/shops/${shopId}/purchases/${purchase.purchase.id}/send`, {
      method: "POST", token, body: {},
    });
    const line = purchase.purchase.items[0];
    const receiptLine: Json = { purchaseItemId: line.id, quantity: 1, locationId: main.id };
    if (["MINI_MARKET", "PHARMACY", "COSMETICS"].includes(templateKey)) {
      receiptLine.lot = { lotNumber: `UAT-${templateKey}-${stamp}`, expiresAt: "2028-12-31" };
    }
    if (templateKey === "ELECTRONICS") {
      receiptLine.serials = [{ serial: `UAT-SN-${stamp}`, imei: `881${stamp.replaceAll(/\D/g, "").slice(-12).padStart(12, "0")}` }];
    }
    const received = await request(baseUrl, `/shops/${shopId}/purchases/${purchase.purchase.id}/receive`, {
      method: "POST", token,
      headers: { "Idempotency-Key": `uat-receive:${templateKey}:${stamp}` },
      body: { note: `UAT receipt ${stamp}`, items: [receiptLine] },
    });
    assert.equal(received.purchase.status, "received");
    const duplicate = await request(baseUrl, `/shops/${shopId}/purchases/${purchase.purchase.id}/receive`, {
      method: "POST", token,
      headers: { "Idempotency-Key": `uat-receive:${templateKey}:${stamp}` },
      body: { note: `UAT receipt ${stamp}`, items: [receiptLine] },
    });
    assert.equal(duplicate.duplicate, true);
    const paid = await request(baseUrl, `/shops/${shopId}/purchases/${purchase.purchase.id}/payments`, {
      method: "POST", token,
      body: { amount: Math.min(1000, purchase.purchase.total), method: "Cash", reference: `UAT-${stamp}` },
    });
    assert.ok(paid.purchase.paidAmount > 0);
    if (templateKey === "ELECTRONICS") {
      receivedSerialId = (await prisma.inventorySerial.findFirstOrThrow({
        where: { shopId, serial: `UAT-SN-${stamp}` },
      })).id;
    }
  }

  let orderProduct = product;
  let orderVariant = variant;
  const orderItem: Json = { productId: product.id, quantity: 1 };
  if (variant) orderItem.variantId = variant.id;
  if (baseUnit) orderItem.unitId = baseUnit.unitId;

  if (templateKey === "MINI_MARKET") {
    const pack = await prisma.productUnit.findFirstOrThrow({
      where: { productId: product.id, isBase: false, canSell: true }, orderBy: { conversionFactor: "asc" },
    });
    orderItem.unitId = pack.unitId;
    orderItem.quantity = 1;
  }
  if (templateKey === "ELECTRONICS") orderItem.serialIds = [receivedSerialId];
  if (templateKey === "COSMETICS") {
    const lot = await prisma.inventoryLot.findFirstOrThrow({
      where: { shopId, productId: product.id, variantId: variant!.id, status: "ACTIVE" },
      orderBy: { expiresAt: "asc" },
    });
    orderItem.lotId = lot.id;
    orderItem.lotOverrideReason = "Exact cosmetic shade/lot UAT allocation";
  }
  if (templateKey === "ONLINE_RESTAURANT") {
    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { productId: product.id }, include: { modifierGroups: { include: { options: true } } },
    });
    orderItem.modifierOptionIds = [recipe.modifierGroups[0]!.options[0]!.id];
  }
  if (templateKey === "WHOLESALE") {
    orderItem.quantity = 10;
    assert.ok(customer.priceGroupId, "Wholesale demo customer must belong to a price group");
  }

  const beforeIngredient = templateKey === "ONLINE_RESTAURANT"
    ? await prisma.inventoryBalance.findFirstOrThrow({
      where: { shopId, product: { sku: "RESTAURANT-INGREDIENT-001" }, locationId: main.id },
    })
    : null;
  const order = await request(baseUrl, `/shops/${shopId}/orders`, {
    method: "POST", token,
    body: {
      customerId: customer.id,
      fulfillmentStatus: templateKey === "ONLINE_RESTAURANT" ? "new" : "reserved",
      source: templateKey === "ONLINE_RESTAURANT" ? "Delivery" : "In-Store",
      note: `Eight-store UAT ${stamp}`,
      items: [orderItem],
    },
  });
  if (templateKey === "WHOLESALE") {
    assert.equal(order.order.items[0].tierUnitPrice, 4400);
    assert.equal(order.order.items[0].promotionDiscount, 500);
    assert.equal(order.order.items[0].unitPrice, 3900);
    assert.ok(order.order.items[0].appliedTierId);
  }
  if (templateKey === "MINI_MARKET") {
    assert.equal(order.order.items[0].regularUnitPrice, 30000);
    assert.equal(order.order.items[0].promotionDiscount, 3000);
    assert.equal(order.order.items[0].unitPrice, 27000);
  }
  assert.equal(order.order.items[0].finalUnitPrice, order.order.items[0].unitPrice);
  assert.ok(order.order.items[0].priceResolvedAt);
  await request(baseUrl, `/shops/${shopId}/orders/${order.order.id}/payments`, {
    method: "POST", token, body: { method: "Cash", amount: order.order.total },
  });
  const transitions = templateKey === "ONLINE_RESTAURANT"
    ? ["confirmed", "preparing", "ready", "completed"]
    : ["completed"];
  for (const fulfillmentStatus of transitions) {
    await request(baseUrl, `/shops/${shopId}/orders/${order.order.id}/status`, {
      method: "PATCH", token, body: { fulfillmentStatus },
    });
  }
  const storedOrder = await prisma.order.findFirstOrThrow({
    where: { id: order.order.id, shopId },
    include: { items: { include: { allocations: true, serialAllocations: true, modifierSelections: true } } },
  });
  assert.equal(storedOrder.fulfillmentStatus, "completed");
  assert.ok(storedOrder.completedAt);
  if (variant) assert.equal(storedOrder.items[0]!.variantId, variant.id);
  if (templateKey === "ELECTRONICS") {
    assert.equal(storedOrder.items[0]!.serialAllocations.length, 1);
    const serial = await prisma.inventorySerial.findUniqueOrThrow({ where: { id: receivedSerialId! } });
    assert.equal(serial.status, "SOLD");
    const warranty = await request(baseUrl, `/shops/${shopId}/warranties`, {
      method: "POST", token,
      body: {
        serialId: serial.id, orderId: storedOrder.id,
        startsAt: "2026-08-03", endsAt: "2027-08-03", notes: "UAT sold-device warranty",
      },
    });
    assert.equal(warranty.warranty.status, "ACTIVE");
  }
  if (templateKey === "PHARMACY") {
    const saleMovement = await prisma.inventoryMovement.findFirstOrThrow({
      where: { shopId, sourceType: "OrderItemAllocation", sourceId: { startsWith: storedOrder.items[0]!.allocations[0]!.id } },
    });
    const allocatedLot = await prisma.inventoryLot.findUniqueOrThrow({ where: { id: saleMovement.lotId! } });
    assert.ok(allocatedLot.expiresAt && allocatedLot.expiresAt > new Date());
    const expiredLot = await prisma.inventoryLot.findFirstOrThrow({ where: { shopId, lotNumber: "PHARMACY-EXPIRED-Q" } });
    await request(baseUrl, `/shops/${shopId}/orders`, {
      method: "POST", token, expectedStatus: 400,
      body: {
        fulfillmentStatus: "reserved", source: "In-Store",
        items: [{ productId: product.id, quantity: 1, lotId: expiredLot.id, lotOverrideReason: "Must be rejected" }],
      },
    });
  }
  if (templateKey === "ONLINE_RESTAURANT") {
    const afterIngredient = await prisma.inventoryBalance.findFirstOrThrow({
      where: { id: beforeIngredient!.id },
    });
    const consumed = Number(beforeIngredient!.onHand) - Number(afterIngredient.onHand);
    assert.ok(Math.abs(consumed - 0.35) < 0.0005, `Expected 0.350 ingredient consumption, received ${consumed}`);
    assert.equal(storedOrder.items[0]!.modifierSelections.length, 1);
  }

  const [dashboard, reports] = await Promise.all([
    request(baseUrl, `/shops/${shopId}/dashboard`, { token }),
    request(baseUrl, `/shops/${shopId}/reports/sales`, { token }),
  ]);
  assert.ok(dashboard.summary);
  assert.ok(reports);
  return {
    templateKey,
    shop: shop.name,
    purchase: templateKey === "ONLINE_RESTAURANT" ? "not applicable" : "PASS",
    saleOrOrder: "PASS",
    payment: "PASS",
    inventory: "PASS",
    reports: "PASS",
  };
}

async function main() {
  assertLocalDatabaseUrl();
  if (process.env.NODE_ENV === "production") throw new Error("Eight-store UAT is disabled in production.");
  const email = process.env.DEMO_OWNER_EMAIL;
  const password = process.env.DEMO_OWNER_PASSWORD;
  if (!email || !password) throw new Error("Set DEMO_OWNER_EMAIL and DEMO_OWNER_PASSWORD.");
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const stamp = `${Date.now()}`;
  const results: Json[] = [];
  const failures: Json[] = [];
  try {
    const login = await request(baseUrl, "/auth/login", { method: "POST", body: { email, password } });
    const shops = [...login.user.shops].sort((a: Json, b: Json) => a.templateKey.localeCompare(b.templateKey));
    assert.equal(shops.length, 8, "Demo owner must have exactly eight isolated stores");
    for (const shop of shops) {
      try {
        const result = await runStoreScenario(baseUrl, login.token, shop, stamp);
        results.push(result);
        console.log(`PASS ${result.templateKey} purchase=${result.purchase} sale/order=PASS inventory=PASS finance=PASS`);
      } catch (error) {
        const failure = { templateKey: shop.templateKey, shop: shop.name, error: error instanceof Error ? error.message : String(error) };
        failures.push(failure);
        console.error(`FAIL ${failure.templateKey}: ${failure.error}`);
      }
    }
    console.log(JSON.stringify({ status: failures.length ? "FAIL" : "PASS", stamp, results, failures }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
