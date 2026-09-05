import { describe, expect, it } from "vitest";
import type { Country } from "./types";
import { RULES } from "./rules";
import { readFieldPath } from "./provenance";

describe("readFieldPath", () => {
  const rec = { a: 1, b: { c: null, d: 2 }, e: undefined };

  it("reads a top-level field", () => {
    expect(readFieldPath(rec, "a")).toEqual({ found: true, value: 1 });
  });

  it("reads a nested field", () => {
    expect(readFieldPath(rec, "b.d")).toEqual({ found: true, value: 2 });
  });

  it("distinguishes a null value from a missing path", () => {
    expect(readFieldPath(rec, "b.c")).toEqual({ found: true, value: null });
    expect(readFieldPath(rec, "b.zz")).toEqual({ found: false, value: undefined });
  });

  it("does not walk through a null", () => {
    expect(readFieldPath(rec, "b.c.deeper")).toEqual({ found: false, value: undefined });
  });

  it("indexes into an array by position", () => {
    // Transfer lines and rebates are arrays, and provenance keys them positionally:
    // "transfer.1.rate" is how Nova Scotia's non-resident deed transfer tax is annotated.
    expect(readFieldPath({ xs: [{ r: 0.1 }] }, "xs.0.r")).toEqual({ found: true, value: 0.1 });
    expect(readFieldPath({ xs: [{ r: 0.1 }] }, "xs.2.r")).toEqual({ found: false, value: undefined });
  });
});

/**
 * The same four invariants the jurisdictions carry (see jurisdictions/index.test.ts), applied
 * to every country's rules record. Country rules are the only figures in the app that already
 * have a verification date, so it is exactly here that a mislabelled confidence would do
 * damage. Iterates `RULES` — not a single hardcoded record — so a second country inherits
 * these checks the moment it lands in the registry, the same discipline the locale tests
 * already apply via `src/test/catalogues.ts`.
 */
describe.each(Object.keys(RULES) as Country[])("%s rules provenance", (country) => {
  const rules = RULES[country];

  it("keys every entry to a field that exists on the record", () => {
    for (const path of Object.keys(rules.provenance)) {
      expect(readFieldPath(rules, path).found, `no such ${country} field "${path}"`).toBe(true);
    }
  });

  it("leaves the value null or absent wherever confidence is none", () => {
    for (const [path, p] of Object.entries(rules.provenance)) {
      if (p?.conf !== "none") continue;
      const { value } = readFieldPath(rules, path);
      expect(value ?? null, `${country}.${path} is "none" but holds ${String(value)}`).toBeNull();
    }
  });

  it("carries a value and a note wherever confidence is assumption", () => {
    for (const [path, p] of Object.entries(rules.provenance)) {
      if (p?.conf !== "assumption") continue;
      expect(readFieldPath(rules, path).value ?? null, `${country}.${path}`).not.toBeNull();
      expect(p.note, `${country}.${path} is an assumption with no note`).toBeTruthy();
    }
  });
});
