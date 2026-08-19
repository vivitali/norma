import { describe, expect, it } from "vitest";
import { formatLocaleNumber, parseLocaleNumber, separatorsFor } from "./number-format";

describe("separatorsFor", () => {
  // Derived from Intl.NumberFormat().formatToParts, never hardcoded: fr-CA groups
  // with a non-breaking space, and WHICH one depends on the ICU build -- U+00A0
  // here, U+202F elsewhere. money() emits the same thing, so a hardcoded table
  // would turn a figure the app just showed into 0 on the wrong runtime.
  it("reads en-CA separators", () => {
    expect(separatorsFor("en-CA")).toEqual({ group: ",", decimal: "." });
  });
  it("reads fr-CA separators", () => {
    // Asserted as "some space", not as one codepoint: fr-CA groups with U+00A0
    // under the ICU shipped with this Node and with U+202F under others. Reading
    // it from Intl instead of a table is the entire point.
    const { group, decimal } = separatorsFor("fr-CA");
    expect(group).toMatch(/^\s$/);
    expect(decimal).toBe(",");
  });
});

describe("parseLocaleNumber", () => {
  it("parses an en-CA grouped figure", () => {
    expect(parseLocaleNumber("350,000", "en-CA")).toBe(350000);
  });
  it("parses an en-CA decimal", () => {
    expect(parseLocaleNumber("350,000.50", "en-CA")).toBe(350000.5);
  });
  it("parses the fr-CA figure money() actually emits", () => {
    // The exact round trip that used to produce 0: format it, then re-type it.
    const shown = formatLocaleNumber(350000, "fr-CA");
    expect(parseLocaleNumber(shown, "fr-CA")).toBe(350000);
  });
  it("tolerates every space separator in use, whatever ICU picked", () => {
    // A plain space, U+00A0, U+202F and U+2009 all appear in the wild for the
    // same figure, and a value stored under one ICU may be re-read under another.
    for (const sp of [" ", "\u00a0", "\u202f", "\u2009"]) {
      expect(parseLocaleNumber(`350${sp}000`, "fr-CA")).toBe(350000);
      expect(parseLocaleNumber(`350${sp}000,50`, "fr-CA")).toBe(350000.5);
    }
  });
  it("strips a currency symbol in either position", () => {
    expect(parseLocaleNumber("$350,000", "en-CA")).toBe(350000);
    expect(parseLocaleNumber("350 000 $", "fr-CA")).toBe(350000);
  });
  it("reads a minus sign, including the typographic one money() emits", () => {
    expect(parseLocaleNumber("-340", "en-CA")).toBe(-340);
    expect(parseLocaleNumber("\u2212 340", "en-CA")).toBe(-340);
  });
  it("returns null for empty, not 0", () => {
    // "not told" and "told zero" are different facts and drive different UI.
    expect(parseLocaleNumber("", "en-CA")).toBeNull();
    expect(parseLocaleNumber("   ", "en-CA")).toBeNull();
  });
  it("returns null for a partial entry rather than 0", () => {
    expect(parseLocaleNumber("-", "en-CA")).toBeNull();
    expect(parseLocaleNumber(".", "en-CA")).toBeNull();
    expect(parseLocaleNumber("abc", "en-CA")).toBeNull();
  });
  it("rejects a shorthand rather than silently truncating it", () => {
    // "350k" must not become 350, and "12e3" must not become 123. Rejecting is
    // the only honest answer -- the field then keeps what it had.
    for (const raw of ["350k", "1.5M", "12e3", "350 000 CAD"]) {
      expect(parseLocaleNumber(raw, "en-CA"), raw).toBeNull();
    }
  });
});

describe("formatLocaleNumber", () => {
  it("groups in en-CA", () => {
    expect(formatLocaleNumber(350000, "en-CA")).toBe("350,000");
  });
  it("groups in fr-CA with whatever space its separator is", () => {
    expect(formatLocaleNumber(350000, "fr-CA")).toMatch(/^350\s000$/);
  });
  it("round-trips through parse in both locales", () => {
    for (const loc of ["en-CA", "fr-CA"]) {
      expect(parseLocaleNumber(formatLocaleNumber(1234567.89, loc, 2), loc)).toBe(1234567.89);
    }
  });
});
