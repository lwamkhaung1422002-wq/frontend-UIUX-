import { describe, expect, it } from "vitest";

import { hashRefreshToken, readCookie } from "./auth-session.js";

describe("auth session helpers", () => {
  it("extracts only the named refresh cookie", () => {
    expect(readCookie("theme=dark; pos_refresh=token-value; other=1", "pos_refresh")).toBe("token-value");
  });

  it("hashes refresh tokens without preserving their plaintext", () => {
    expect(hashRefreshToken("secret-token")).not.toContain("secret-token");
    expect(hashRefreshToken("secret-token")).toBe(hashRefreshToken("secret-token"));
  });
});
