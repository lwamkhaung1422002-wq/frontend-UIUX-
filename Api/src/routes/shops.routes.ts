import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { applyTemplateDefaults } from "../lib/store-capabilities.js";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth.middleware.js";

export const shopsRouter = Router();

const createShopSchema = z.object({
  name: z.string().trim().min(1, "Shop name is required."),
});

shopsRouter.use(requireAuth);

shopsRouter.get("/", async (request, response, next) => {
  try {
    const authRequest = request as AuthenticatedRequest;

    const shops = await prisma.shop.findMany({
      where: { ownerId: authRequest.user.id },
      include: { setting: true },
      orderBy: { createdAt: "desc" },
    });

    response.status(200).json({ shops });
  } catch (error) {
    next(error);
  }
});

shopsRouter.post("/", async (request, response, next) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const input = createShopSchema.parse(request.body);

    const shop = await prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({
        data: {
          name: input.name,
          ownerId: authRequest.user.id,
          ledgerEnabled: true,
          inventoryReadMode: "LEDGER",
          ledgerCutoverAt: new Date(),
          setting: { create: {} },
        },
        include: { setting: true },
      });
      await applyTemplateDefaults(tx, created.id, "GENERAL_STORE");
      return created;
    });

    response.status(201).json({ shop });
  } catch (error) {
    next(error);
  }
});
