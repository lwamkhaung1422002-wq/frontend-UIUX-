import { randomUUID } from "node:crypto";
import bwipjs from "bwip-js";
import { Router } from "express";
import { z } from "zod";

import { Prisma } from "../generated/prisma/client.js";
import { writeAuditLog } from "../lib/audit-log.js";
import {
  assertPricingTarget,
  effectivePromotionState,
  ensureDefaultPriceBook,
  priceTargetKey,
  promotionTargetKey,
  resolvePrice,
} from "../lib/pricing-domain.js";
import { prisma } from "../lib/prisma.js";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import { getAuthUser, requireAuth } from "../middleware/auth.middleware.js";

export const pricingRouter = Router();
pricingRouter.use(requireAuth);

const shopParams = z.object({ shopId: z.string().min(1) });
const idParams = shopParams.extend({ id: z.string().min(1) });
const barcodeKinds = ["SUPPLIER", "MANUFACTURER", "INTERNAL", "PACK", "CARTON"] as const;
const barcodeInput = z.object({
  value: z.string().trim().min(3).max(128),
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  productUnitId: z.string().optional().nullable(),
  symbology: z.enum(["CODE128", "EAN13", "UPCA", "EAN8"]).default("CODE128"),
  kind: z.enum(barcodeKinds).default("INTERNAL"),
  packageQuantity: z.coerce.number().positive().optional().nullable(),
  isInternal: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
});
const priceTargetInput = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  productUnitId: z.string().optional().nullable(),
});
const priceChangeInput = priceTargetInput.extend({
  unitPrice: z.coerce.number().int().nonnegative(),
  effectiveFrom: z.coerce.date().default(() => new Date()),
  effectiveTo: z.coerce.date().optional().nullable(),
  reason: z.string().trim().min(3).max(500),
  expectedVersion: z.coerce.number().int().positive().optional(),
});
const bulkPriceChangeInput = z.object({
  scope: z.enum(["ALL", "CATEGORY", "PRODUCT"]),
  categoryId: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  marginPercent: z.coerce.number().min(-100).max(1000),
  reason: z.string().trim().min(3).max(500),
}).superRefine((value, context) => {
  if (value.scope === "CATEGORY" && !value.categoryId) context.addIssue({ code: "custom", message: "Category is required." });
  if (value.scope === "PRODUCT" && !value.productId) context.addIssue({ code: "custom", message: "Product is required." });
});
const promotionInput = priceTargetInput.extend({
  name: z.string().trim().min(2).max(160),
  priceGroupId: z.string().optional().nullable(),
  channel: z.string().trim().min(1).max(30).default("ALL"),
  type: z.enum(["FIXED_PRICE", "PERCENTAGE"]),
  value: z.coerce.number().positive(),
  minimumQuantity: z.coerce.number().positive().default(1),
  discountBase: z.enum(["REGULAR_PRICE", "RESOLVED_TIER_PRICE"]).default("REGULAR_PRICE"),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  timeZone: z.string().trim().min(1).default("Asia/Yangon"),
  state: z.enum(["DRAFT", "SCHEDULED"]).default("DRAFT"),
  priority: z.coerce.number().int().min(-100).max(100).default(0),
  note: z.string().trim().max(1000).optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
});
const promotionUpdateInput = promotionInput.partial().extend({
  expectedVersion: z.coerce.number().int().positive(),
  state: z.enum(["DRAFT", "SCHEDULED", "PAUSED", "CANCELLED"]).optional(),
});
const resolveInput = priceTargetInput.extend({
  priceGroupId: z.string().optional().nullable(),
  quantity: z.coerce.number().positive().default(1),
  channel: z.string().trim().min(1).default("ALL"),
  manualDiscount: z.coerce.number().int().nonnegative().default(0),
  at: z.coerce.date().optional(),
});

function badRequest(message: string) { return Object.assign(new Error(message), { name: "BadRequestError" }); }
function conflict(message: string) { return Object.assign(new Error(message), { name: "ConflictError" }); }
function notFound(message: string) { return Object.assign(new Error(message), { name: "NotFoundError" }); }
function normalizeBarcode(value: string) { return value.trim().replace(/\s+/g, "").toUpperCase(); }
function pagination(query: unknown) {
  const parsed = z.object({
    search: z.string().trim().optional(), status: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().refine((value) => [25, 50, 100].includes(value)).default(25),
  }).parse(query);
  return { ...parsed, skip: (parsed.page - 1) * parsed.pageSize };
}

