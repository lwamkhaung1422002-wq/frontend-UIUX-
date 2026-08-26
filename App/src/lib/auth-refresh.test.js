import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "./api";
import { accessTokenRefreshDelay, requestAccessTokenRefresh } from "./auth-refresh";

describe("auth refresh coordination", () => {
  afterEach(() => vi.clearAllMocks());

  it("shares one refresh request across concurrent callers", async () => {
    apiRequest.mockResolvedValue({ accessToken: "new-access-token" });

    const first = requestAccessTokenRefresh();
    const second = requestAccessTokenRefresh();

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ accessToken: "new-access-token" });
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/auth/refresh", { method: "POST" });
  });

  it("schedules refresh before a valid access token expires", () => {
    const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1_000) + 15 * 60 }))}.signature`;
    const delay = accessTokenRefreshDelay(token);

    expect(delay).toBeGreaterThan(13 * 60_000);
    expect(delay).toBeLessThanOrEqual(14 * 60_000);
  });
});
