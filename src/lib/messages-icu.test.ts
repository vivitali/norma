import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import { CATALOGUES, leaves, type Tree } from "@/test/catalogues";

/**
 * Every message, in every locale, must actually FORMAT.
 *
 * `locale-render.test.tsx` renders each page and catches a message that fails, but only
 * in the state that page happens to be in on arrival. Roughly a third of the ICU plurals
 * in this product are behind a verdict or a branch — `RentVsBuy.vNeverSub`,
 * `Scenarios.recOnlySub`, `ClosingCosts.groupLine` — and a render pass structurally
 * cannot reach them all. This does, by constructing every leaf directly.
 *
 * It exists because Ukrainian has four plural categories where English has two, so a
 * dozen Ukrainian messages carry `{n, plural, one/few/many/other}` where the English
 * carries a bare `{n}`. The placeholder-parity check in `messages.test.ts` sees the same
 * argument NAME on both sides and passes — it cannot see inside the ICU. And a message
 * that fails to format is not an exception a caller could catch: next-intl renders the
 * raw key path, at whatever size the copy sat at.
 */

/** ICU AST element types, from @formatjs/icu-messageformat-parser's TYPE enum. */
const enum T { literal, argument, number, date, time, select, plural, pound, tag }

type Element = {
  type: T;
  value?: unknown;
  options?: Record<string, { value: Element[] }>;
  children?: Element[];
  pluralType?: string;
};

/**
 * Arguments for one message, derived from its own AST rather than guessed: a `plural`
 * arg handed a string throws, and so does a `select` arg handed an option that does not
 * exist, so a one-size-fits-all stub would fail on correct messages.
 */
function argsFor(ast: Element[], into: Record<string, unknown> = {}): Record<string, unknown> {
  for (const el of ast) {
    const name = String(el.value ?? "");
    if (el.type === T.argument) into[name] ??= "x";
    if (el.type === T.number || el.type === T.plural) into[name] = 3;
    if (el.type === T.date || el.type === T.time) into[name] = new Date(0);
    if (el.type === T.select) {
      const branches = Object.keys(el.options ?? {});
      into[name] = branches.find((b) => b !== "other") ?? "other";
    }
    if (el.type === T.tag) into[name] = (chunks: unknown) => chunks;
    for (const branch of Object.values(el.options ?? {})) argsFor(branch.value, into);
    if (el.children) argsFor(el.children as Element[], into);
  }
  return into;
}

/** Every plural category any supported locale uses, plus the boundaries. */
const COUNTS = [0, 1, 2, 3, 5, 11, 21, 40, 101];

describe("every message formats in its own locale", () => {
  it.each(Object.entries(CATALOGUES))("%s", (locale, tree) => {
    for (const [path, message] of leaves(tree as Tree)) {
      let formatter: IntlMessageFormat;
      try {
        formatter = new IntlMessageFormat(message, locale);
      } catch (error) {
        throw new Error(`${locale}: ${path} does not parse as ICU — ${(error as Error).message}`);
      }

      const ast = formatter.getAst() as unknown as Element[];
      const args = argsFor(ast);
      const counts = Object.entries(args).filter(([, v]) => typeof v === "number");

      // A plural with no `other` branch parses and then throws for any count outside the
      // branches it does have — which is why every category is exercised, not just one.
      const cases = counts.length === 0 ? [args] : COUNTS.map((n) =>
        Object.fromEntries(Object.entries(args).map(([k, v]) => [k, typeof v === "number" ? n : v])),
      );

      for (const values of cases) {
        let out: unknown;
        try {
          out = formatter.format(values as never);
        } catch (error) {
          throw new Error(
            `${locale}: ${path} fails to format with ${JSON.stringify(values)} — ` +
              `${(error as Error).message}`,
          );
        }
        const text = Array.isArray(out) ? out.join("") : String(out);
        expect(text.trim(), `${locale}: ${path} formatted to nothing`).not.toBe("");
      }
    }
  });
});

/**
 * Rich-text tags must match across locales, exactly as argument names do.
 *
 * Drop `<sources>` from `Home.rulesUnverified` in one catalogue and next-intl throws
 * nothing and logs nothing — it renders the paragraph without its link. That paragraph
 * is the provenance disclosure, and the link it loses is the one to `/sources`, so the
 * failure is silent precisely where the product's claim about itself lives.
 *
 * `cross-link.test.tsx` checks `<link>` for the keys it classifies as cross-links by
 * their `x`-prefixed name. `Home.rulesUnverified` is not one of those.
 */
describe("rich-text tags", () => {
  const tags = (message: string) =>
    [...message.matchAll(/<\/?(\w+)>/g)].map((m) => m[1]).sort();

  const source = new Map(leaves(CATALOGUES.en as Tree));

  it.each(Object.entries(CATALOGUES))("%s uses the same tags as English", (locale, tree) => {
    for (const [path, message] of leaves(tree as Tree)) {
      const english = source.get(path);
      if (english === undefined) continue; // covered by the parity tests
      expect(tags(message), `${locale}: ${path}`).toEqual(tags(english));
    }
  });
});