pricingRouter.get("/:shopId/barcode-lookup/:value", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params);
    await assertUserOwnsShop(auth.id, shopId);
    const normalizedValue = normalizeBarcode(z.string().min(1).parse(request.params.value));
    const barcode = await prisma.productBarcode.findFirst({
      where: { shopId, normalizedValue, status: "ACTIVE" },
      include: { product: true, variant: true, productUnit: { include: { unit: true } } },
    });
    if (!barcode) { response.json({ known: false, normalizedValue }); return; }
    const pricing = await prisma.$transaction((tx) => resolvePrice(tx, shopId, {
      productId: barcode.productId, variantId: barcode.variantId, productUnitId: barcode.productUnitId,
      quantity: new Prisma.Decimal(barcode.packageQuantity ?? 1), channel: String(request.query.channel ?? "ALL"),
    }));
    response.json({ known: true, barcode, pricing });
  } catch (error) { next(error); }
});

pricingRouter.get("/:shopId/barcodes", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const query = pagination(request.query);
    await assertUserOwnsShop(auth.id, shopId);
    const where = {
      shopId,
      ...(query.status ? { status: query.status.toUpperCase() } : {}),
      ...(query.search ? { OR: [
        { value: { contains: query.search, mode: "insensitive" as const } },
        { product: { name: { contains: query.search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const [barcodes, totalCount] = await Promise.all([
      prisma.productBarcode.findMany({ where, include: { product: true, variant: true, productUnit: { include: { unit: true } } }, orderBy: { createdAt: "desc" }, skip: query.skip, take: query.pageSize }),
      prisma.productBarcode.count({ where }),
    ]);
    response.json({ barcodes, page: query.page, pageSize: query.pageSize, totalCount });
  } catch (error) { next(error); }
});

pricingRouter.post("/:shopId/barcodes", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const input = barcodeInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const barcode = await prisma.$transaction(async (tx) => {
      await assertPricingTarget(tx, shopId, input);
      const normalizedValue = normalizeBarcode(input.value);
      if (await tx.productBarcode.findUnique({ where: { shopId_normalizedValue: { shopId, normalizedValue } } })) throw conflict("Barcode is already linked in this store.");
      if (input.isPrimary) await tx.productBarcode.updateMany({ where: { shopId, productId: input.productId, variantId: input.variantId ?? null, isPrimary: true }, data: { isPrimary: false } });
      const created = await tx.productBarcode.create({ data: {
        shopId, productId: input.productId, value: input.value, normalizedValue, symbology: input.symbology,
        kind: input.kind, isInternal: input.isInternal, isPrimary: input.isPrimary,
        ...(input.variantId ? { variantId: input.variantId } : {}), ...(input.productUnitId ? { productUnitId: input.productUnitId } : {}),
        ...(input.packageQuantity ? { packageQuantity: String(input.packageQuantity) } : {}),
      } });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "barcode.create", entity: "ProductBarcode", entityId: created.id, metadata: { normalizedValue, productId: input.productId } });
      return created;
    });
    response.status(201).json({ barcode });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") next(conflict("Barcode is already linked in this store.")); else next(error);
  }
});

pricingRouter.post("/:shopId/barcodes/internal", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params);
    const target = priceTargetInput.extend({ productUnitId: z.string().optional().nullable(), packageQuantity: z.coerce.number().positive().optional().nullable(), isPrimary: z.boolean().default(true) }).parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const seed = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
    request.body = { ...target, value: `GM-${shopId.slice(-4).toUpperCase()}-${seed}`, kind: "INTERNAL", symbology: "CODE128", isInternal: true };
    const input = barcodeInput.parse(request.body);
    const barcode = await prisma.$transaction(async (tx) => {
      await assertPricingTarget(tx, shopId, input);
      const normalizedValue = normalizeBarcode(input.value);
      if (input.isPrimary) await tx.productBarcode.updateMany({ where: { shopId, productId: input.productId, variantId: input.variantId ?? null, isPrimary: true }, data: { isPrimary: false } });
      const created = await tx.productBarcode.create({ data: { shopId, productId: input.productId, value: input.value, normalizedValue, kind: "INTERNAL", symbology: "CODE128", isInternal: true, isPrimary: input.isPrimary, ...(input.variantId ? { variantId: input.variantId } : {}), ...(input.productUnitId ? { productUnitId: input.productUnitId } : {}), ...(input.packageQuantity ? { packageQuantity: String(input.packageQuantity) } : {}) } });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "barcode.internal.create", entity: "ProductBarcode", entityId: created.id });
      return created;
    });
    response.status(201).json({ barcode });
  } catch (error) { next(error); }
});

