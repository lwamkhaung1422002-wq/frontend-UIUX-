import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import {
  applyTemplateDefaults, effectiveStoreConfiguration, STORE_TEMPLATE_KEYS, STORE_TEMPLATES, type StoreTemplateKey,
} from "../lib/store-capabilities.js";
import { getAuthUser, requireAuth } from "../middleware/auth.middleware.js";
import { reconcileShopInventory } from "../lib/inventory-reconciliation.js";
import { writeAuditLog } from "../lib/audit-log.js";

export const storeConfigRouter = Router();
storeConfigRouter.use(requireAuth);

const params = z.object({ shopId: z.string().min(1) });
const updateInput = z.object({
  templateKey: z.enum(STORE_TEMPLATE_KEYS as [StoreTemplateKey, ...StoreTemplateKey[]]).optional(),
  capabilities: z.record(z.string(), z.boolean()).optional(),
  completeOnboarding: z.boolean().optional(),
});

storeConfigRouter.get("/templates", async (_request, response) => {
  const releaseRows = await prisma.releaseFeature.findMany();
  const publicRelease = new Set(releaseRows.filter((row) => row.enabled && row.public).map((row) => row.key));
  response.json({
    templates: Object.entries(STORE_TEMPLATES).map(([key, value]) => ({
      key, ...value,
      publicCapabilities: value.capabilities.filter((capability) =>
        ["catalog.products", "catalog.variants", "catalog.units", "inventory.basic", "sales.pos", "sales.onlineOrders", "purchases", "finance", "reports"].includes(capability) ||
        publicRelease.has(capability),
      ),
    })),
  });
});

storeConfigRouter.get("/:shopId/configuration", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    await assertUserOwnsShop(auth.id, shopId);
    response.json({ configuration: await effectiveStoreConfiguration(prisma, shopId) });
  } catch (error) { next(error); }
});

storeConfigRouter.patch("/:shopId/inventory-read-mode", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = z.object({ mode: z.enum(["LEGACY", "COMPARE", "LEDGER"]) }).parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId }, select: { ledgerEnabled: true, inventoryReadMode: true } });
    if (input.mode !== "LEGACY" && !shop.ledgerEnabled) {
      throw Object.assign(new Error("Ledger dual-write must be enabled before comparison or cutover."), { name: "ConflictError" });
    }
    const reconciliation = input.mode === "LEDGER"
      ? await reconcileShopInventory(prisma, shopId)
      : { status: "NOT_REQUIRED", unexplainedDifferences: 0, differences: [] };
    if (input.mode === "LEDGER" && reconciliation.unexplainedDifferences > 0) {
      throw Object.assign(new Error("Ledger reads cannot be enabled until reconciliation has zero differences."), { name: "ConflictError" });
    }
    await prisma.$transaction(async (tx) => {
      await tx.shop.update({ where: { id: shopId }, data: { inventoryReadMode: input.mode } });
      await writeAuditLog(tx, {
        shopId, actorId: auth.id, action: "inventory.read_mode",
        entity: "Shop", entityId: shopId,
        metadata: { from: shop.inventoryReadMode, to: input.mode, reconciliation },
      });
    });
    response.json({ mode: input.mode, reconciliation });
  } catch (error) { next(error); }
});

storeConfigRouter.post("/:shopId/configuration/impact", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = updateInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const [lots, serials, recipes] = await Promise.all([
      prisma.inventoryLot.count({ where: { shopId, status: "ACTIVE" } }),
      prisma.inventorySerial.count({ where: { shopId, status: { in: ["IN_STOCK", "RESERVED"] } } }),
      prisma.recipe.count({ where: { product: { shopId } } }),
    ]);
    response.json({ impact: { activeLots: lots, activeSerials: serials, activeRecipes: recipes, requiresReadOnlyTransition: lots + serials + recipes > 0 }, requested: input });
  } catch (error) { next(error); }
});

storeConfigRouter.patch("/:shopId/configuration", async (request, response, next) => {
  try {
    const auth = getAuthUser(request);
    const { shopId } = params.parse(request.params);
    const input = updateInput.parse(request.body);
    await assertUserOwnsShop(auth.id, shopId);
    const current = await effectiveStoreConfiguration(prisma, shopId);
    const nextOverrides = { ...(current.requestedCapabilities.reduce((map, key) => ({ ...map, [key]: true }), {})), ...(input.capabilities ?? {}) };
    const disablingTracked = Object.entries(input.capabilities ?? {}).filter(([, enabled]) => !enabled).map(([key]) => key);
    const trackedCounts = disablingTracked.length ? await Promise.all([
      disablingTracked.some((key) => key.includes("lots") || key.includes("expiry")) ? prisma.inventoryLot.count({ where: { shopId, status: "ACTIVE" } }) : 0,
      disablingTracked.some((key) => key.includes("serial")) ? prisma.inventorySerial.count({ where: { shopId, status: { in: ["IN_STOCK", "RESERVED"] } } }) : 0,
      disablingTracked.some((key) => key.includes("recipe")) ? prisma.recipe.count({ where: { product: { shopId } } }) : 0,
    ]) : [0, 0, 0];
    const capabilityStates = Object.fromEntries(disablingTracked.map((key) => [key, trackedCounts.some(Boolean) ? "DISABLING" : "DISABLED"]));
    await prisma.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id: shopId },
        data: {
          ...(input.templateKey ? { templateKey: input.templateKey } : {}),
          capabilities: nextOverrides,
          capabilityStates: { ...(current.capabilityStates as object), ...capabilityStates },
          ...(input.completeOnboarding !== undefined ? { onboardingCompleted: input.completeOnboarding } : {}),
        },
      });
      if (input.templateKey) await applyTemplateDefaults(tx, shopId, input.templateKey);
      await writeAuditLog(tx, {
        shopId, actorId: auth.id, action: "store.configuration",
        entity: "Shop", entityId: shopId,
        metadata: {
          fromTemplate: current.templateKey,
          toTemplate: input.templateKey ?? current.templateKey,
          capabilityStates,
          completeOnboarding: input.completeOnboarding ?? null,
        },
      });
    });
    response.json({ configuration: await effectiveStoreConfiguration(prisma, shopId) });
  } catch (error) { next(error); }
});
