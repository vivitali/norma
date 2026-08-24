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
