import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every colour utility in the app must name a colour the theme actually defines.
 *
 * Tailwind v4 generates colour utilities from the `--color-*` entries in the
 * `@theme inline` block of globals.css and from nothing else. A class naming a
 * colour that block does not define — `text-text-faint`, `bg-surface-sunken`,
 * both survivors of the pre-v2 palette — compiles to no rule at all. Nothing
 * fails: the element silently renders at its INHERITED colour, so text meant to
 * be de-emphasised comes out at full ink and the hierarchy quietly collapses.
 * That is invisible in review, invisible in a unit test, and invisible in a
 * screenshot unless you already know what the colour should have been.
 *
 * The valid set is READ FROM globals.css rather than listed here, so renaming or
 * deleting a token immediately fails every call site that still refers to it.
 * That is the whole point — a hardcoded list would rot into the same lie.
 */
const css = readFileSync("src/app/globals.css", "utf8");

const themeBlock = (() => {
  const start = css.indexOf("@theme inline {");
  if (start < 0) throw new Error("globals.css has no `@theme inline` block");
  const end = css.indexOf("\n}", start);
  return css.slice(start, end);
})();

/** `--color-ink3: …` → `ink3`, i.e. exactly the utilities Tailwind will emit. */
const themeColors = new Set(
  [...themeBlock.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);

/**
 * Utilities whose value slot takes a colour. Deliberately not every Tailwind
 * prefix: only the ones where a bare word after the dash is *usually* a colour,
 * so a typo'd token is caught while `flex-1` or `gap-3` is never examined.
 */
const COLOR_UTILITIES = [
  "text",
  "bg",
  "border",
  "ring",
  "outline",
  "divide",
  "decoration",
  "fill",
  "stroke",
  "caret",
  "accent",
  "shadow",
] as const;

/** Sides and axes that sit between the prefix and the value: `border-l-caution`. */
const SIDES = new Set(["x", "y", "s", "e", "t", "r", "b", "l"]);

/**
 * Non-colour values these same prefixes legitimately take. Tailwind's own
 * vocabulary, which changes about once a major version — unlike the palette,
 * which changes whenever someone edits globals.css. If a real utility lands here
 * as a false positive, add the word; that is a one-line, one-time cost, and it
 * is the price of catching the silent failure above.
 */
const NON_COLOUR_VALUES = new Set([
  // universal keywords
  "transparent", "current", "inherit", "initial", "unset", "none", "auto",
  // sizes / scales
  "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl",
  "7xl", "8xl", "9xl", "full", "inner",
  // text alignment, wrapping, overflow
  "left", "right", "center", "justify", "start", "end",
  "balance", "pretty", "wrap", "nowrap", "ellipsis", "clip",
  // border and decoration styles
  "solid", "dashed", "dotted", "double", "wavy", "hidden", "visible",
  "groove", "ridge", "inset", "outset", "collapse", "separate",
  "from-font", "slice", "clone",
  // background clip / origin / attachment / repeat / size / position
  "clip-border", "clip-padding", "clip-content", "clip-text",
  "origin-border", "origin-padding", "origin-content",
  "fixed", "local", "scroll",
  "repeat", "no-repeat", "repeat-x", "repeat-y", "repeat-round", "repeat-space",
  "cover", "contain", "top", "bottom",
  // ring / outline offsets keep their own numeric suffix
  "offset",
]);

/** `border-2`, `ring-0`, `from-10%` — a measurement, never a token reference. */
const isMeasure = (value: string) => /^\d+(\.\d+)?%?$/.test(value);

/** `text-[10.5px]`, `bg-(--custom)` — Tailwind resolves these itself. */
const isArbitrary = (value: string) =>
  (value.startsWith("[") && value.endsWith("]")) ||
  (value.startsWith("(") && value.endsWith(")"));

/**
 * Drop the variant chain. Splitting on every `:` would cut `data-[size=sm]:` and
 * `[&_svg]:` in half, so only colons outside brackets count.
 */
function stripVariants(token: string): string {
  let depth = 0;
  let lastColon = -1;
  for (let i = 0; i < token.length; i += 1) {
    const c = token[i];
    if (c === "[" || c === "(") depth += 1;
    else if (c === "]" || c === ")") depth -= 1;
    else if (c === ":" && depth === 0) lastColon = i;
  }
  return token.slice(lastColon + 1);
}

/**
 * Every custom property globals.css declares, from anywhere in the file.
 *
 * Wider than the `@theme inline` set on purpose: `--ink`, `--paper` and the rest
 * live on `:root`, and an arbitrary value may legitimately name either kind.
 */
const declaredProperties = new Set(
  [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
);

/**
 * Custom properties named inside an arbitrary value, e.g.
 * `bg-[color-mix(in_oklch,var(--color-secondary),var(--color-foreground)_5%)]`.
 *
 * This is the hole the first version of this guard had. It short-circuited every
 * arbitrary value, which is where the one defect it shipped beside actually
 * lived: `var(--secondary)` and `var(--foreground)` do not exist — only the
 * `--color-` prefixed forms are emitted — and `color-mix` with an invalid colour
 * invalidates the whole declaration, so the secondary button had no hover state
 * at all and nothing failed.
 */
function referencedProperties(value: string): string[] {
  return [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]);
}

/** The value slot of a colour utility, or null if this is not one. */
function colourValue(token: string): string | null {
  let rest = stripVariants(token).replace(/^!/, "");
  const prefix = COLOR_UTILITIES.find((p) => rest.startsWith(`${p}-`));
  if (!prefix) return null;
  rest = rest.slice(prefix.length + 1);
  // Opacity modifier: bg-ac/30.
  const slash = rest.lastIndexOf("/");
  if (slash > 0 && !rest.endsWith("]")) rest = rest.slice(0, slash);
  // border-l-caution, divide-y-0.
  const dash = rest.indexOf("-");
  if (dash > 0 && SIDES.has(rest.slice(0, dash))) rest = rest.slice(dash + 1);
  else if (SIDES.has(rest)) return null;
  return rest;
}


function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

/**
 * Comments are stripped first: a note explaining why `text-text-faint` was
 * removed must not read as a use of it. Only whole-line `//` comments go, so a
 * `//` inside a URL string survives.
 */
const withoutComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

describe("colour utilities", () => {
  const files = sourceFiles("src");

  it("reads the palette from globals.css rather than a list in this file", () => {
    // If this ever comes back empty the loop below passes vacuously and the
    // guard is worthless, so assert the derivation itself.
    expect(themeColors.size).toBeGreaterThan(20);
    expect(themeColors).toContain("ink3");
    expect(themeColors).not.toContain("text-faint");
  });

  it("names only colours the theme defines", () => {
    const dead: string[] = [];
    for (const file of files) {
      const src = withoutComments(readFileSync(file, "utf8"));
      for (const raw of src.split(/[\s"'`{}<>=]+/)) {
        // Parens and commas are NOT separators: `bg-[color-mix(a,b)]` is one
        // class. Trailing code punctuation is trimmed instead, and only where
        // it cannot be part of an arbitrary value.
        let token = raw.replace(/[,;]+$/, "");
        if (!token.includes("[") && !token.includes("(")) token = token.replace(/\)+$/, "");
        const value = colourValue(token);
        if (value === null) continue;
        if (isArbitrary(value)) {
          for (const prop of referencedProperties(value)) {
            if (!declaredProperties.has(prop)) dead.push(`${file} ${token} → ${prop}`);
          }
          continue;
        }
        if (isMeasure(value)) continue;
        if (themeColors.has(value) || NON_COLOUR_VALUES.has(value)) continue;
        dead.push(`${file} ${stripVariants(token)}`);
      }
    }
    // A failure here means one of two things. If the class names a colour, add
    // the token to `@theme inline` in globals.css — Tailwind emits nothing for a
    // colour the theme has never heard of. If it names something else Tailwind
    // understands, add that word to NON_COLOUR_VALUES above.
    expect([...new Set(dead)]).toEqual([]);
  });

});
