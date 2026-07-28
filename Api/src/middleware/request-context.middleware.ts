import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header("X-Request-Id");
  const requestId = incoming && /^[a-zA-Z0-9._:-]{1,100}$/.test(incoming) ? incoming : randomUUID();
  response.setHeader("X-Request-Id", requestId);
  (request as Request & { requestId: string }).requestId = requestId;
  next();
}
