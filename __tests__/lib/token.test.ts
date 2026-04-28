import { describe, it, expect } from "vitest";
import { generateLoginToken } from "@/lib/token";

describe("generateLoginToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateLoginToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens on each call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateLoginToken()));
    expect(tokens.size).toBe(100);
  });

  it("only contains lowercase hex characters", () => {
    const token = generateLoginToken();
    expect(token).toBe(token.toLowerCase());
  });
});