pricingRouter.patch("/:shopId/barcodes/:id/retire", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId, id } = idParams.parse(request.params);
    const input = z.object({ expectedVersion: z.coerce.number().int().positive(), reason: z.string().trim().min(3) }).parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const barcode = await prisma.$transaction(async (tx) => {
      const existing = await tx.productBarcode.findFirst({ where: { id, shopId } });
      if (!existing) throw notFound("Barcode not found.");
      if (existing.version !== input.expectedVersion) throw conflict("Barcode was changed by another request.");
      const updated = await tx.productBarcode.update({ where: { id }, data: { status: "RETIRED", retiredAt: new Date(), isPrimary: false, version: { increment: 1 } } });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "barcode.retire", entity: "ProductBarcode", entityId: id, metadata: { reason: input.reason } });
      return updated;
    });
    response.json({ barcode });
  } catch (error) { next(error); }
});

pricingRouter.get("/:shopId/barcodes/:id/label.svg", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId, id } = idParams.parse(request.params); await assertUserOwnsShop(auth.id, shopId);
    const barcode = await prisma.productBarcode.findFirst({ where: { id, shopId, status: "ACTIVE" }, include: { product: true, variant: true, productUnit: { include: { unit: true } } } });
    if (!barcode) throw notFound("Barcode not found.");
    const bcid = barcode.symbology === "EAN13" ? "ean13" : barcode.symbology === "UPCA" ? "upca" : barcode.symbology === "EAN8" ? "ean8" : "code128";
    const svg = bwipjs.toSVG({ bcid, text: barcode.value, scale: 2, height: 12, includetext: true, textxalign: "center" });
    response.type("image/svg+xml").set("Cache-Control", "private, max-age=300").send(svg);
  } catch (error) { next(error); }
});

pricingRouter.get("/:shopId/prices", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const query = pagination(request.query); await assertUserOwnsShop(auth.id, shopId);
    const where = { shopId, ...(query.status ? { status: query.status.toUpperCase() } : {}), ...(query.search ? { product: { name: { contains: query.search, mode: "insensitive" as const } } } : {}) };
    const [entries, totalCount] = await Promise.all([
      prisma.priceEntry.findMany({ where, include: { product: true, variant: true, productUnit: { include: { unit: true } }, priceBook: true }, orderBy: [{ effectiveFrom: "desc" }], skip: query.skip, take: query.pageSize }),
      prisma.priceEntry.count({ where }),
    ]);
    response.json({ entries, page: query.page, pageSize: query.pageSize, totalCount });
  } catch (error) { next(error); }
});

pricingRouter.post("/:shopId/prices", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const input = priceChangeInput.parse(request.body); await assertUserOwnsShop(auth.id, shopId);
    if (input.effectiveTo && input.effectiveTo <= input.effectiveFrom) throw badRequest("Price end time must be after its start time.");
    const entry = await prisma.$transaction(async (tx) => {
      const target = await assertPricingTarget(tx, shopId, input); const book = await ensureDefaultPriceBook(tx, shopId); const now = new Date();
      const targetKey = priceTargetKey(input.productId, input.variantId, input.productUnitId);
      if (input.effectiveFrom <= now) {
        await tx.priceEntry.updateMany({ where: { shopId, targetKey, status: "ACTIVE", OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.effectiveFrom } }] }, data: { effectiveTo: input.effectiveFrom, status: "EXPIRED" } });
      }
      const created = await tx.priceEntry.create({ data: { shopId, priceBookId: book.id, productId: input.productId, targetKey, unitPrice: input.unitPrice, currencyCode: book.currencyCode, effectiveFrom: input.effectiveFrom, status: input.effectiveFrom <= now ? "ACTIVE" : "SCHEDULED", reason: input.reason, actorId: auth.id, ...(input.effectiveTo !== undefined ? { effectiveTo: input.effectiveTo } : {}), ...(input.variantId ? { variantId: input.variantId } : {}), ...(input.productUnitId ? { productUnitId: input.productUnitId } : {}) } });
      if (input.effectiveFrom <= now && !input.productUnitId) {
        if (target.variant) await tx.productVariant.update({ where: { id: target.variant.id }, data: { price: input.unitPrice } });
        else await tx.product.update({ where: { id: target.product.id }, data: { price: input.unitPrice, version: { increment: 1 } } });
      }
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "price.change", entity: "PriceEntry", entityId: created.id, metadata: { targetKey, unitPrice: input.unitPrice, reason: input.reason } });
      return created;
    });
    response.status(201).json({ entry });
  } catch (error) { next(error); }
});

