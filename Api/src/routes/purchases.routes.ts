import { Router } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { z } from "zod";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import { writeAuditLog } from "../lib/audit-log.js";
import { recordInventoryMovement } from "../lib/inventory-domain.js";
import { prisma } from "../lib/prisma.js";
import { getAuthUser, requireAuth } from "../middleware/auth.middleware.js";

export const purchasesRouter = Router();
purchasesRouter.use(requireAuth);

const params = z.object({ shopId: z.string().min(1) });
const money = z.coerce.number().int().nonnegative();
const supplierInput = z.object({
  name: z.string().trim().min(1),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.email().trim().toLowerCase().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});
const itemInput = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
  quantity: z.coerce.number().positive(),
  unitCost: money,
});
const purchaseInput = z.object({
  supplierId: z.string().min(1),
  orderedAt: z.coerce.date().optional(),
  expectedAt: z.coerce.date().optional(),
  deliveryCost: money.optional(),
  notes: z.string().trim().optional(),
  items: z.array(itemInput).min(1),
});
const receiptInput = z.object({
  receivedAt: z.coerce.date().optional(),
  note: z.string().trim().optional(),
  items: z.array(z.object({
    purchaseItemId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    locationId: z.string().min(1).optional(),
    lot: z.object({
      lotNumber: z.string().trim().min(1),
      expiresAt: z.coerce.date().optional(),
    }).optional(),
    serials: z.array(z.object({
      serial: z.string().trim().min(1),
      imei: z.string().trim().min(1).optional(),
    })).optional(),
  })).min(1),
});
const paymentInput = z.object({
  amount: z.coerce.number().int().positive(),
  method: z.string().trim().min(1),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paidAt: z.coerce.date().optional(),
});
const returnInput = z.object({
  purchaseReceiptId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  reason: z.string().trim().min(1),
  returnedAt: z.coerce.date().optional(),
});
const reversalInput = z.object({
  reason: z.string().trim().min(1),
});
const listQuery = z.object({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  sort: z.enum(["createdAt", "orderedAt", "purchaseNumber", "total"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().refine((value) => [25, 50, 100].includes(value)).default(25),
});

function badRequest(message: string) {
  const error = new Error(message);
  error.name = "BadRequestError";
  return error;
}
function notFound(message: string) {
  const error = new Error(message);
  error.name = "NotFoundError";
  return error;
}
const QUANTITY_SCALE = 3;
function quantityDecimal(value: string | number | Prisma.Decimal | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(QUANTITY_SCALE, Prisma.Decimal.ROUND_HALF_UP);
}
function compatibilityQuantity(value: Prisma.Decimal) {
  return value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}
function moneyFromDecimal(value: Prisma.Decimal) {
  return value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}
function purchaseItemBaseQuantity(line: {
  quantity: number;
  baseQuantity?: unknown;
}) {
  return quantityDecimal(line.baseQuantity == null ? line.quantity : String(line.baseQuantity));
}
function receivedItemBaseQuantity(line: {
  receivedQuantity: number;
  receivedBaseQuantity?: unknown;
}) {
  return quantityDecimal(
    line.receivedBaseQuantity == null ? line.receivedQuantity : String(line.receivedBaseQuantity),
  );
}
const purchaseInclude = {
  supplier: true,
  items: {
    include: {
      product: { include: { units: { include: { unit: true } } } },
      variant: true,
    },
  },
  receipts: { include: { inventoryBatch: true } },
  payments: true,
  returns: true,
} as const;

purchasesRouter.get("/:shopId/suppliers", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    await assertUserOwnsShop(auth.id, shopId);
    const query = listQuery.parse(request.query);
    const where = {
      shopId,
      ...(query.status ? { isActive: query.status === "active" } : {}),
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}),
    };
    const [suppliers, total] = await prisma.$transaction([prisma.supplier.findMany({
      where,
      include: { purchases: { select: { total: true, paidAmount: true, status: true } } },
      orderBy: { name: query.direction },
      skip: (query.page - 1) * query.pageSize, take: query.pageSize,
    }), prisma.supplier.count({ where })]);
    response.json({
      suppliers,
      totalCount: total,
      pagination: { page: query.page, pageSize: query.pageSize, total },
    });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/suppliers", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = supplierInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const supplier = await prisma.supplier.create({ data: {
      shopId, name: input.name,
      ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    } });
    response.status(201).json({ supplier });
  } catch (error) { next(error); }
});

