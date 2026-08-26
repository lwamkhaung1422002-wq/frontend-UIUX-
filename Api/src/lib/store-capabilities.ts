import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

export const STORE_TEMPLATES = {
  GENERAL_STORE: {
    label: "General Store",
    capabilities: ["catalog.products", "catalog.variants", "catalog.units", "inventory.basic", "sales.pos", "purchases", "finance", "reports"],
    terminology: { product: "Product", sale: "Sale", inventory: "Inventory" },
    units: [["Piece", "pc", 0]],
    categories: ["General", "Household", "Food & Beverage"],
  },
  MINI_MARKET: {
    label: "Mini-market",
    capabilities: ["catalog.products", "catalog.units", "inventory.basic", "inventory.lots", "inventory.expiry", "sales.pos", "purchases", "finance", "reports"],
    terminology: { product: "Product", sale: "Sale", inventory: "Stock" },
    units: [["Piece", "pc", 0], ["Pack", "pack", 0], ["Carton", "ctn", 0]],
    categories: ["Beverages", "Snacks", "Groceries"],
  },
  FASHION: {
    label: "Fashion",
    capabilities: ["catalog.products", "catalog.variants", "catalog.variantMatrix", "inventory.basic", "sales.pos", "purchases", "finance", "reports"],
    terminology: { product: "Style", sale: "Sale", inventory: "Stock" },
    units: [["Piece", "pc", 0]],
    categories: ["Clothing", "Shoes", "Accessories"],
  },
  ELECTRONICS: {
    label: "Electronics",
    capabilities: ["catalog.products", "catalog.variants", "inventory.basic", "inventory.serials", "inventory.warranty", "sales.pos", "purchases", "finance", "reports"],
    terminology: { product: "Device", sale: "Sale", inventory: "Inventory" },
    units: [["Piece", "pc", 0]],
    categories: ["Phones", "Computers", "Accessories"],
  },
  PHARMACY: {
    label: "Pharmacy",
    capabilities: ["catalog.products", "catalog.units", "inventory.basic", "inventory.lots", "inventory.expiry", "inventory.fefo", "pharmacy.prescriptionWarning", "sales.pos", "purchases", "finance", "reports"],
    terminology: { product: "Medicine", sale: "Sale", inventory: "Stock" },
    units: [["Tablet", "tab", 0], ["Pack", "pack", 0], ["Bottle", "btl", 0]],
    categories: ["Medicine", "First Aid", "Wellness"],
  },
  COSMETICS: {
    label: "Cosmetics",
    capabilities: ["catalog.products", "catalog.variants", "catalog.variantMatrix", "inventory.basic", "inventory.lots", "inventory.expiry", "sales.pos", "purchases", "finance", "reports"],
    terminology: { product: "Product", sale: "Sale", inventory: "Stock" },
    units: [["Piece", "pc", 0]],
    categories: ["Skincare", "Makeup", "Fragrance"],
  },
  ONLINE_RESTAURANT: {
    label: "Online Restaurant",
    capabilities: ["catalog.products", "restaurant.menu", "restaurant.recipes", "restaurant.modifiers", "inventory.basic", "sales.onlineOrders", "finance", "reports"],
    terminology: { product: "Menu item", sale: "Online order", inventory: "Ingredients" },
    units: [["Piece", "pc", 0], ["Kilogram", "kg", 3], ["Liter", "L", 3]],
    categories: ["Meals", "Drinks", "Sides"],
  },
  WHOLESALE: {
    label: "Wholesale",
    capabilities: ["catalog.products", "catalog.units", "inventory.basic", "wholesale.moq", "wholesale.tierPricing", "sales.bulkOrders", "purchases", "finance", "reports"],
    terminology: { product: "Product", sale: "Order", inventory: "Warehouse stock" },
    units: [["Piece", "pc", 0], ["Pack", "pack", 0], ["Carton", "ctn", 0]],
    categories: ["Wholesale Goods", "Bulk Supplies"],
  },
} as const;

