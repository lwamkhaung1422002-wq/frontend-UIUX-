import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function authRateLimit(request: Request, response: Response, next: NextFunction): void {
  const now = Date.now();
  const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000);
  const maximum = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10);
  const key = `${request.ip}:${request.path}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  response.setHeader("RateLimit-Limit", maximum);
  response.setHeader("RateLimit-Remaining", Math.max(0, maximum - bucket.count));
  response.setHeader("RateLimit-Reset", Math.ceil(bucket.resetAt / 1_000));
  if (bucket.count > maximum) {
    response.status(429).json({ message: "Too many authentication attempts. Try again later." });
    return;
  }
  next();
}
