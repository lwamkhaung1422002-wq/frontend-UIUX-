import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import { getAuthUser, requireAuth } from "../middleware/auth.middleware.js";

export const auditRouter = Router();

const paramsSchema = z.object({ shopId: z.string().min(1) });
const querySchema = z.object({
  entity: z.string().trim().min(1).max(80).optional(),
  entityId: z.string().trim().min(1).max(120).optional(),
  actionPrefix: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

auditRouter.use(requireAuth);

auditRouter.get("/:shopId/audit-logs", async (request, response, next) => {
  try {
    const authUser = getAuthUser(request);
    const { shopId } = paramsSchema.parse(request.params);
    const query = querySchema.parse(request.query);
    await assertUserOwnsShop(authUser.id, shopId);
    const where = {
      shopId,
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actionPrefix ? { action: { startsWith: query.actionPrefix } } : {}),
    };
    const [auditLogs, totalCount] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.auditLog.count({ where }),
    ]);
    response.json({ auditLogs, page: query.page, pageSize: query.pageSize, totalCount });
  } catch (error) {
    next(error);
  }
});
