import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

type Tree = Record<string, unknown>;

/** Every leaf path, e.g. "Affordability.ckApproval". */
function paths(node: Tree, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? paths(value as Tree, path)
      : [path];
  });
}

/**
 * The locales must carry the same keys, exactly.
 *
 * next-intl renders the raw key when one is missing, so an untranslated string
 * reaches a French reader as `RentVsBuy.secWealth` rather than as English — the
 * one failure mode worse than not translating it. There is no runtime check for
 * this and no type for it either: both files are plain JSON.
 */
describe("message catalogues", () => {
  const enPaths = paths(en as Tree);
  const frPaths = paths(fr as Tree);

  it("has no key in English that French is missing", () => {
    expect(enPaths.filter((p) => !frPaths.includes(p))).toEqual([]);
  });

  it("has no key in French that English is missing", () => {
    // The reverse matters too: a French-only key is dead copy nobody maintains.
    expect(frPaths.filter((p) => !enPaths.includes(p))).toEqual([]);
  });

  it("leaves no string empty in either locale", () => {
    for (const [locale, tree] of [["en", en], ["fr", fr]] as const) {
      for (const path of paths(tree as Tree)) {
        const value = path.split(".").reduce<unknown>((n, k) => (n as Tree)[k], tree);
        expect(String(value).trim(), `${locale}: ${path}`).not.toBe("");
      }
    }
  });
});

/**
 * A missing ICU parameter is not a fallback — next-intl throws and renders the
 * raw key, so `Amortization.altText` reached the page as that literal string
 * until it was caught by hand. Two ways that happens: a call site forgets a
 * placeholder, or one locale's translation carries a placeholder the other does
 * not. This catches the second, which no call site can be blamed for.
 */
describe("ICU placeholders", () => {
  const placeholders = (value: string) =>
    [...value.matchAll(/\{(\w+)[^}]*\}/g)].map((m) => m[1]).sort();

  function leaves(node: Tree, prefix = ""): [string, string][] {
    return Object.entries(node).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return value !== null && typeof value === "object" && !Array.isArray(value)
        ? leaves(value as Tree, path)
        : ([[path, String(value)]] as [string, string][]);
    });
  }

  it("uses the same placeholders in both locales, for every message", () => {
    const frByPath = new Map(leaves(fr as Tree));
    for (const [path, enValue] of leaves(en as Tree)) {
      const frValue = frByPath.get(path);
      if (frValue === undefined) continue; // covered by the parity tests above
      expect(placeholders(frValue), path).toEqual(placeholders(enValue));
    }
  });

  it("leaves no unclosed or empty placeholder", () => {
    for (const [locale, tree] of [["en", en], ["fr", fr]] as const) {
      for (const [path, value] of leaves(tree as Tree)) {
        expect(value, `${locale}: ${path}`).not.toMatch(/\{\s*\}/);
      }
    }
  });
});