purchasesRouter.patch("/:shopId/suppliers/:supplierId", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = supplierInput.partial().parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const existing = await prisma.supplier.findFirst({ where: { id: request.params.supplierId, shopId } });
    if (!existing) throw notFound("Supplier not found.");
    const supplier = await prisma.supplier.update({ where: { id: existing.id }, data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    } });
    response.json({ supplier });
  } catch (error) { next(error); }
});

purchasesRouter.get("/:shopId/purchases", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    await assertUserOwnsShop(auth.id, shopId);
    const query = listQuery.parse(request.query);
    const where = {
      shopId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { OR: [
        { purchaseNumber: { contains: query.search, mode: "insensitive" as const } },
        { supplier: { name: { contains: query.search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const [purchases, total] = await prisma.$transaction([
      prisma.purchase.findMany({ where, include: purchaseInclude, orderBy: { [query.sort]: query.direction }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.purchase.count({ where }),
    ]);
    response.json({
      purchases,
      totalCount: total,
      pagination: { page: query.page, pageSize: query.pageSize, total },
    });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/purchases", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = purchaseInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, shopId, isActive: true } });
    if (!supplier) throw notFound("Active supplier not found.");
    const products = await prisma.product.findMany({
      where: { shopId, id: { in: input.items.map((item) => item.productId) } },
      include: { units: { include: { unit: true } }, variants: { select: { id: true } } },
    });
    if (products.length !== new Set(input.items.map((item) => item.productId)).size) throw badRequest("A purchase product does not belong to this shop.");
    const preparedItems = input.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId)!;
      if (item.variantId && !product.variants.some((variant) => variant.id === item.variantId)) {
        throw badRequest(`The selected variant for ${product.name} does not belong to this product.`);
      }
      const productUnit = item.unitId
        ? product.units.find((candidate) => candidate.unitId === item.unitId && candidate.canPurchase)
        : product.units.find((candidate) => candidate.isBase && candidate.canPurchase);
      if (item.unitId && !productUnit) throw badRequest(`The selected purchase unit is unavailable for ${product.name}.`);
      const rawEnteredQuantity = new Prisma.Decimal(item.quantity);
      const enteredQuantity = quantityDecimal(rawEnteredQuantity);
      const precision = productUnit?.unit.precision ?? 0;
      if (rawEnteredQuantity.decimalPlaces() > precision) {
        throw badRequest(`${product.name} allows at most ${precision} decimal places for this unit.`);
      }
      const conversionFactor = new Prisma.Decimal(productUnit?.conversionFactor ?? 1).toDecimalPlaces(
        6,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      const baseQuantity = enteredQuantity.times(conversionFactor).toDecimalPlaces(
        QUANTITY_SCALE,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      if (product.trackingMode === "SERIAL" && !baseQuantity.isInteger()) {
        throw badRequest(`Serial-tracked ${product.name} requires an integer base quantity.`);
      }
      const lineTotal = moneyFromDecimal(enteredQuantity.times(item.unitCost));
      return { ...item, product, productUnit, enteredQuantity, conversionFactor, baseQuantity, lineTotal };
    });
    const subtotal = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const sequence = await prisma.purchase.count({ where: { shopId } });
    const purchaseNumber = `PO-${String(sequence + 1).padStart(5, "0")}`;
    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          shopId, supplierId: input.supplierId, purchaseNumber,
          ...(input.orderedAt !== undefined ? { orderedAt: input.orderedAt } : {}),
          ...(input.expectedAt !== undefined ? { expectedAt: input.expectedAt } : {}),
          deliveryCost: input.deliveryCost ?? 0, total: subtotal + (input.deliveryCost ?? 0),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          items: { create: preparedItems.map((item) => ({
            productId: item.productId, ...(item.variantId !== undefined ? { variantId: item.variantId } : {}),
            productName: item.product.name,
            quantity: compatibilityQuantity(item.baseQuantity),
            unitCost: item.unitCost,
            lineTotal: item.lineTotal,
            ...(item.productUnit ? { unitId: item.productUnit.unitId } : {}),
            enteredQuantity: item.enteredQuantity,
            conversionFactor: item.conversionFactor,
            baseQuantity: item.baseQuantity,
          })) },
        },
        include: purchaseInclude,
      });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "purchase.create", entity: "Purchase", entityId: created.id });
      return created;
    });
    response.status(201).json({ purchase });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/purchases/:purchaseId/send", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    await assertUserOwnsShop(auth.id, shopId);
    const existing = await prisma.purchase.findFirst({ where: { id: request.params.purchaseId, shopId } });
    if (!existing) throw notFound("Purchase not found.");
    if (existing.status !== "draft") throw badRequest("Only draft purchases can be sent.");
    const purchase = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({ where: { id: existing.id }, data: { status: "ordered" }, include: purchaseInclude });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "purchase.send", entity: "Purchase", entityId: existing.id });
      return updated;
    });
    response.json({ purchase });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/purchases/:purchaseId/receive", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = receiptInput.parse(request.body);
    const idempotencyKey = request.header("Idempotency-Key");
    await assertUserOwnsShop(auth.id, shopId);
    if (idempotencyKey) {
      const firstItem = input.items[0]!;
      const duplicate = await prisma.purchaseReceipt.findFirst({
        where: {
          purchaseId: request.params.purchaseId,
          purchaseItemId: firstItem.purchaseItemId,
          idempotencyKey,
        },
      });
      if (duplicate) {
        const existingPurchase = await prisma.purchase.findFirst({
          where: { id: request.params.purchaseId, shopId },
          include: purchaseInclude,
        });
        if (!existingPurchase) throw notFound("Purchase not found.");
        return response.json({ purchase: existingPurchase, duplicate: true });
      }
    }
    const purchase = await prisma.purchase.findFirst({
      where: { id: request.params.purchaseId, shopId },
      include: {
        items: {
          include: { product: { include: { units: { include: { unit: true } } } } },
        },
      },
    });
    if (!purchase) throw notFound("Purchase not found.");
    if (!["ordered", "partially_received"].includes(purchase.status)) throw badRequest("Purchase is not open for receipt.");
    const receiptLines = new Map(input.items.map((item) => [item.purchaseItemId, item]));
    const quantities = new Map<string, Prisma.Decimal>();
    let defaultLocation = await prisma.inventoryLocation.findFirst({ where: { shopId, type: "SELLABLE", isActive: true } });
    if (!defaultLocation) {
      defaultLocation = await prisma.inventoryLocation.create({
        data: { shopId, name: "Main stock", type: "SELLABLE" },
      });
    }
    for (const line of purchase.items) {
      const receiptLine = receiptLines.get(line.id);
      const rawEnteredQuantity = new Prisma.Decimal(receiptLine?.quantity ?? 0);
      const enteredQuantity = quantityDecimal(rawEnteredQuantity);
      const precision = line.product.units.find((entry) => entry.unitId === line.unitId)?.unit.precision ?? 0;
      if (rawEnteredQuantity.decimalPlaces() > precision) {
        throw badRequest(`${line.productName} allows at most ${precision} decimal places for this unit.`);
      }
      const conversionFactor = new Prisma.Decimal(line.conversionFactor ?? 1);
      const quantity = enteredQuantity.times(conversionFactor).toDecimalPlaces(
        QUANTITY_SCALE,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      quantities.set(line.id, quantity);
      const remaining = purchaseItemBaseQuantity(line).minus(receivedItemBaseQuantity(line));
      if (quantity.greaterThan(remaining)) throw badRequest(`Received quantity exceeds remaining quantity for ${line.productName}.`);
      if (!quantity.greaterThan(0)) continue;
      const locationId = receiptLine?.locationId || defaultLocation?.id;
      if (!locationId) throw badRequest(`A receiving location is required for ${line.productName}.`);
      const location = await prisma.inventoryLocation.findFirst({ where: { id: locationId, shopId, isActive: true } });
      if (!location) throw badRequest(`Receiving location is invalid for ${line.productName}.`);
      const capabilities = (line.product.capabilities || {}) as Record<string, boolean>;
      const usesLots = line.product.trackingMode === "LOT";
      const requiresExpiry = capabilities["inventory.expiry"] === true;
      if (usesLots && !receiptLine?.lot) throw badRequest(`Lot details are required for ${line.productName}.`);
      if (requiresExpiry && !receiptLine?.lot?.expiresAt) throw badRequest(`Expiry date is required for ${line.productName}.`);
      if (!usesLots && receiptLine?.lot) throw badRequest(`Lot details are not supported for ${line.productName}.`);
      if (receiptLine?.lot?.expiresAt && receiptLine.lot.expiresAt <= new Date() && location.type !== "QUARANTINE") {
        throw badRequest(`Expired ${line.productName} can only be received into quarantine.`);
      }
      if (location.type === "QUARANTINE" && !input.note) {
        throw badRequest("A reason note is required for quarantine receiving.");
      }
      if (line.product.trackingMode === "SERIAL" && receiptLine?.serials?.length !== quantity.toNumber()) {
        throw badRequest(`Exact serial details are required for every received ${line.productName}.`);
      }
      if (line.product.trackingMode !== "SERIAL" && receiptLine?.serials?.length) {
        throw badRequest(`Serial details are not supported for ${line.productName}.`);
      }
    }
    const updated = await prisma.$transaction(async (tx) => {
      for (const line of purchase.items) {
        const quantity = quantities.get(line.id) ?? quantityDecimal(0);
        if (!quantity.greaterThan(0)) continue;
        const receiptLine = receiptLines.get(line.id)!;
        const locationId = receiptLine.locationId || defaultLocation!.id;
        const conversionFactor = new Prisma.Decimal(line.conversionFactor ?? 1);
        const baseUnitCost = moneyFromDecimal(new Prisma.Decimal(line.unitCost).dividedBy(conversionFactor));
        const batch = await tx.inventoryBatch.create({ data: {
          shopId, productId: line.productId, ...(line.variantId ? { variantId: line.variantId } : {}),
          quantity: compatibilityQuantity(quantity),
          baseQuantity: quantity,
          unitCost: baseUnitCost,
          ...(input.receivedAt ? { receivedAt: input.receivedAt } : {}),
          note: `Received from ${purchase.purchaseNumber}`,
        } });
        await tx.purchaseItem.update({
          where: { id: line.id },
          data: {
            receivedQuantity: { increment: compatibilityQuantity(quantity) },
            receivedBaseQuantity: { increment: quantity },
          },
        });
        const receipt = await tx.purchaseReceipt.create({ data: {
          purchaseId: purchase.id,
          purchaseItemId: line.id,
          inventoryBatchId: batch.id,
          quantity: compatibilityQuantity(quantity),
          baseQuantity: quantity,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          ...(input.receivedAt ? { receivedAt: input.receivedAt } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        } });
        let lotId: string | undefined;
        if (receiptLine.lot) {
          const lot = await tx.inventoryLot.create({ data: {
            shopId, productId: line.productId, ...(line.variantId ? { variantId: line.variantId } : {}),
            locationId, inventoryBatchId: batch.id, lotNumber: receiptLine.lot.lotNumber,
            quantity, unitCost: baseUnitCost,
            ...(receiptLine.lot.expiresAt ? { expiresAt: receiptLine.lot.expiresAt } : {}),
          } });
          lotId = lot.id;
        }
        for (const serial of receiptLine.serials || []) {
          await tx.inventorySerial.create({ data: {
            shopId, productId: line.productId, ...(line.variantId ? { variantId: line.variantId } : {}),
            locationId, serial: serial.serial, ...(serial.imei ? { imei: serial.imei } : {}),
          } });
        }
        const movement = await recordInventoryMovement(tx, {
          shopId, productId: line.productId, variantId: line.variantId,
          inventoryBatchId: batch.id, type: "PURCHASE_RECEIPT", direction: "IN",
          locationId,
          quantity: quantity.toString(), unitCost: baseUnitCost, sourceType: "PurchaseReceipt", sourceId: receipt.id,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}:${line.id}` : `purchase.receive:${receipt.id}`,
          ...(input.note ? { reason: input.note } : {}),
          ...(input.receivedAt ? { occurredAt: input.receivedAt } : {}),
        });
        if (lotId && movement) await tx.inventoryMovement.update({ where: { id: movement.id }, data: { lotId } });
      }
      const fullyReceived = purchase.items.every((line) =>
        receivedItemBaseQuantity(line)
          .plus(quantities.get(line.id) ?? 0)
          .greaterThanOrEqualTo(purchaseItemBaseQuantity(line)),
      );
      const status = fullyReceived ? "received" : "partially_received";
      await writeAuditLog(tx, {
        shopId, actorId: auth.id, action: "purchase.receive", entity: "Purchase", entityId: purchase.id,
        metadata: { items: input.items, note: input.note, receivedAt: input.receivedAt },
      });
      return tx.purchase.update({ where: { id: purchase.id }, data: { status, ...(status === "received" ? { receivedAt: input.receivedAt ?? new Date() } : {}) }, include: purchaseInclude });
    });
    response.json({ purchase: updated, duplicate: false });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/purchases/:purchaseId/payments", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = paymentInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const purchase = await prisma.purchase.findFirst({ where: { id: request.params.purchaseId, shopId } });
    if (!purchase) throw notFound("Purchase not found.");
    if (purchase.paidAmount + input.amount > purchase.total) throw badRequest("Payment exceeds outstanding payable.");
    const updated = await prisma.$transaction(async (tx) => {
      await tx.purchasePayment.create({ data: {
        purchaseId: purchase.id, amount: input.amount, method: input.method,
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
      } });
      const paidAmount = purchase.paidAmount + input.amount;
      await writeAuditLog(tx, {
        shopId, actorId: auth.id, action: "purchase.payment", entity: "Purchase", entityId: purchase.id,
        metadata: { amount: input.amount, method: input.method, reference: input.reference, notes: input.notes, paidAt: input.paidAt },
      });
      return tx.purchase.update({ where: { id: purchase.id }, data: { paidAmount, paymentStatus: paidAmount === purchase.total ? "paid" : "partial" }, include: purchaseInclude });
    });
    response.status(201).json({ purchase: updated });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/purchases/:purchaseId/payments/:paymentId/reverse", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = reversalInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const purchase = await prisma.purchase.findFirst({ where: { id: request.params.purchaseId, shopId } });
    if (!purchase) throw notFound("Purchase not found.");
    const payment = await prisma.purchasePayment.findFirst({ where: { id: request.params.paymentId, purchaseId: purchase.id } });
    if (!payment) throw notFound("Purchase payment not found.");
    if (payment.reversedAt) throw badRequest("Purchase payment has already been reversed.");
    const updated = await prisma.$transaction(async (tx) => {
      await tx.purchasePayment.update({
        where: { id: payment.id },
        data: { reversedAt: new Date(), reversalReason: input.reason },
      });
      const paidAmount = Math.max(0, purchase.paidAmount - payment.amount);
      await writeAuditLog(tx, {
        shopId, actorId: auth.id, action: "purchase.payment.reverse", entity: "Purchase", entityId: purchase.id,
        metadata: { paymentId: payment.id, amount: payment.amount, reason: input.reason },
      });
      return tx.purchase.update({
        where: { id: purchase.id },
        data: { paidAmount, paymentStatus: paidAmount === 0 ? "unpaid" : "partial" },
        include: purchaseInclude,
      });
    });
    response.status(201).json({ purchase: updated });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/purchases/:purchaseId/returns", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = returnInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const purchase = await prisma.purchase.findFirst({ where: { id: request.params.purchaseId, shopId } });
    if (!purchase) throw notFound("Purchase not found.");
    const receipt = await prisma.purchaseReceipt.findFirst({
      where: { id: input.purchaseReceiptId, purchaseId: purchase.id },
      include: { purchaseItem: true, inventoryBatch: true },
    });
    if (!receipt) throw notFound("Purchase receipt not found.");
    const returnQuantity = quantityDecimal(input.quantity);
    const alreadyReturned = await prisma.purchaseReturn.aggregate({
      where: { inventoryBatchId: receipt.inventoryBatchId },
      _sum: { baseQuantity: true },
    });
    const receiptQuantity = quantityDecimal(receipt.baseQuantity ?? receipt.quantity);
    if (returnQuantity.greaterThan(receiptQuantity.minus(alreadyReturned._sum.baseQuantity ?? 0))) {
      throw badRequest("Return quantity exceeds the received quantity.");
    }
    const batchQuantity = quantityDecimal(receipt.inventoryBatch.baseQuantity ?? receipt.inventoryBatch.quantity);
    const remainingBatchQuantity = batchQuantity.minus(returnQuantity);
    if (remainingBatchQuantity.lessThan(receipt.inventoryBatch.reservedQuantity)) {
      throw badRequest("Returned stock is reserved by customer orders.");
    }
    const baseUnitCost = receipt.inventoryBatch.unitCost;
    const amount = moneyFromDecimal(returnQuantity.times(baseUnitCost));
    if (purchase.total - amount < purchase.paidAmount) throw badRequest("Refund or void supplier payments before returning these items.");
    const updated = await prisma.$transaction(async (tx) => {
      await tx.inventoryBatch.update({
        where: { id: receipt.inventoryBatchId },
        data: { quantity: compatibilityQuantity(remainingBatchQuantity), baseQuantity: remainingBatchQuantity },
      });
      const remainingReceivedQuantity = receivedItemBaseQuantity(receipt.purchaseItem).minus(returnQuantity);
      await tx.purchaseItem.update({
        where: { id: receipt.purchaseItemId },
        data: {
          receivedQuantity: compatibilityQuantity(remainingReceivedQuantity),
          receivedBaseQuantity: remainingReceivedQuantity,
        },
      });
      await tx.purchaseReturn.create({ data: {
        purchaseId: purchase.id, purchaseItemId: receipt.purchaseItemId, inventoryBatchId: receipt.inventoryBatchId,
        quantity: compatibilityQuantity(returnQuantity), baseQuantity: returnQuantity, amount, reason: input.reason,
        ...(input.returnedAt ? { returnedAt: input.returnedAt } : {}),
      } });
      await recordInventoryMovement(tx, {
        shopId, productId: receipt.purchaseItem.productId, variantId: receipt.purchaseItem.variantId,
        inventoryBatchId: receipt.inventoryBatchId, type: "SUPPLIER_RETURN", direction: "OUT",
        quantity: returnQuantity.toString(), unitCost: baseUnitCost,
        sourceType: "PurchaseReturn", sourceId: purchase.id,
        idempotencyKey: String(request.header("Idempotency-Key") || `purchase.return:${purchase.id}:${receipt.id}:${input.quantity}`),
        reason: input.reason,
        ...(input.returnedAt ? { occurredAt: input.returnedAt } : {}),
      });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "purchase.return", entity: "Purchase", entityId: purchase.id, metadata: { quantity: returnQuantity.toString(), amount, reason: input.reason } });
      return tx.purchase.update({ where: { id: purchase.id }, data: { total: { decrement: amount }, status: "partially_returned" }, include: purchaseInclude });
    });
    response.status(201).json({ purchase: updated });
  } catch (error) { next(error); }
});
