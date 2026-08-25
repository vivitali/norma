import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const OG_PATH = "public/og.png";

describe("open graph image", () => {
  it("exists", () => {
    expect(existsSync(OG_PATH)).toBe(true);
  });

  it("is a real PNG", () => {
    const header = readFileSync(OG_PATH).subarray(0, 8);
    expect([...header]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("is large enough to be the card and small enough to serve", () => {
    const bytes = readFileSync(OG_PATH).length;
    expect(bytes).toBeGreaterThan(5_000);
    expect(bytes).toBeLessThan(1_000_000);
  });
});
