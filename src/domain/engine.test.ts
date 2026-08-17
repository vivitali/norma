import { describe, expect, it } from "vitest";
import { money, bracketTax, payFactor, minDown } from "./engine";

describe("money", () => {
  it("formats a positive amount with the symbol first in en", () => {
    expect(money(1234, "en-CA", false)).toBe("$1,234");
  });

  it("puts the sign outside the symbol for a negative amount, never $-340", () => {
    const result = money(-340, "en-CA", false);
    expect(result).toBe("− $340");
    expect(result).not.toContain("$-");
  });

  it("formats with the symbol trailing in fr", () => {
    const result = money(1234, "fr-CA", true);
    expect(result.endsWith(" $")).toBe(true);
  });

  it("treats -0 as 0, not negative zero", () => {
    expect(money(-0.001, "en-CA", false)).toBe("$0");
  });
});

describe("bracketTax", () => {
  const brackets: [number | null, number][] = [
    [100, 0.01],
    [200, 0.02],
    [null, 0.03],
  ];

  it("taxes only within the first bracket when price is below its cap", () => {
    const result = bracketTax(50, brackets);
    expect(result.total).toBeCloseTo(0.5, 5);
    expect(result.parts).toHaveLength(1);
  });

  it("taxes across multiple brackets proportionally", () => {
    // 100 @ 1% = 1, next 100 (100->200) @ 2% = 2, next 50 (200->250) @ 3% = 1.5
    const result = bracketTax(250, brackets);
    expect(result.total).toBeCloseTo(1 + 2 + 1.5, 5);
    expect(result.parts).toHaveLength(3);
  });

  it("returns zero tax for a zero price", () => {
    expect(bracketTax(0, brackets).total).toBe(0);
  });
});

describe("payFactor", () => {
  it("returns 1/n for a zero rate (equal principal payments)", () => {
    expect(payFactor(0, 25)).toBeCloseTo(1 / (25 * 12), 8);
  });

  it("returns a larger monthly factor for a higher rate at the same amortization", () => {
    expect(payFactor(0.06, 25)).toBeGreaterThan(payFactor(0.03, 25));
  });

  it("returns a smaller monthly factor for a longer amortization at the same rate", () => {
    expect(payFactor(0.04, 30)).toBeLessThan(payFactor(0.04, 15));
  });
});

describe("minDown", () => {
  it("requires 5% under $500,000", () => {
    expect(minDown(400000)).toBeCloseTo(20000, 5);
  });

  it("requires 5% on the first $500,000 plus 10% above it, between $500,000 and $1,500,000", () => {
    expect(minDown(600000)).toBeCloseTo(25000 + 10000, 5);
  });

  it("requires a flat 20% at or above $1,500,000", () => {
    expect(minDown(1500000)).toBeCloseTo(300000, 5);
    expect(minDown(2000000)).toBeCloseTo(400000, 5);
  });
});
