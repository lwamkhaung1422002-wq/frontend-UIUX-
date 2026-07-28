import { Router } from "express";
import { z } from "zod";

import { writeAuditLog } from "../lib/audit-log.js";
import { assertCapability } from "../lib/store-capabilities.js";
import { prisma } from "../lib/prisma.js";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import { getAuthUser, requireAuth } from "../middleware/auth.middleware.js";

export const advancedCapabilitiesRouter = Router();
advancedCapabilitiesRouter.use(requireAuth);

const params = z.object({ shopId: z.string().min(1) });
const recipeInput = z.object({
  productId: z.string().min(1),
  yieldQuantity: z.coerce.number().positive().default(1),
  components: z.array(z.object({
    ingredientProductId: z.string().min(1),
    quantity: z.coerce.number().positive(),
  })).min(1),
  modifierGroups: z.array(z.object({
    name: z.string().trim().min(1),
    required: z.boolean().default(false),
    minSelect: z.coerce.number().int().nonnegative().default(0),
    maxSelect: z.coerce.number().int().positive().default(1),
    options: z.array(z.object({
      name: z.string().trim().min(1),
      priceDelta: z.coerce.number().int().default(0),
      ingredientDelta: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number(),
      })).default([]),
    })).default([]),
  })).default([]),
});
const priceGroupInput = z.object({ name: z.string().trim().min(1) });
const priceTierInput = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  productUnitId: z.string().optional(),
  priceGroupId: z.string().optional(),
  minimumQuantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().int().nonnegative(),
});
const warrantyInput = z.object({
  serialId: z.string().min(1),
  orderId: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  notes: z.string().trim().optional(),
});
const warrantyStatusInput = z.object({
  status: z.enum(["CLAIMED", "RESOLVED", "VOID"]),
  notes: z.string().trim().min(1),
});

async function authorize(userId: string, shopId: string, capability: string) {
  await assertUserOwnsShop(userId, shopId);
  await assertCapability(prisma, shopId, capability);
}

advancedCapabilitiesRouter.get("/:shopId/recipes", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params);
    await authorize(auth.id, shopId, "restaurant.recipes");
    const recipes = await prisma.recipe.findMany({
      where: { product: { shopId } },
      include: { product: true, components: { include: { ingredient: true } }, modifierGroups: { include: { options: true } } },
      orderBy: { product: { name: "asc" } },
    });
    response.json({ recipes });
  } catch (error) { next(error); }
});

advancedCapabilitiesRouter.put("/:shopId/recipes/:productId", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params);
    await authorize(auth.id, shopId, "restaurant.recipes");
    const input = recipeInput.parse({ ...request.body, productId: request.params.productId });
    const recipe = await prisma.$transaction(async (tx) => {
      const modifierIngredientIds = input.modifierGroups.flatMap((group) =>
        group.options.flatMap((option) => option.ingredientDelta.map((delta) => delta.productId)),
      );
      const referencedProductIds = [
        input.productId,
        ...input.components.map((item) => item.ingredientProductId),
        ...modifierIngredientIds,
      ];
      const products = await tx.product.findMany({
        where: { shopId, id: { in: referencedProductIds } },
        select: { id: true },
      });
      if (products.length !== new Set(referencedProductIds).size) {
        throw Object.assign(new Error("Every recipe, modifier, and ingredient product must belong to this store."), { name: "BadRequestError" });
      }
      const existing = await tx.recipe.findUnique({ where: { productId: input.productId } });
      if (existing) await tx.recipe.delete({ where: { id: existing.id } });
      const created = await tx.recipe.create({
        data: {
          productId: input.productId, yieldQuantity: String(input.yieldQuantity),
          components: { create: input.components.map((item) => ({ ingredientProductId: item.ingredientProductId, quantity: String(item.quantity) })) },
          modifierGroups: {
            create: input.modifierGroups.map((group) => ({
              name: group.name, required: group.required, minSelect: group.minSelect, maxSelect: group.maxSelect,
              options: { create: group.options.map((option) => ({ name: option.name, priceDelta: option.priceDelta, ingredientDelta: option.ingredientDelta })) },
            })),
          },
        },
        include: { components: true, modifierGroups: { include: { options: true } } },
      });
      await writeAuditLog(tx, { shopId, actorId: auth.id, action: "recipe.replace", entity: "Recipe", entityId: created.id });
      return created;
    });
    response.json({ recipe });
  } catch (error) { next(error); }
});

advancedCapabilitiesRouter.get("/:shopId/price-groups", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params);
    await authorize(auth.id, shopId, "wholesale.tierPricing");
    response.json({ priceGroups: await prisma.customerPriceGroup.findMany({ where: { shopId }, include: { tiers: true }, orderBy: { name: "asc" } }) });
  } catch (error) { next(error); }
});

advancedCapabilitiesRouter.post("/:shopId/price-groups", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params); const input = priceGroupInput.parse(request.body);
    await authorize(auth.id, shopId, "wholesale.tierPricing");
    response.status(201).json({ priceGroup: await prisma.customerPriceGroup.create({ data: { shopId, name: input.name } }) });
  } catch (error) { next(error); }
});