// One transaction makes overall, category and one-product margin setup durable and auditable.
pricingRouter.post("/:shopId/prices/bulk", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const input = bulkPriceChangeInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const entries = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          shopId, isActive: true,
          ...(input.scope === "CATEGORY" && input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input.scope === "PRODUCT" && input.productId ? { id: input.productId } : {}),
        },
      });
      if (!products.length) throw notFound("No products matched this price setup.");
      const book = await ensureDefaultPriceBook(tx, shopId); const now = new Date(); const result = [];
      for (const product of products) {
        const unitPrice = Math.max(0, Math.round(Number(product.cost ?? 0) * (1 + input.marginPercent / 100)));
        const targetKey = priceTargetKey(product.id, null, null);
        await tx.priceEntry.updateMany({ where: { shopId, targetKey, status: "ACTIVE", OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, data: { effectiveTo: now, status: "EXPIRED" } });
        const entry = await tx.priceEntry.create({ data: { shopId, priceBookId: book.id, productId: product.id, targetKey, unitPrice, currencyCode: book.currencyCode, effectiveFrom: now, status: "ACTIVE", reason: input.reason, actorId: auth.id } });
        await tx.product.update({ where: { id: product.id }, data: { price: unitPrice, version: { increment: 1 } } });
        result.push(entry);
      }
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "price.bulk_change", entity: "PriceEntry", entityId: result[0]!.id, metadata: { scope: input.scope, count: result.length, marginPercent: input.marginPercent, reason: input.reason } });
      return result;
    });
    response.status(201).json({ entries });
  } catch (error) { next(error); }
});

pricingRouter.post("/:shopId/pricing/resolve", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const input = resolveInput.parse(request.body); await assertUserOwnsShop(auth.id, shopId);
    response.json({ pricing: await prisma.$transaction((tx) => resolvePrice(tx, shopId, { ...input, quantity: new Prisma.Decimal(input.quantity) })) });
  } catch (error) { next(error); }
});

pricingRouter.get("/:shopId/promotions", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const query = pagination(request.query); await assertUserOwnsShop(auth.id, shopId);
    const where = { shopId, ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" as const } }, { product: { name: { contains: query.search, mode: "insensitive" as const } } }] } : {}) };
    const [raw, totalCount] = await Promise.all([
      prisma.promotion.findMany({ where, include: { product: true, variant: true, productUnit: { include: { unit: true } }, priceGroup: true }, orderBy: [{ startsAt: "desc" }], skip: query.skip, take: query.pageSize }), prisma.promotion.count({ where }),
    ]);
    const promotions = raw.map((item) => ({ ...item, effectiveState: effectivePromotionState(item) })).filter((item) => !query.status || item.effectiveState === query.status.toUpperCase());
    response.json({ promotions, page: query.page, pageSize: query.pageSize, totalCount });
  } catch (error) { next(error); }
});

pricingRouter.post("/:shopId/promotions", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); const input = promotionInput.parse(request.body); await assertUserOwnsShop(auth.id, shopId);
    if (input.endsAt <= input.startsAt) throw badRequest("Promotion end time must be after its start time.");
    if (input.type === "PERCENTAGE" && input.value > 100) throw badRequest("Percentage promotion cannot exceed 100%.");
    const promotion = await prisma.$transaction(async (tx) => {
      await assertPricingTarget(tx, shopId, input);
      const targetKey = promotionTargetKey(input);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${shopId}:${targetKey}`}))`;
      const overlap = await tx.promotion.findFirst({ where: { shopId, targetKey, state: { in: ["SCHEDULED", "RUNNING"] }, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } } });
      if (overlap && input.state !== "DRAFT") throw conflict("Promotion overlaps another scheduled or running promotion for this target.");
      const created = await tx.promotion.create({ data: { shopId, name: input.name, productId: input.productId, targetKey, channel: input.channel.toUpperCase(), type: input.type, value: String(input.value), minimumQuantity: String(input.minimumQuantity), discountBase: input.discountBase, startsAt: input.startsAt, endsAt: input.endsAt, timeZone: input.timeZone, state: input.state, priority: input.priority, actorId: auth.id, ...(input.note !== undefined ? { note: input.note } : {}), ...(input.reason !== undefined ? { reason: input.reason } : {}), ...(input.variantId ? { variantId: input.variantId } : {}), ...(input.productUnitId ? { productUnitId: input.productUnitId } : {}), ...(input.priceGroupId ? { priceGroupId: input.priceGroupId } : {}) } });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "promotion.create", entity: "Promotion", entityId: created.id, metadata: { targetKey, state: input.state } });
      return created;
    });
    response.status(201).json({ promotion: { ...promotion, effectiveState: effectivePromotionState(promotion) } });
  } catch (error) { next(error); }
});