export type StoreTemplateKey = keyof typeof STORE_TEMPLATES;
export const STORE_TEMPLATE_KEYS = Object.keys(STORE_TEMPLATES) as StoreTemplateKey[];

export async function applyTemplateDefaults(
  prisma: PrismaClient | Prisma.TransactionClient,
  shopId: string,
  templateKey: StoreTemplateKey,
  options: { includeCategories?: boolean } = {},
): Promise<void> {
  const template = STORE_TEMPLATES[templateKey];
  for (const [name, symbol, precision] of template.units) {
    await prisma.unitOfMeasure.upsert({
      where: { shopId_name: { shopId, name } },
      update: { symbol, precision },
      create: { shopId, name, symbol, precision },
    });
  }
  if (options.includeCategories !== false) {
    for (const name of template.categories) {
      await prisma.category.upsert({
        where: { shopId_name: { shopId, name } },
        update: {},
        create: { shopId, name },
      });
    }
  }
  await prisma.inventoryLocation.upsert({
    where: { shopId_name: { shopId, name: "Main" } },
    update: { type: "SELLABLE", isActive: true },
    create: { shopId, name: "Main", type: "SELLABLE" },
  });
}

const CORE_RELEASED = new Set<string>([
  "catalog.products", "catalog.variants", "catalog.units", "inventory.basic",
  "sales.pos", "sales.onlineOrders", "purchases", "finance", "reports",
]);

export async function effectiveStoreConfiguration(prisma: PrismaClient, shopId: string) {
  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: {
      templateKey: true, capabilities: true, capabilityStates: true,
      onboardingCompleted: true, inventoryReadMode: true, ledgerEnabled: true,
      ledgerCutoverAt: true, setting: true,
    },
  });
  const templateKey = STORE_TEMPLATE_KEYS.includes(shop.templateKey as StoreTemplateKey)
    ? shop.templateKey as StoreTemplateKey
    : "GENERAL_STORE";
  const template = STORE_TEMPLATES[templateKey];
  const releaseRows = await prisma.releaseFeature.findMany();
  const released = new Map(releaseRows.map((row) => [row.key, row]));
  const overrides = (shop.capabilities && typeof shop.capabilities === "object" ? shop.capabilities : {}) as Record<string, boolean>;
  const requested = new Set<string>(template.capabilities.filter((key) => overrides[key] !== false));
  Object.entries(overrides).forEach(([key, enabled]) => enabled && requested.add(key));
  const releaseReady = [...new Set([...CORE_RELEASED, ...releaseRows.filter((row) => row.enabled).map((row) => row.key)])];
  const effectiveCapabilities = [...requested].filter((key) => CORE_RELEASED.has(key) || released.get(key)?.enabled);
  const publicCapabilities = effectiveCapabilities.filter((key) => CORE_RELEASED.has(key) || released.get(key)?.public);
  return {
    templateKey,
    template,
    requestedCapabilities: [...requested],
    releaseReadyCapabilities: releaseReady,
    effectiveCapabilities,
    publicCapabilities,
    capabilityStates: shop.capabilityStates,
    onboardingCompleted: shop.onboardingCompleted,
    inventoryReadMode: shop.inventoryReadMode,
    ledgerEnabled: shop.ledgerEnabled,
    ledgerCutoverAt: shop.ledgerCutoverAt,
    formatPreferences: shop.setting ? {
      currencyCode: shop.setting.currencyCode,
      dateFormat: shop.setting.dateFormat,
      locale: shop.setting.locale,
      timeZone: shop.setting.timeZone,
    } : null,
  };
}

export async function assertCapability(prisma: PrismaClient, shopId: string, capability: string) {
  const config = await effectiveStoreConfiguration(prisma, shopId);
  if (!config.effectiveCapabilities.includes(capability)) {
    const error = new Error(`Capability ${capability} is not available for this store.`);
    error.name = "ForbiddenError";
    throw error;
  }
}
