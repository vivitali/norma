import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import uk from "../../messages/uk.json";
import es from "../../messages/es.json";
import type { Locale } from "@/lib/locales";

/**
 * Every message catalogue, keyed by locale.
 *
 * `satisfies Record<Locale, unknown>` is the point of this module: adding a locale to
 * `routing.ts` and forgetting its catalogue is a compile error here, rather than a
 * suite that quietly keeps checking two of four locales. Before this existed, ten test
 * files each wrote their own `{ en, fr }` literal, so "in both locales" meant
 * "in the two locales that happened to be listed in this file".
 *
 * The `as const` keeps each file's own literal type, so a test that wants
 * `fr.Home.toolsHeading` can still import `messages/fr.json` directly. Locale-specific
 * assertions belong in locale-specific tests; this is for the checks that must hold
 * across all of them.
 */
export const CATALOGUES = { en, fr, uk, es } as const satisfies Record<Locale, unknown>;

/** A catalogue with its structure forgotten — what a path-walking check wants. */
export type Tree = Record<string, unknown>;

export const CATALOGUE_ENTRIES = Object.entries(CATALOGUES) as [Locale, Tree][];

/** The locale every other one is translated FROM. */
export const SOURCE_LOCALE = "en";

/** Every locale except the source, paired with its catalogue. */
export const TRANSLATED_ENTRIES = CATALOGUE_ENTRIES.filter(
  ([locale]) => locale !== SOURCE_LOCALE,
);

/** Every leaf path in a catalogue, e.g. "Affordability.ckApproval". */
export function leafPaths(node: Tree, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? leafPaths(value as Tree, path)
      : [path];
  });
}

/** Every leaf path paired with its string value. */
export function leaves(node: Tree, prefix = ""): [string, string][] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? leaves(value as Tree, path)
      : ([[path, String(value)]] as [string, string][]);
  });
}

/** The value at a dotted path, or undefined. */
export function at(tree: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Tree)?.[key], tree);
}
