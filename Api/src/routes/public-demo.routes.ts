import { Router } from "express";

import { salesReportHandler } from "./dashboard.routes.js";

export const publicDemoRouter = Router();

publicDemoRouter.get("/:shopId/reports/sales", (request, response, next) => {
  const isLocalDemoRequest = process.env.NODE_ENV !== "production"
    && request.params.shopId === "sales-analytics-demo-shop"
    && request.query.demo === "true";
  if (!isLocalDemoRequest) {
    next();
    return;
  }
  void salesReportHandler(request, response, next);
});