advancedCapabilitiesRouter.post("/:shopId/price-tiers", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params); const input = priceTierInput.parse(request.body);
    await authorize(auth.id, shopId, "wholesale.tierPricing");
    const product = await prisma.product.findFirst({ where: { id: input.productId, shopId } });
    if (!product) throw Object.assign(new Error("Product not found."), { name: "NotFoundError" });
    if (input.variantId && !await prisma.productVariant.findFirst({ where: { id: input.variantId, product: { shopId }, productId: input.productId } })) {
      throw Object.assign(new Error("Variant not found."), { name: "NotFoundError" });
    }
    if (input.productUnitId && !await prisma.productUnit.findFirst({ where: { id: input.productUnitId, product: { shopId }, productId: input.productId } })) {
      throw Object.assign(new Error("Product unit not found."), { name: "NotFoundError" });
    }
    if (input.priceGroupId && !await prisma.customerPriceGroup.findFirst({ where: { id: input.priceGroupId, shopId } })) {
      throw Object.assign(new Error("Customer price group not found."), { name: "NotFoundError" });
    }
    const tier = await prisma.priceTier.create({ data: {
      productId: input.productId, minimumQuantity: String(input.minimumQuantity), unitPrice: input.unitPrice,
      ...(input.variantId ? { variantId: input.variantId } : {}),
      ...(input.productUnitId ? { productUnitId: input.productUnitId } : {}),
      ...(input.priceGroupId ? { priceGroupId: input.priceGroupId } : {}),
    } });
    response.status(201).json({ tier });
  } catch (error) { next(error); }
});

advancedCapabilitiesRouter.post("/:shopId/warranties", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params); const input = warrantyInput.parse(request.body);
    await authorize(auth.id, shopId, "inventory.warranty");
    if (input.endsAt <= input.startsAt) throw Object.assign(new Error("Warranty end date must be after its start date."), { name: "BadRequestError" });
    const serial = await prisma.inventorySerial.findFirst({ where: { id: input.serialId, shopId } });
    if (!serial) throw Object.assign(new Error("Serial not found."), { name: "NotFoundError" });
    if (input.orderId) {
      const soldOnOrder = await prisma.orderItemSerialAllocation.findFirst({
        where: { serialId: serial.id, orderItem: { order: { id: input.orderId, shopId } } },
      });
      if (!soldOnOrder) throw Object.assign(new Error("Serial was not sold on the selected order."), { name: "BadRequestError" });
    }
    const warranty = await prisma.$transaction(async (tx) => {
      const created = await tx.warrantyRecord.create({ data: {
        shopId, serialId: serial.id, startsAt: input.startsAt, endsAt: input.endsAt,
        ...(input.orderId ? { orderId: input.orderId } : {}), ...(input.notes ? { notes: input.notes } : {}),
      } });
      await writeAuditLog(tx, {
        shopId, actorId: auth.id, action: "warranty.create",
        entity: "WarrantyRecord", entityId: created.id,
        metadata: { serialId: serial.id, orderId: input.orderId ?? null },
      });
      return created;
    });
    response.status(201).json({ warranty });
  } catch (error) { next(error); }
});

advancedCapabilitiesRouter.get("/:shopId/warranties", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params);
    await authorize(auth.id, shopId, "inventory.warranty");
    const warranties = await prisma.warrantyRecord.findMany({
      where: { shopId },
      include: { serial: { include: { product: true, variant: true } } },
      orderBy: { createdAt: "desc" },
    });
    response.json({ warranties });
  } catch (error) { next(error); }
});

advancedCapabilitiesRouter.patch("/:shopId/warranties/:warrantyId/status", async (request, response, next) => {
  try {
    const auth = getAuthUser(request); const { shopId } = params.parse(request.params);
    const warrantyId = z.string().min(1).parse(request.params.warrantyId);
    const input = warrantyStatusInput.parse(request.body);
    await authorize(auth.id, shopId, "inventory.warranty");
    const allowed: Record<string, string[]> = {
      ACTIVE: ["CLAIMED", "VOID"],
      CLAIMED: ["RESOLVED", "VOID"],
      RESOLVED: [],
      VOID: [],
    };
    const warranty = await prisma.$transaction(async (tx) => {
      const existing = await tx.warrantyRecord.findFirst({ where: { id: warrantyId, shopId } });
      if (!existing) throw Object.assign(new Error("Warranty not found."), { name: "NotFoundError" });
      if (!allowed[existing.status]?.includes(input.status)) {
        throw Object.assign(
          new Error(`Invalid warranty transition: ${existing.status} → ${input.status}.`),
          { name: "BadRequestError" },
        );
      }
      const updated = await tx.warrantyRecord.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          notes: existing.notes ? `${existing.notes}\n${input.notes}` : input.notes,
        },
      });
      await writeAuditLog(tx, {
        shopId, actorId: auth.id, action: "warranty.status",
        entity: "WarrantyRecord", entityId: updated.id,
        metadata: { from: existing.status, to: input.status, notes: input.notes, serialId: existing.serialId },
      });
      return updated;
    });
    response.json({ warranty });
  } catch (error) { next(error); }
});
