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
      "--ac": "#3D3BD6", "--ac2": "#6462E6", "--acbg": "#ECECFD", "--acbr": "#D3D2FA",
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
  // ground — so every meaningful pair is a foreground against one of these three.
  const SURFACES = ["--paper", "--panel", "--sunk"] as const;
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

  it("sets every figure in tabular lining numerals on the body", () => {
    // Not an opt-in .figure class: v2 puts hero and table row on the same
    // numerals, so it belongs on the root rather than at 40 call sites.
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums lining-nums/);
  });
});
