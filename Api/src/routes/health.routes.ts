import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

healthRouter.get("/ready", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: "ready", database: "connected" });
  } catch {
    response.status(503).json({ status: "not_ready", database: "unavailable" });
  }
});