pricingRouter.patch("/:shopId/promotions/:id", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId, id } = idParams.parse(request.params); const input = promotionUpdateInput.parse(request.body); await assertUserOwnsShop(auth.id, shopId);
    const promotion = await prisma.$transaction(async (tx) => {
      const existing = await tx.promotion.findFirst({ where: { id, shopId } }); if (!existing) throw notFound("Promotion not found.");
      if (existing.version !== input.expectedVersion) throw conflict("Promotion was changed by another request.");
      const merged = {
        ...existing,
        productId: input.productId ?? existing.productId,
        variantId: input.variantId === undefined ? existing.variantId : input.variantId,
        productUnitId: input.productUnitId === undefined ? existing.productUnitId : input.productUnitId,
        priceGroupId: input.priceGroupId === undefined ? existing.priceGroupId : input.priceGroupId,
        channel: input.channel?.toUpperCase() ?? existing.channel,
        type: input.type ?? existing.type,
        value: input.value === undefined ? existing.value : new Prisma.Decimal(input.value),
        startsAt: input.startsAt ?? existing.startsAt,
        endsAt: input.endsAt ?? existing.endsAt,
        state: input.state ?? existing.state,
      };
      if (merged.endsAt <= merged.startsAt) throw badRequest("Promotion end time must be after its start time.");
      if (merged.type === "PERCENTAGE" && Number(merged.value) > 100) throw badRequest("Percentage promotion cannot exceed 100%.");
      await assertPricingTarget(tx, shopId, merged);
      const targetKey = promotionTargetKey(merged);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${shopId}:${targetKey}`}))`;
      if (["SCHEDULED", "RUNNING"].includes(merged.state)) {
        const overlap = await tx.promotion.findFirst({ where: { id: { not: id }, shopId, targetKey, state: { in: ["SCHEDULED", "RUNNING"] }, startsAt: { lt: merged.endsAt }, endsAt: { gt: merged.startsAt } } });
        if (overlap) throw conflict("Promotion overlaps another scheduled or running promotion for this target.");
      }
      const updated = await tx.promotion.update({ where: { id }, data: {
        targetKey, actorId: auth.id, version: { increment: 1 },
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.productId !== undefined ? { productId: input.productId } : {}),
        ...(input.variantId !== undefined ? { variantId: input.variantId } : {}),
        ...(input.productUnitId !== undefined ? { productUnitId: input.productUnitId } : {}),
        ...(input.priceGroupId !== undefined ? { priceGroupId: input.priceGroupId } : {}),
        ...(input.channel !== undefined ? { channel: input.channel.toUpperCase() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.value !== undefined ? { value: String(input.value) } : {}),
        ...(input.minimumQuantity !== undefined ? { minimumQuantity: String(input.minimumQuantity) } : {}),
        ...(input.discountBase !== undefined ? { discountBase: input.discountBase } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
        ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
      } });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: `promotion.${input.state?.toLowerCase() ?? "update"}`, entity: "Promotion", entityId: id, metadata: { previousState: existing.state, nextState: updated.state } });
      return updated;
    });
    response.json({ promotion: { ...promotion, effectiveState: effectivePromotionState(promotion) } });
  } catch (error) { next(error); }
});

pricingRouter.get("/:shopId/pricing/overview", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); await assertUserOwnsShop(auth.id, shopId); const now = new Date();
    const [products, entries, promotions, barcodes, batches] = await Promise.all([
      prisma.product.count({ where: { shopId, isActive: true } }), prisma.priceEntry.count({ where: { shopId } }),
      prisma.promotion.findMany({ where: { shopId } }), prisma.productBarcode.count({ where: { shopId, status: "ACTIVE" } }),
      prisma.inventoryBatch.findMany({ where: { shopId }, select: { productId: true, variantId: true, unitCost: true, receivedAt: true }, orderBy: { receivedAt: "asc" } }),
    ]);
    const runningPromotions = promotions.filter((item) => effectivePromotionState(item, now) === "RUNNING").length;
    response.json({ overview: { products, priceEntries: entries, activeBarcodes: barcodes, runningPromotions, costLayers: batches.length } });
  } catch (error) { next(error); }
});
