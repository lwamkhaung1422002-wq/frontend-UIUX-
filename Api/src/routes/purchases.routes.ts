import { Router } from "express";
import { z } from "zod";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import { writeAuditLog } from "../lib/audit-log.js";
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
  quantity: z.coerce.number().int().positive(),
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
  items: z.array(z.object({ purchaseItemId: z.string().min(1), quantity: z.coerce.number().int().positive() })).min(1),
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
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1),
  returnedAt: z.coerce.date().optional(),
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
const purchaseInclude = {
  supplier: true,
  items: { include: { product: true, variant: true } },
  receipts: true,
  payments: true,
  returns: true,
} as const;

purchasesRouter.get("/:shopId/suppliers", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    await assertUserOwnsShop(auth.id, shopId);
    const suppliers = await prisma.supplier.findMany({
      where: { shopId },
      include: { purchases: { select: { total: true, paidAmount: true, status: true } } },
      orderBy: { name: "asc" },
    });
    response.json({ suppliers });
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
    const purchases = await prisma.purchase.findMany({ where: { shopId }, include: purchaseInclude, orderBy: { createdAt: "desc" } });
    response.json({ purchases });
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
    const products = await prisma.product.findMany({ where: { shopId, id: { in: input.items.map((item) => item.productId) } } });
    if (products.length !== new Set(input.items.map((item) => item.productId)).size) throw badRequest("A purchase product does not belong to this shop.");
    const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
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
          items: { create: input.items.map((item) => ({
            productId: item.productId, ...(item.variantId !== undefined ? { variantId: item.variantId } : {}),
            productName: products.find((product) => product.id === item.productId)?.name ?? "Product",
            quantity: item.quantity, unitCost: item.unitCost, lineTotal: item.quantity * item.unitCost,
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
    const purchase = await prisma.purchase.update({ where: { id: existing.id }, data: { status: "ordered" }, include: purchaseInclude });
    response.json({ purchase });
  } catch (error) { next(error); }
});

purchasesRouter.post("/:shopId/purchases/:purchaseId/receive", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = receiptInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const purchase = await prisma.purchase.findFirst({ where: { id: request.params.purchaseId, shopId }, include: { items: true } });
    if (!purchase) throw notFound("Purchase not found.");
    if (!["ordered", "partially_received"].includes(purchase.status)) throw badRequest("Purchase is not open for receipt.");
    const quantities = new Map(input.items.map((item) => [item.purchaseItemId, item.quantity]));
    for (const line of purchase.items) {
      const quantity = quantities.get(line.id) ?? 0;
      if (quantity > line.quantity - line.receivedQuantity) throw badRequest(`Received quantity exceeds remaining quantity for ${line.productName}.`);
    }
    const updated = await prisma.$transaction(async (tx) => {
      for (const line of purchase.items) {
        const quantity = quantities.get(line.id) ?? 0;
        if (!quantity) continue;
        const batch = await tx.inventoryBatch.create({ data: {
          shopId, productId: line.productId, ...(line.variantId ? { variantId: line.variantId } : {}),
          quantity, unitCost: line.unitCost, ...(input.receivedAt ? { receivedAt: input.receivedAt } : {}),
          note: `Received from ${purchase.purchaseNumber}`,
        } });
        await tx.purchaseItem.update({ where: { id: line.id }, data: { receivedQuantity: { increment: quantity } } });
        await tx.purchaseReceipt.create({ data: { purchaseId: purchase.id, purchaseItemId: line.id, inventoryBatchId: batch.id, quantity, ...(input.receivedAt ? { receivedAt: input.receivedAt } : {}) } });
      }
      const fullyReceived = purchase.items.every((line) =>
        line.receivedQuantity + (quantities.get(line.id) ?? 0) >= line.quantity,
      );
      const status = fullyReceived ? "received" : "partially_received";
      return tx.purchase.update({ where: { id: purchase.id }, data: { status, ...(status === "received" ? { receivedAt: input.receivedAt ?? new Date() } : {}) }, include: purchaseInclude });
    });
    response.json({ purchase: updated });
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
      return tx.purchase.update({ where: { id: purchase.id }, data: { paidAmount, paymentStatus: paidAmount === purchase.total ? "paid" : "partial" }, include: purchaseInclude });
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
    const alreadyReturned = await prisma.purchaseReturn.aggregate({ where: { inventoryBatchId: receipt.inventoryBatchId }, _sum: { quantity: true } });
    if (input.quantity > receipt.quantity - Number(alreadyReturned._sum.quantity || 0)) throw badRequest("Return quantity exceeds the received quantity.");
    if (receipt.inventoryBatch.quantity - input.quantity < receipt.inventoryBatch.reservedQuantity) throw badRequest("Returned stock is reserved by customer orders.");
    const amount = input.quantity * receipt.purchaseItem.unitCost;
    if (purchase.total - amount < purchase.paidAmount) throw badRequest("Refund or void supplier payments before returning these items.");
    const updated = await prisma.$transaction(async (tx) => {
      await tx.inventoryBatch.update({ where: { id: receipt.inventoryBatchId }, data: { quantity: { decrement: input.quantity } } });
      await tx.purchaseItem.update({ where: { id: receipt.purchaseItemId }, data: { receivedQuantity: { decrement: input.quantity } } });
      await tx.purchaseReturn.create({ data: {
        purchaseId: purchase.id, purchaseItemId: receipt.purchaseItemId, inventoryBatchId: receipt.inventoryBatchId,
        quantity: input.quantity, amount, reason: input.reason,
        ...(input.returnedAt ? { returnedAt: input.returnedAt } : {}),
      } });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "purchase.return", entity: "Purchase", entityId: purchase.id, metadata: { quantity: input.quantity, amount, reason: input.reason } });
      return tx.purchase.update({ where: { id: purchase.id }, data: { total: { decrement: amount }, status: "partially_returned" }, include: purchaseInclude });
    });
    response.status(201).json({ purchase: updated });
  } catch (error) { next(error); }
});
