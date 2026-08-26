import { describe, expect, it, beforeEach } from "vitest";
import { readStoredJson } from "./lib/storage";

describe("readStoredJson", () => {
  beforeEach(() => localStorage.clear());

  it("recovers from malformed localStorage without blocking startup", () => {
    localStorage.setItem("pos-shop-details", "{invalid");
    const fallback = { name: "POS System", address: "", logo: "" };

    expect(readStoredJson("pos-shop-details", fallback)).toEqual(fallback);
    expect(localStorage.getItem("pos-shop-details")).toBeNull();
  });
});
