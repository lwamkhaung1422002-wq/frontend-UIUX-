import "dotenv/config";

import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

import { app } from "../src/app.js";
import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";

type Json = Record<string, any>;

async function request(baseUrl: string, path: string, options: {
  method?: string;
  token?: string;
  body?: Json;
  headers?: Record<string, string>;
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
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed ${response.status}: ${text}`);
  }
  return data;
}

async function rawRequest(baseUrl: string, path: string, options: {
  method?: string;
  token?: string;
  body?: Json;
} = {}): Promise<{ status: number; data: Json }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : {} };
}

async function main(): Promise<void> {
  assertLocalDatabaseUrl();

  const server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const stamp = Date.now();

  try {
    const registered = await request(baseUrl, "/auth/register", {
      method: "POST",
      body: {
        name: "API Test Owner",
        shopName: `API Test Shop ${stamp}`,
        email: `api-test-${stamp}@example.local`,
        password: "Password123!",
      },
    });
    const token = registered.token;
    const shopId = registered.shop.id;
    assert.ok(token);
    assert.ok(shopId);

    const me = await request(baseUrl, "/auth/me", { token });
    assert.equal(me.user.shops.length, 1);
    const updatedShop = await request(baseUrl, `/shops/${shopId}`, {
      method: "PATCH", token,
      body: { address: "Yangon", logoUrl: "https://cdn.example.test/logo.png" },
    });
    assert.equal(updatedShop.shop.address, "Yangon");
    assert.equal(updatedShop.shop.logoUrl, "https://cdn.example.test/logo.png");
    const fetchedShop = await request(baseUrl, `/shops/${shopId}`, { token });
    assert.equal(fetchedShop.shop.address, "Yangon");
    const settings = await request(baseUrl, `/shops/${shopId}/settings`, {
      method: "PATCH", token, body: { locale: "zh-CN" },
    });
    assert.equal(settings.settings.locale, "zh-CN");
    const categoryResult = await request(baseUrl, `/shops/${shopId}/categories`, {
      method: "POST", token, body: { name: `API Category ${stamp}` },
    });
    const categories = await request(baseUrl, `/shops/${shopId}/categories`, { token });
    assert.equal(categories.categories.find((category: { id: string }) => category.id === categoryResult.category.id)._count.products, 0);
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    assert.equal((await rawRequest(baseUrl, "/auth/me", { token: tamperedToken })).status, 401);
    const expiredToken = jwt.sign(
      { userId: registered.user.id, email: registered.user.email },
      process.env.JWT_SECRET!,
      { expiresIn: -1 },
    );
    assert.equal((await rawRequest(baseUrl, "/auth/me", { token: expiredToken })).status, 401);

    const productResult = await request(baseUrl, `/shops/${shopId}/products`, {
      method: "POST",
      token,
      body: { name: "API Smoke Product", sku: `API-SMOKE-${stamp}`, price: 2000, cost: 900 },
    });
    const productId = productResult.product.id;
    const variantResult = await request(baseUrl, `/shops/${shopId}/products/${productId}/variants`, {
      method: "POST",
      token,
      body: { name: "API Smoke Variant", sku: `API-SMOKE-VARIANT-${stamp}`, price: 2100, cost: 950 },
    });
    const variantsPage = await request(
      baseUrl,
      `/shops/${shopId}/variants?search=${encodeURIComponent(variantResult.variant.sku)}&page=1&pageSize=25`,
      { token },
    );
    assert.equal(variantsPage.totalCount, 1);
    assert.equal(variantsPage.variants[0].id, variantResult.variant.id);
    const kilogram = await request(baseUrl, `/shops/${shopId}/units`, {
      method: "POST",
      token,
      body: { name: `Kilogram ${stamp}`, symbol: "kg", precision: 3 },
    });
    const locations = await request(baseUrl, `/shops/${shopId}/locations`, { token });
    const decimalProduct = await request(baseUrl, `/shops/${shopId}/products`, {
      method: "POST",
      token,
      body: {
        name: `Decimal Product ${stamp}`,
        sku: `DECIMAL-${stamp}`,
        price: 3000,
        cost: 1500,
        quantityPrecision: 3,
        units: [{ unitId: kilogram.unit.id, conversionFactor: 1, isBase: true }],
      },
    });
    await request(baseUrl, `/shops/${shopId}/inventory-operations/receive`, {
      method: "POST",
      token,
      headers: { "Idempotency-Key": `decimal-receipt-${stamp}` },
      body: {
        productId: decimalProduct.product.id,
        unitId: kilogram.unit.id,
        locationId: locations.locations[0].id,
        enteredQuantity: 1.125,
        unitCost: 1500,
        reason: "Decimal-safe integration receipt",
      },
    });
    const decimalBalances = await request(
      baseUrl,
      `/shops/${shopId}/inventory-balances?search=${encodeURIComponent(decimalProduct.product.name)}`,
      { token },
    );
    assert.equal(decimalBalances.balances[0].onHand, "1.125");
    const decimalBalance = decimalBalances.balances[0];
    const adjustmentKey = `decimal-adjustment-${stamp}`;
    const decimalAdjustment = await request(baseUrl, `/shops/${shopId}/inventory-operations/adjust`, {
      method: "POST", token, headers: { "Idempotency-Key": adjustmentKey },
      body: {
        balanceId: decimalBalance.id,
        expectedVersion: decimalBalance.version,
        action: "REMOVE",
        quantity: "0.125",
        reason: "Decimal-safe stock count correction",
      },
    });
    assert.equal(decimalAdjustment.balance.onHand, "1");
    assert.equal(decimalAdjustment.duplicate, false);
    const duplicateDecimalAdjustment = await request(baseUrl, `/shops/${shopId}/inventory-operations/adjust`, {
      method: "POST", token, headers: { "Idempotency-Key": adjustmentKey },
      body: {
        balanceId: decimalBalance.id,
        expectedVersion: decimalBalance.version,
        action: "REMOVE",
        quantity: "0.125",
        reason: "Decimal-safe stock count correction",
      },
    });
    assert.equal(duplicateDecimalAdjustment.duplicate, true);
    await assert.rejects(
      request(baseUrl, `/shops/${shopId}/inventory-operations/adjust`, {
        method: "POST", token, headers: { "Idempotency-Key": `stale-adjustment-${stamp}` },
        body: {
          balanceId: decimalBalance.id,
          expectedVersion: decimalBalance.version,
          action: "ADD",
          quantity: "0.5",
          reason: "This optimistic version is stale",
        },
      }),
      /409/,
    );
    const quarantineLocation = await request(baseUrl, `/shops/${shopId}/locations`, {
      method: "POST", token,
      body: { name: `Quarantine ${stamp}`, type: "QUARANTINE" },
    });
    const transferKey = `decimal-transfer-${stamp}`;
    const decimalTransfer = await request(baseUrl, `/shops/${shopId}/inventory-operations/transfer`, {
      method: "POST", token, headers: { "Idempotency-Key": transferKey },
      body: {
        sourceBalanceId: decimalBalance.id,
        expectedVersion: decimalAdjustment.balance.version,
        targetLocationId: quarantineLocation.location.id,
        quantity: "0.25",
        reason: "Move measured stock for inspection",
      },
    });
    assert.equal(decimalTransfer.sourceBalance.onHand, "0.75");
    assert.equal(decimalTransfer.targetBalance.onHand, "0.25");
    const duplicateDecimalTransfer = await request(baseUrl, `/shops/${shopId}/inventory-operations/transfer`, {
      method: "POST", token, headers: { "Idempotency-Key": transferKey },
      body: {
        sourceBalanceId: decimalBalance.id,
        expectedVersion: decimalAdjustment.balance.version,
        targetLocationId: quarantineLocation.location.id,
        quantity: "0.25",
        reason: "Move measured stock for inspection",
      },
    });
    assert.equal(duplicateDecimalTransfer.duplicate, true);
    const decimalOrder = await request(baseUrl, `/shops/${shopId}/orders`, {
      method: "POST",
      token,
      body: {
        fulfillmentStatus: "reserved",
        source: "In-store",
        items: [{
          productId: decimalProduct.product.id,
          unitId: kilogram.unit.id,
          quantity: 0.25,
          unitPrice: 3000,
        }],
      },
    });
    assert.equal(decimalOrder.order.items[0].baseQuantity, "0.25");
    await request(baseUrl, `/shops/${shopId}/orders/${decimalOrder.order.id}/status`, {
      method: "PATCH",
      token,
      body: { fulfillmentStatus: "completed" },
    });
    const decimalAfterSale = await request(
      baseUrl,
      `/shops/${shopId}/inventory-balances?search=${encodeURIComponent(decimalProduct.product.name)}`,
      { token },
    );
    const decimalMainAfterSale = decimalAfterSale.balances.find(
      (balance: Json) => balance.locationId === locations.locations[0].id,
    );
    assert.equal(decimalMainAfterSale.onHand, "0.5");
    const decimalReturn = await request(
      baseUrl,
      `/shops/${shopId}/orders/${decimalOrder.order.id}/product-returns`,
      {
        method: "POST",
        token,
        headers: { "Idempotency-Key": `decimal-return-${stamp}` },
        body: {
          items: [{
            orderItemId: decimalOrder.order.items[0].id,
            quantity: 0.1,
            condition: "SELLABLE",
            reason: "Measured customer return",
          }],
        },
      },
    );
    assert.equal(decimalReturn.returns[0].quantity, "0.1");

    const inventoryResult = await request(baseUrl, `/shops/${shopId}/inventory`, {
      method: "POST",
      token,
      body: {
        productId,
        quantity: 5,
        unitCost: 900,
        deliveryCost: 1200,
        deliveryMethod: "Cash",
        note: "API smoke stock",
      },
    });
    const batchId = inventoryResult.inventoryBatch.id;
    await assert.rejects(
      request(baseUrl, `/shops/${shopId}/inventory/${batchId}`, { method: "DELETE", token }),
      /cannot be deleted/i,
    );

    const expenses = await request(baseUrl, `/shops/${shopId}/expenses`, { token });
    assert.ok(expenses.expenses.some((expense: Json) => expense.category === "Stock Delivery" && expense.method === "Cash" && expense.amount === 1200));

    const orderResult = await request(baseUrl, `/shops/${shopId}/orders`, {
      method: "POST",
      token,
      body: {
        customer: { name: "API Customer", phone: "091234567" },
        fulfillmentStatus: "reserved",
        source: "Online",
        items: [{ productId, quantity: 2, unitPrice: 2000 }],
      },
    });
    const orderId = orderResult.order.id;

    const inventoryAfterOrder = await request(baseUrl, `/shops/${shopId}/inventory`, { token });
    const batchAfterOrder = inventoryAfterOrder.inventory.find((batch: Json) => batch.id === batchId);
    assert.equal(batchAfterOrder.reservedQuantity, 2);

    const advancedPayment = await request(baseUrl, `/shops/${shopId}/orders/${orderId}/payments`, {
      method: "POST",
      token,
      body: { method: "Cash", scope: "advanced-payment", amount: 1000 },
    });
    assert.equal(advancedPayment.payment.scope, "advanced-payment");
    assert.equal(advancedPayment.order.paymentStatus, "unpaid");

    const finalPayment = await request(baseUrl, `/shops/${shopId}/orders/${orderId}/payments`, {
      method: "POST",
      token,
      body: { method: "Cash" },
    });
    assert.equal(finalPayment.order.paymentStatus, "paid");

    const refund = await request(baseUrl, `/shops/${shopId}/orders/${orderId}/refunds`, {
      method: "POST",
      token,
      body: { method: "Cash", note: "API smoke return" },
    });
    assert.equal(refund.order.paymentStatus, "refunded");

    const inventoryAfterRefund = await request(baseUrl, `/shops/${shopId}/inventory`, { token });
    const batchAfterRefund = inventoryAfterRefund.inventory.find((batch: Json) => batch.id === batchId);
    // A financial refund must not silently mutate physical inventory. Product
    // returns are confirmed through the explicit product-return workflow.
    assert.equal(batchAfterRefund.reservedQuantity, 2);
    await request(baseUrl, `/shops/${shopId}/orders/${orderId}/status`, {
      method: "PATCH", token, body: { fulfillmentStatus: "completed" },
    });
    const returnKey = `api-customer-return-${stamp}`;
    const productReturn = await request(baseUrl, `/shops/${shopId}/orders/${orderId}/product-returns`, {
      method: "POST", token, headers: { "Idempotency-Key": returnKey },
      body: { items: [{ orderItemId: orderResult.order.items[0].id, quantity: 1, condition: "SELLABLE", reason: "Physical item returned" }] },
    });
    assert.equal(productReturn.duplicate, false);
    const duplicateProductReturn = await request(baseUrl, `/shops/${shopId}/orders/${orderId}/product-returns`, {
      method: "POST", token, headers: { "Idempotency-Key": returnKey },
      body: { items: [{ orderItemId: orderResult.order.items[0].id, quantity: 1, condition: "SELLABLE", reason: "Physical item returned" }] },
    });
    assert.equal(duplicateProductReturn.duplicate, true);
    const inventoryAfterProductReturn = await request(baseUrl, `/shops/${shopId}/inventory`, { token });
    assert.equal(inventoryAfterProductReturn.inventory.find((batch: Json) => batch.id === batchId).reservedQuantity, 1);

    const serialProduct = await prisma.product.create({
      data: {
        shopId, name: `API Serial Device ${stamp}`, sku: `SERIAL-${stamp}`,
        price: 500000, cost: 400000, trackingMode: "SERIAL", quantityPrecision: 0,
      },
    });
    const serialLocation = await prisma.inventoryLocation.findFirstOrThrow({
      where: { shopId, name: "Main" },
    });
    await prisma.inventoryBatch.create({
      data: { shopId, productId: serialProduct.id, quantity: 1, reservedQuantity: 0, unitCost: 400000 },
    });
    await prisma.inventoryBalance.create({
      data: {
        shopId,
        productId: serialProduct.id,
        locationId: serialLocation.id,
        onHand: 1,
        reserved: 0,
      },
    });
    const trackedSerial = await prisma.inventorySerial.create({
      data: {
        shopId, productId: serialProduct.id, locationId: serialLocation.id,
        serial: `SN-${stamp}`, imei: `IMEI-${stamp}`,
      },
    });
    const serialOrder = await request(baseUrl, `/shops/${shopId}/orders`, {
      method: "POST", token,
      body: {
        fulfillmentStatus: "reserved",
        items: [{ productId: serialProduct.id, quantity: 1, unitPrice: 500000, serialIds: [trackedSerial.id] }],
      },
    });
    assert.equal((await prisma.inventorySerial.findUniqueOrThrow({ where: { id: trackedSerial.id } })).status, "RESERVED");
    await request(baseUrl, `/shops/${shopId}/orders/${serialOrder.order.id}/status`, {
      method: "PATCH", token, body: { fulfillmentStatus: "completed" },
    });
    assert.equal((await prisma.inventorySerial.findUniqueOrThrow({ where: { id: trackedSerial.id } })).status, "SOLD");
    await prisma.shop.update({ where: { id: shopId }, data: { templateKey: "ELECTRONICS" } });
    await prisma.releaseFeature.upsert({
      where: { key: "inventory.warranty" },
      update: { enabled: true },
      create: { key: "inventory.warranty", enabled: true, public: false },
    });
    await prisma.releaseFeature.upsert({
      where: { key: "inventory.serials" },
      update: { enabled: true },
      create: { key: "inventory.serials", enabled: true, public: false },
    });
    const warrantyResult = await request(baseUrl, `/shops/${shopId}/warranties`, {
      method: "POST", token,
      body: {
        serialId: trackedSerial.id, orderId: serialOrder.order.id,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        notes: "API warranty",
      },
    });
    const claimedWarranty = await request(baseUrl, `/shops/${shopId}/warranties/${warrantyResult.warranty.id}/status`, {
      method: "PATCH", token, body: { status: "CLAIMED", notes: "Customer reported device fault" },
    });
    assert.equal(claimedWarranty.warranty.status, "CLAIMED");
    const resolvedWarranty = await request(baseUrl, `/shops/${shopId}/warranties/${warrantyResult.warranty.id}/status`, {
      method: "PATCH", token, body: { status: "RESOLVED", notes: "Claim resolved without changing stock state" },
    });
    assert.equal(resolvedWarranty.warranty.status, "RESOLVED");
    assert.equal((await prisma.inventorySerial.findUniqueOrThrow({ where: { id: trackedSerial.id } })).status, "SOLD");
    await assert.rejects(
      request(baseUrl, `/shops/${shopId}/orders/${serialOrder.order.id}/product-returns`, {
        method: "POST", token, headers: { "Idempotency-Key": `serial-return-invalid-${stamp}` },
        body: {
          items: [{
            orderItemId: serialOrder.order.items[0].id, quantity: 1,
            condition: "SELLABLE", reason: "Missing exact serial",
          }],
        },
      }),
      /requires the exact sold serial/i,
    );
    await request(baseUrl, `/shops/${shopId}/orders/${serialOrder.order.id}/product-returns`, {
      method: "POST", token, headers: { "Idempotency-Key": `serial-return-${stamp}` },
      body: {
        items: [{
          orderItemId: serialOrder.order.items[0].id, quantity: 1,
          condition: "SELLABLE", reason: "Device returned after inspection", serialIds: [trackedSerial.id],
        }],
      },
    });
    assert.equal((await prisma.inventorySerial.findUniqueOrThrow({ where: { id: trackedSerial.id } })).status, "RETURNED");
    const serialDispositionKey = `serial-disposition-${stamp}`;
    const disposition = await request(baseUrl, `/shops/${shopId}/serials/${trackedSerial.id}/disposition`, {
      method: "POST", token, headers: { "Idempotency-Key": serialDispositionKey },
      body: { disposition: "RESTOCK", reason: "Passed post-return hardware inspection" },
    });
    assert.equal(disposition.serial.status, "IN_STOCK");
    const duplicateDisposition = await request(baseUrl, `/shops/${shopId}/serials/${trackedSerial.id}/disposition`, {
      method: "POST", token, headers: { "Idempotency-Key": serialDispositionKey },
      body: { disposition: "RESTOCK", reason: "Passed post-return hardware inspection" },
    });
    assert.equal(duplicateDisposition.duplicate, true);

    const lotProduct = await prisma.product.create({
      data: {
        shopId, name: `API Lot Product ${stamp}`, sku: `LOT-${stamp}`,
        price: 3000, cost: 1500, trackingMode: "LOT",
      },
    });
    const earlyBatch = await prisma.inventoryBatch.create({
      data: { shopId, productId: lotProduct.id, quantity: 5, unitCost: 1400, receivedAt: new Date(Date.now() - 86400000) },
    });
    const laterBatch = await prisma.inventoryBatch.create({
      data: { shopId, productId: lotProduct.id, quantity: 5, unitCost: 1600, receivedAt: new Date() },
    });
    await prisma.inventoryBalance.create({
      data: {
        shopId,
        productId: lotProduct.id,
        locationId: serialLocation.id,
        onHand: 10,
        reserved: 0,
      },
    });
    const earlyLot = await prisma.inventoryLot.create({
      data: {
        shopId, productId: lotProduct.id, locationId: serialLocation.id,
        inventoryBatchId: earlyBatch.id, lotNumber: `LOT-EARLY-${stamp}`,
        expiresAt: new Date(Date.now() + 10 * 86400000), quantity: 5, unitCost: 1400,
      },
    });
    const laterLot = await prisma.inventoryLot.create({
      data: {
        shopId, productId: lotProduct.id, locationId: serialLocation.id,
        inventoryBatchId: laterBatch.id, lotNumber: `LOT-LATER-${stamp}`,
        expiresAt: new Date(Date.now() + 20 * 86400000), quantity: 5, unitCost: 1600,
      },
    });
    const fefoOrder = await request(baseUrl, `/shops/${shopId}/orders`, {
      method: "POST", token,
      body: { fulfillmentStatus: "reserved", items: [{ productId: lotProduct.id, quantity: 1, unitPrice: 3000 }] },
    });
    assert.equal(fefoOrder.order.items[0].allocations[0].inventoryBatchId, earlyBatch.id);
    const overrideOrder = await request(baseUrl, `/shops/${shopId}/orders`, {
      method: "POST", token,
      body: {
        fulfillmentStatus: "reserved",
        items: [{
          productId: lotProduct.id, quantity: 1, unitPrice: 3000,
          lotId: laterLot.id, lotOverrideReason: "Customer requested a later-expiry lot",
        }],
      },
    });
    assert.equal(overrideOrder.order.items[0].allocations[0].inventoryBatchId, laterBatch.id);
    assert.ok(await prisma.auditLog.findFirst({
      where: { shopId, action: "inventory.lot_override", entityId: overrideOrder.order.items[0].id },
    }));
    await assert.rejects(
      request(baseUrl, `/shops/${shopId}/orders`, {
        method: "POST", token,
        body: {
          fulfillmentStatus: "reserved",
          items: [{ productId: lotProduct.id, quantity: 1, unitPrice: 3000, lotId: earlyLot.id }],
        },
      }),
      /reason is required/i,
    );

    const cancelOrderResult = await request(baseUrl, `/shops/${shopId}/orders`, {
      method: "POST",
      token,
      body: {
        customer: { name: "Cancel Customer", phone: "099999999" },
        fulfillmentStatus: "reserved",
        source: "Online",
        items: [{ productId, quantity: 1, unitPrice: 2000 }],
      },
    });
    const cancelOrderId = cancelOrderResult.order.id;
    const cancelled = await request(baseUrl, `/shops/${shopId}/orders/${cancelOrderId}/cancel`, {
      method: "POST",
      token,
      body: { reason: "API smoke cancel" },
    });
    assert.equal(cancelled.order.fulfillmentStatus, "cancelled");
    await request(baseUrl, `/shops/${shopId}/orders/${cancelOrderId}`, { method: "DELETE", token });

    const dashboard = await request(baseUrl, `/shops/${shopId}/dashboard`, { token });
    assert.ok(dashboard.summary);

    const supplierResult = await request(baseUrl, `/shops/${shopId}/suppliers`, {
      method: "POST", token, body: { name: `API Supplier ${stamp}` },
    });
    const decimalPurchase = await request(baseUrl, `/shops/${shopId}/purchases`, {
      method: "POST",
      token,
      body: {
        supplierId: supplierResult.supplier.id,
        items: [{
          productId: decimalProduct.product.id,
          unitId: kilogram.unit.id,
          quantity: 0.5,
          unitCost: 1500,
        }],
      },
    });
    assert.equal(decimalPurchase.purchase.items[0].baseQuantity, "0.5");
    await request(baseUrl, `/shops/${shopId}/purchases/${decimalPurchase.purchase.id}/send`, {
      method: "POST",
      token,
      body: {},
    });
    const decimalPurchaseReceipt = await request(
      baseUrl,
      `/shops/${shopId}/purchases/${decimalPurchase.purchase.id}/receive`,
      {
        method: "POST",
        token,
        headers: { "Idempotency-Key": `decimal-purchase-receipt-${stamp}` },
        body: {
          note: "Measured purchase receipt",
          items: [{ purchaseItemId: decimalPurchase.purchase.items[0].id, quantity: 0.375 }],
        },
      },
    );
    assert.equal(decimalPurchaseReceipt.purchase.receipts[0].baseQuantity, "0.375");
    assert.equal(decimalPurchaseReceipt.purchase.items[0].receivedBaseQuantity, "0.375");
    const decimalPurchaseReturn = await request(
      baseUrl,
      `/shops/${shopId}/purchases/${decimalPurchase.purchase.id}/returns`,
      {
        method: "POST",
        token,
        body: {
          purchaseReceiptId: decimalPurchaseReceipt.purchase.receipts[0].id,
          quantity: 0.125,
          reason: "Measured supplier return",
        },
      },
    );
    assert.equal(decimalPurchaseReturn.purchase.returns[0].baseQuantity, "0.125");
    const purchaseResult = await request(baseUrl, `/shops/${shopId}/purchases`, {
      method: "POST", token,
      body: { supplierId: supplierResult.supplier.id, items: [{ productId, quantity: 4, unitCost: 900 }] },
    });
    const purchaseId = purchaseResult.purchase.id;
    await request(baseUrl, `/shops/${shopId}/purchases/${purchaseId}/send`, { method: "POST", token, body: {} });
    const receiptIdempotencyKey = `api-receipt-${stamp}`;
    const received = await request(baseUrl, `/shops/${shopId}/purchases/${purchaseId}/receive`, {
      method: "POST", token,
      headers: { "Idempotency-Key": receiptIdempotencyKey },
      body: { note: "API receipt", items: [{ purchaseItemId: purchaseResult.purchase.items[0].id, quantity: 2 }] },
    });
    assert.equal(received.purchase.status, "partially_received");
    const duplicateReceipt = await request(baseUrl, `/shops/${shopId}/purchases/${purchaseId}/receive`, {
      method: "POST", token,
      headers: { "Idempotency-Key": receiptIdempotencyKey },
      body: { note: "API receipt", items: [{ purchaseItemId: purchaseResult.purchase.items[0].id, quantity: 2 }] },
    });
    assert.equal(duplicateReceipt.duplicate, true);
    assert.equal(duplicateReceipt.purchase.receipts.length, received.purchase.receipts.length);
    const payment = await request(baseUrl, `/shops/${shopId}/purchases/${purchaseId}/payments`, {
      method: "POST", token, body: { amount: 900, method: "Cash", reference: "API-PAY", notes: "Integration test" },
    });
    assert.equal(payment.purchase.paidAmount, 900);
    const reversed = await request(baseUrl, `/shops/${shopId}/purchases/${purchaseId}/payments/${payment.purchase.payments[0].id}/reverse`, {
      method: "POST", token, body: { reason: "Integration test reversal" },
    });
    assert.equal(reversed.purchase.paidAmount, 0);
    const returned = await request(baseUrl, `/shops/${shopId}/purchases/${purchaseId}/returns`, {
      method: "POST", token,
      body: { purchaseReceiptId: received.purchase.receipts[0].id, quantity: 1, reason: "Damaged test unit" },
    });
    assert.equal(returned.purchase.returns.length, 1);
    const archivedSupplier = await request(baseUrl, `/shops/${shopId}/suppliers`, {
      method: "POST", token, body: { name: `Archive Supplier ${stamp}` },
    });
    const archiveResult = await request(baseUrl, `/shops/${shopId}/suppliers/${archivedSupplier.supplier.id}`, {
      method: "DELETE", token,
    });
    assert.equal(archiveResult.archived, true);
    assert.equal(archiveResult.supplier.isActive, false);
    const purchaseAudits = await prisma.auditLog.findMany({ where: { shopId, entityId: purchaseId } });
    for (const action of ["purchase.create", "purchase.send", "purchase.receive", "purchase.payment", "purchase.payment.reverse", "purchase.return"]) {
      assert.ok(purchaseAudits.some((entry) => entry.action === action), `Missing audit action ${action}`);
    }

    const restaurantOwner = await request(baseUrl, "/auth/register", {
      method: "POST",
      body: {
        name: "Restaurant Lifecycle Owner",
        shopName: `Restaurant Lifecycle Shop ${stamp}`,
        email: `restaurant-lifecycle-${stamp}@example.local`,
        password: "Password123!",
      },
    });
    const restaurantToken = restaurantOwner.token;
    const restaurantShopId = restaurantOwner.shop.id;
    await prisma.shop.update({
      where: { id: restaurantShopId },
      data: { templateKey: "ONLINE_RESTAURANT", ledgerEnabled: true },
    });
    for (const key of ["restaurant.recipes", "restaurant.modifiers"]) {
      await prisma.releaseFeature.upsert({
        where: { key },
        update: { enabled: true },
        create: { key, enabled: true, public: false },
      });
    }
    const restaurantLocation = await prisma.inventoryLocation.findFirstOrThrow({
      where: { shopId: restaurantShopId, name: "Main" },
    });
    await prisma.unitOfMeasure.upsert({
      where: { shopId_name: { shopId: restaurantShopId, name: "Piece" } },
      update: {},
      create: { shopId: restaurantShopId, name: "Piece", symbol: "pc", precision: 0 },
    });
    const ingredient = await prisma.product.create({
      data: {
        shopId: restaurantShopId, name: `Restaurant Ingredient ${stamp}`,
        sku: `RESTAURANT-INGREDIENT-${stamp}`, price: 0, cost: 500,
      },
    });
    const menuItem = await prisma.product.create({
      data: {
        shopId: restaurantShopId, name: `Restaurant Menu Item ${stamp}`,
        sku: `RESTAURANT-MENU-${stamp}`, price: 5000, cost: 1000,
        recipe: {
          create: {
            yieldQuantity: "1",
            components: { create: [{ ingredientProductId: ingredient.id, quantity: "2" }] },
            modifierGroups: {
              create: [{
                name: "Extras", minSelect: 0, maxSelect: 1,
                options: {
                  create: [{
                    name: "Extra ingredient", priceDelta: 500,
                    ingredientDelta: [{ productId: ingredient.id, quantity: 1 }],
                  }],
                },
              }],
            },
          },
        },
      },
    });
    const restaurantModifier = await prisma.modifierOption.findFirstOrThrow({
      where: { group: { recipe: { productId: menuItem.id } } },
    });
    await prisma.inventoryBalance.create({
      data: {
        shopId: restaurantShopId, productId: ingredient.id,
        locationId: restaurantLocation.id, onHand: "10", reserved: "0",
      },
    });
    const restaurantOrder = await request(baseUrl, `/shops/${restaurantShopId}/orders`, {
      method: "POST", token: restaurantToken,
      body: {
        fulfillmentStatus: "new", source: "Delivery",
        items: [{
          productId: menuItem.id, quantity: 1, unitPrice: 5000,
          modifierOptionIds: [restaurantModifier.id],
        }],
      },
    });
    assert.equal(restaurantOrder.order.total, 5500);
    await assert.rejects(
      request(baseUrl, `/shops/${restaurantShopId}/orders/${restaurantOrder.order.id}/status`, {
        method: "PATCH", token: restaurantToken, body: { fulfillmentStatus: "ready" },
      }),
      /invalid order transition/i,
    );
    await request(baseUrl, `/shops/${restaurantShopId}/orders/${restaurantOrder.order.id}/status`, {
      method: "PATCH", token: restaurantToken, body: { fulfillmentStatus: "confirmed" },
    });
    let ingredientBalance = await prisma.inventoryBalance.findFirstOrThrow({
      where: { shopId: restaurantShopId, productId: ingredient.id, locationId: restaurantLocation.id },
    });
    assert.equal(Number(ingredientBalance.onHand), 10);
    assert.equal(Number(ingredientBalance.reserved), 3);
    for (const fulfillmentStatus of ["preparing", "ready", "completed"]) {
      await request(baseUrl, `/shops/${restaurantShopId}/orders/${restaurantOrder.order.id}/status`, {
        method: "PATCH", token: restaurantToken,
        headers: { "Idempotency-Key": `restaurant-${fulfillmentStatus}-${stamp}` },
        body: { fulfillmentStatus },
      });
    }
    ingredientBalance = await prisma.inventoryBalance.findFirstOrThrow({
      where: { shopId: restaurantShopId, productId: ingredient.id, locationId: restaurantLocation.id },
    });
    assert.equal(Number(ingredientBalance.onHand), 7);
    assert.equal(Number(ingredientBalance.reserved), 0);
    assert.equal(await prisma.inventoryMovement.count({
      where: {
        shopId: restaurantShopId, productId: ingredient.id,
        type: "RECIPE_CONSUMPTION", direction: "OUT",
      },
    }), 2);

    const barcodeValue = `GM-API-${stamp}`;
    const barcodeCreated = await request(baseUrl, `/shops/${shopId}/barcodes`, {
      method: "POST", token,
      body: { value: barcodeValue, productId, kind: "MANUFACTURER", symbology: "CODE128", isPrimary: true },
    });
    assert.equal(barcodeCreated.barcode.normalizedValue, barcodeValue);
    const barcodeLookup = await request(baseUrl, `/shops/${shopId}/barcode-lookup/${barcodeValue}`, { token });
    assert.equal(barcodeLookup.known, true);
    assert.equal(barcodeLookup.barcode.productId, productId);
    await assert.rejects(request(baseUrl, `/shops/${shopId}/barcodes`, {
      method: "POST", token,
      body: { value: barcodeValue.toLowerCase(), productId, kind: "SUPPLIER" },
    }), /already linked/i);
    const labelResponse = await fetch(`${baseUrl}/shops/${shopId}/barcodes/${barcodeCreated.barcode.id}/label.svg`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(labelResponse.status, 200);
    assert.match(await labelResponse.text(), /<svg/i);

    await request(baseUrl, `/shops/${shopId}/prices`, {
      method: "POST", token,
      body: { productId, unitPrice: 8000, effectiveFrom: new Date(Date.now() - 60_000).toISOString(), reason: "Pricing API integration test" },
    });
    const promotionStart = new Date(Date.now() - 30_000);
    const promotionEnd = new Date(Date.now() + 3_600_000);
    const promotion = await request(baseUrl, `/shops/${shopId}/promotions`, {
      method: "POST", token,
      body: { name: `API promotion ${stamp}`, productId, type: "PERCENTAGE", value: 25, startsAt: promotionStart.toISOString(), endsAt: promotionEnd.toISOString(), state: "SCHEDULED", reason: "Pricing precedence test" },
    });
    assert.equal(promotion.promotion.productId, productId);
    const resolvedPrice = await request(baseUrl, `/shops/${shopId}/pricing/resolve`, {
      method: "POST", token, body: { productId, quantity: 1, channel: "ALL", manualDiscount: 100 },
    });
    assert.equal(resolvedPrice.pricing.regularUnitPrice, 8000);
    assert.equal(resolvedPrice.pricing.promotionDiscount, 2000);
    assert.equal(resolvedPrice.pricing.manualDiscount, 100);
    assert.equal(resolvedPrice.pricing.finalUnitPrice, 5900);
    const priceHistory = await request(baseUrl, `/shops/${shopId}/audit-logs?entity=PriceEntry`, { token });
    const promotionHistory = await request(baseUrl, `/shops/${shopId}/audit-logs?entity=Promotion`, { token });
    assert.ok(priceHistory.totalCount >= 1);
    assert.ok(promotionHistory.totalCount >= 1);
    await assert.rejects(request(baseUrl, `/shops/${shopId}/promotions`, {
      method: "POST", token,
      body: { name: `Overlapping API promotion ${stamp}`, productId, type: "PERCENTAGE", value: 10, startsAt: promotionStart.toISOString(), endsAt: promotionEnd.toISOString(), state: "SCHEDULED" },
    }), /overlaps/i);

    const attacker = await request(baseUrl, "/auth/register", {
      method: "POST",
      body: {
        name: "Tenant Isolation Owner",
        shopName: `Tenant Isolation Shop ${stamp}`,
        email: `tenant-isolation-${stamp}@example.local`,
        password: "Password123!",
      },
    });
    const attackerToken = attacker.token;
    const attackerShopId = attacker.shop.id;
    const denied = /failed (403|404)/i;
    await assert.rejects(request(baseUrl, `/shops/${shopId}/products`, { token: attackerToken }), denied);
    await assert.rejects(request(baseUrl, `/shops/${attackerShopId}/products/${productId}`, {
      method: "PATCH", token: attackerToken, body: { name: "Cross-tenant overwrite" },
    }), denied);
    await assert.rejects(request(baseUrl, `/shops/${attackerShopId}/inventory/${batchId}/adjustments`, {
      method: "POST", token: attackerToken, body: { action: "ADD", quantity: 1, reason: "Cross-tenant attempt" },
    }), denied);
    await assert.rejects(request(baseUrl, `/shops/${attackerShopId}/orders/${orderId}`, { token: attackerToken }), denied);
    await assert.rejects(request(baseUrl, `/shops/${attackerShopId}/purchases/${purchaseId}/send`, {
      method: "POST", token: attackerToken, body: {},
    }), denied);
    await assert.rejects(request(baseUrl, `/shops/${shopId}/reports/sales`, { token: attackerToken }), denied);
    await assert.rejects(request(baseUrl, `/shops/${shopId}/barcode-lookup/${barcodeValue}`, { token: attackerToken }), denied);

    const wrongExisting = await rawRequest(baseUrl, "/auth/login", {
      method: "POST",
      body: { email: registered.user.email, password: "DefinitelyWrong123!" },
    });
    const wrongMissing = await rawRequest(baseUrl, "/auth/login", {
      method: "POST",
      body: { email: `missing-${stamp}@example.local`, password: "DefinitelyWrong123!" },
    });
    assert.equal(wrongExisting.status, 401);
    assert.equal(wrongMissing.status, 401);
    assert.equal(wrongExisting.data.message, wrongMissing.data.message);
    let rateLimitedStatus = 0;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      rateLimitedStatus = (await rawRequest(baseUrl, "/auth/login", {
        method: "POST",
        body: { email: `bruteforce-${stamp}@example.local`, password: "DefinitelyWrong123!" },
      })).status;
      if (rateLimitedStatus === 429) break;
    }
    assert.equal(rateLimitedStatus, 429);

    console.log(JSON.stringify({
      ok: true,
      checked: [
        "register/login/me",
        "shop profile read/update and audit history",
        "zh-CN settings validation and category product count",
        "expired and modified JWT rejection",
        "generic authentication errors and brute-force rate limiting",
        "product create",
        "paginated variant query",
        "decimal-safe quantity conversion and balance",
        "fractional sale, customer return, purchase receipt and supplier return snapshots",
        "inventory create",
        "destructive inventory deletion rejected",
        "delivery cost expense",
        "order stock reservation",
        "advanced payment",
        "remaining payment",
        "financial refund preserves physical stock",
        "idempotent physical product return restores stock separately",
        "exact serial sale and return state transitions",
        "returned serial inspection before restocking",
        "warranty lifecycle remains separate from serial stock status",
        "FEFO allocation and audited manual lot override",
        "cancel/delete unpaid order",
        "dashboard",
    "purchase receive/payment/reversal/return audit trail",
    "supplier soft archive preserves financial history",
    "idempotent purchase receiving",
        "restaurant lifecycle reservation and atomic ingredient consumption",
        "barcode lookup, uniqueness, printable SVG and cross-shop isolation",
        "regular price, promotion and manual-discount precedence",
        "promotion overlap rejection",
    "cross-owner product/inventory/order/purchase/report IDOR rejection",
      ],
    }, null, 2));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
