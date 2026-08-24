import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, oklchToHex, parseOklch, readTokens } from "@/test/color";

// Read from the project root, not from import.meta.url: Vite rewrites that to a
// non-file URL during transform, so readFileSync cannot resolve it.
const css = readFileSync("src/app/globals.css", "utf8");
const light = readTokens(css, ":root");
const dark = readTokens(css, ".dark");

const hex = (tokens: Record<string, string>, name: string) => {
  const value = tokens[name];
  if (!value) throw new Error(`missing token ${name}`);
  return oklchToHex(...parseOklch(value));
};

describe("palette", () => {
  // The v2 world, ported from design-reference/Affordability v2.dc.html. Every
  // colour ports unchanged EXCEPT --ink3, whose two values are deliberate WCAG
  // corrections. Round-tripping to hex catches both a bad oklch conversion and a
  // silently reverted correction.
  const REFERENCE = {
    light: {
      "--paper": "#FAF9F6", "--panel": "#FFFFFF", "--sunk": "#F1EFEA",
      "--line": "#E4E1DA", "--line2": "#EFEDE8",
      "--ink": "#14151A", "--ink2": "#5B5F66", "--ink3": "#6A6D73",
      "--ac": "#3D3BD6", "--ac2": "#6462E6", "--acbg": "#EEEEFD", "--acbr": "#D3D2FA",
      "--pass": "#176B4B", "--caut": "#8A5A12", "--blk": "#A32B2B",
    },
    dark: {
      "--paper": "#0E0F11", "--panel": "#16181C", "--sunk": "#1C1F24",
      "--line": "#292D33", "--line2": "#22252A",
      "--ink": "#ECEAE6", "--ink2": "#A2A7AE", "--ink3": "#82878D",
      "--ac": "#8886FF", "--ac2": "#A5A3FF", "--acbg": "#1B1B33", "--acbr": "#2E2E52",
      "--pass": "#55C293", "--caut": "#D9A94E", "--blk": "#E88A8A",
    },
  } as const;

  for (const [theme, tokens] of [["light", light], ["dark", dark]] as const) {
    for (const [name, expected] of Object.entries(REFERENCE[theme])) {
      it(`${theme} ${name} round-trips to ${expected}`, () => {
        expect(hex(tokens, name)).toBe(expected);
      });
    }
  }
});

