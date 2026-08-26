import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";

export const refreshCookieName = "pos_refresh";
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1_000;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function refreshCookiePath(): string {
  return process.env.REFRESH_COOKIE_PATH ?? (isProduction() ? "/api/auth" : "/api/auth");
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + refreshLifetimeMs);
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function setRefreshCookie(response: Response, token: string): void {
  response.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: refreshCookiePath(),
    maxAge: refreshLifetimeMs,
  });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: refreshCookiePath(),
  });
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const prefix = `${name}=`;
  for (const value of header.split(";")) {
    const item = value.trim();
    if (item.startsWith(prefix)) return decodeURIComponent(item.slice(prefix.length));
  }
  return null;
}
