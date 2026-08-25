import { describe, expect, it } from "vitest";
import {
  CATALOGUES,
  SOURCE_LOCALE,
  TRANSLATED_ENTRIES,
  leafPaths,
  leaves,
  type Tree,
} from "@/test/catalogues";

const source = CATALOGUES[SOURCE_LOCALE] as Tree;
const sourcePaths = leafPaths(source);

/**
 * Every locale must carry the same keys, exactly.
 *
 * next-intl renders the raw key when one is missing, so an untranslated string reaches
 * the reader as `RentVsBuy.secWealth` rather than as English — the one failure mode
 * worse than not translating it. There is no runtime check for this and no type for it
 * either: the catalogues are plain JSON.
 *
 * Written against `TRANSLATED_ENTRIES` rather than a hardcoded pair, so a fifth locale
 * is covered by adding one line to `src/test/catalogues.ts` and nothing here.
 */
describe("message catalogues", () => {
  it.each(TRANSLATED_ENTRIES)("%s carries every key English has", (_locale, tree) => {
    const theirs = new Set(leafPaths(tree));
    expect(sourcePaths.filter((p) => !theirs.has(p))).toEqual([]);
  });

  it.each(TRANSLATED_ENTRIES)("%s carries no key English lacks", (_locale, tree) => {
    // The reverse matters too: a key in one locale only is dead copy nobody maintains.
    const ours = new Set(sourcePaths);
    expect(leafPaths(tree).filter((p) => !ours.has(p))).toEqual([]);
  });

  it.each(Object.entries(CATALOGUES))("%s leaves no string empty", (locale, tree) => {
    for (const [path, value] of leaves(tree as Tree)) {
      expect(value.trim(), `${locale}: ${path}`).not.toBe("");
    }
  });
});

/**
 * A missing ICU parameter is not a fallback — next-intl throws and renders the raw key,
 * so `Amortization.altText` reached the page as that literal string until it was caught
 * by hand. Two ways that happens: a call site forgets a placeholder, or one locale's
 * translation carries a placeholder another does not. This catches the second, which no
 * call site can be blamed for.
 */
describe("ICU placeholders", () => {
  const placeholders = (value: string) =>
    [...value.matchAll(/\{(\w+)[^}]*\}/g)].map((m) => m[1]).sort();

  const sourceLeaves = leaves(source);

  it.each(TRANSLATED_ENTRIES)("%s uses English's placeholders, message for message", (_l, tree) => {
    const theirs = new Map(leaves(tree));
    for (const [path, value] of sourceLeaves) {
      const translated = theirs.get(path);
      if (translated === undefined) continue; // covered by the parity tests above
      expect(placeholders(translated), path).toEqual(placeholders(value));
    }
  });

  it.each(Object.entries(CATALOGUES))("%s leaves no unclosed or empty placeholder", (locale, tree) => {
    for (const [path, value] of leaves(tree as Tree)) {
      expect(value, `${locale}: ${path}`).not.toMatch(/\{\s*\}/);
    }
  });
});