describe("contrast", () => {
  // v2 has no semantic surfaces — state is a dot and a figure colour on the page
  // ground. --acbg is the one exception and always was: the inline-ask box, the
  // open menu trigger, the personalisation tag and the reader's own row in the
  // rent-vs-buy table all put text on it. It was outside this sweep until that
  // last one was added, which is exactly how an untested surface accumulates.
  const SURFACES = ["--paper", "--panel", "--sunk", "--acbg"] as const;
  const FOREGROUNDS = ["--ink", "--ink2", "--ink3", "--ac", "--pass", "--caut", "--blk"] as const;

  for (const [theme, tokens] of [["light", light], ["dark", dark]] as const) {
    for (const fg of FOREGROUNDS) {
      for (const surface of SURFACES) {
        it(`${theme} ${fg} on ${surface} passes AA`, () => {
          // --ink3 is the one the reference got wrong, in both themes, and it is
          // used at 11.5-12.5px where AA-large does not apply. If anyone
          // "restores fidelity" to #8B9097 / #6F757C this fails, naming the ratio.
          expect(contrastRatio(hex(tokens, fg), hex(tokens, surface))).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});

describe("touch targets", () => {
  it("gives the switch a 44px hit area below sm without growing the control", () => {
    // DESIGN.md §7: a deliberately small control reaches 44px through an
    // invisible hit area, never by being grown. shadcn's stock `-inset-y-2` only
    // reached 34.4px on an 18.4px switch — measured in a browser at 320px, where
    // it failed a hit test at ±21px from centre. Below `sm` the inset opens to
    // 13px a side: 18.4 + 26 = 44.4. Above `sm` the stock value is correct.
    const source = readFileSync("src/components/ui/switch.tsx", "utf8");
    expect(source).toContain("max-sm:after:-inset-y-[13px]");
    // The control itself must not have been resized to get there.
    expect(source).toContain("data-[size=default]:h-[18.4px]");
  });
});

describe("geometry", () => {
  it("form controls have a 16px floor", () => {
    // iOS Safari zooms the viewport on focus of any control under 16px, and this
    // page has twelve fields. The floor is the control itself, not its label.
    const size = light["--control-font-size"];
    expect(size).toBeDefined();
    const px = size.endsWith("rem") ? parseFloat(size) * 16 : parseFloat(size);
    expect(px).toBeGreaterThanOrEqual(16);
  });

  it("uses v2's soft rectangles and pills, not v1's hairline radii", () => {
    const theme = readTokens(css.replace(/^@theme inline \{/m, ":root {"), ":root");
    expect(theme["--radius-lg"]).toBe("6px");
    expect(theme["--radius-xl"]).toBe("6px");
    // The pill, used on every button, chip and bar in v2.
    expect(theme["--radius-3xl"]).toBe("100px");
  });

  it("breaks a token that would otherwise be wider than a 320px viewport", () => {
    // break-word, not anywhere: it fires only when the word would overflow, so
    // it never re-breaks a line that already fits.
    expect(css).toMatch(/overflow-wrap:\s*break-word/);
  });

  it("sets every figure in tabular lining numerals on the body", () => {
    // Not an opt-in .figure class: v2 puts hero and table row on the same
    // numerals, so it belongs on the root rather than at 40 call sites.
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums lining-nums/);
  });
});

describe("motion", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

  it("still zeroes animation and transition globally", () => {
    expect(reduced).toMatch(/\*::after\s*\{[^}]*animation-duration:\s*0s\s*!important/);
    expect(reduced).toMatch(/transition-duration:\s*0s\s*!important/);
  });

  it("exempts the pulse rather than deleting it", () => {
    // v2-pulse is the only signal that the answer re-computed after a
    // jurisdiction change. The blanket rule above removed it and put nothing in
    // its place, so under reduced motion every figure changed silently.
    expect(reduced).toMatch(/\.v2-pulse\s*\{[^}]*animation:\s*v2-pulse\s+0\.5s\s+ease-out[^}]*!important/);
  });

  it("keeps the fade rather than substituting a harder stimulus", () => {
    // v2-pulse is `opacity: 0.35 -> 1`. Opacity only -- no transform, no
    // position, no scale. A half-second fade is the canonical SAFE substitute
    // under this query, not something it exists to suppress. An earlier pass
    // swapped it for a step-end cut on the reasoning that this removed position
    // and scale; there was never any, and a hard luminance step is a worse
    // stimulus for a photosensitive reader than the fade. This asserts the
    // substitution stays reverted.
    // Comments stripped first: this file's own commentary explains why the
    // step-end substitute was reverted, and a raw text search would match the
    // explanation and fail on a correct stylesheet.
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations).not.toContain("step-end");
    expect(declarations).not.toContain("v2-pulse-step");
    const frames = css.slice(css.indexOf("@keyframes v2-pulse"));
    expect(frames).not.toMatch(/transform|translate|scale/);
  });

  it("keeps the override inside @layer base, after the rule it overrides", () => {
    // Important declarations invert cascade-layer order, so an unlayered
    // !important loses to the layered one. Inside the same layer .v2-pulse
    // (0,1,0) beats * (0,0,0) and wins. Moving this out of @layer base silently
    // restores the defect.
    const base = css.slice(css.indexOf("@layer base {"), css.indexOf("@layer components {"));
    expect(base).toContain("prefers-reduced-motion");
    expect(base).toContain(".v2-pulse");
    expect(base.indexOf("animation-duration: 0s")).toBeLessThan(base.lastIndexOf(".v2-pulse"));
  });
});
