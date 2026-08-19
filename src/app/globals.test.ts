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
  // Every colour ports from the reference unchanged EXCEPT --text-faint, whose two
  // values are deliberate WCAG corrections. Round-tripping to hex catches both a
  // bad oklch conversion and a silently reverted correction.
  const REFERENCE = {
    light: {
      "--background": "#F7F5F1", "--card": "#FFFFFF", "--muted": "#EFECE5",
      "--surface-sunken": "#E5E1D7", "--border": "#DCD7CC", "--border-hairline": "#EAE6DD",
      "--input": "#C6BFB1", "--foreground": "#17191C", "--muted-foreground": "#565A5F",
      "--text-faint": "#676A6F", "--primary": "#22375C", "--ring": "#3B5C92",
      "--accent-surface": "#E7ECF4", "--accent-border": "#C3CFE2",
      "--pass": "#1A6B45", "--pass-bg": "#E3EFE8", "--pass-border": "#BEDBCB",
      "--caution": "#87590A", "--caution-bg": "#F6EEDC", "--caution-border": "#E3D3AE",
      "--blocked": "#8D2A2A", "--blocked-bg": "#F6E7E5", "--blocked-border": "#E5C4C0",
      "--band": "#455A6C", "--band-bg": "#E8EDF1", "--band-border": "#C8D3DC",
    },
    dark: {
      "--background": "#121417", "--card": "#191C20", "--muted": "#21252A",
      "--surface-sunken": "#2A2F35", "--border": "#2F343B", "--border-hairline": "#262A30",
      "--input": "#3D434B", "--foreground": "#EBE9E4", "--muted-foreground": "#A3A8AE",
      "--text-faint": "#898D93", "--primary": "#93B3E0", "--ring": "#AEC7EC",
      "--accent-surface": "#1C2632", "--accent-border": "#2C3B4D",
      "--pass": "#6AC497", "--pass-bg": "#152620", "--pass-border": "#264737",
      "--caution": "#DFAB4C", "--caution-bg": "#292213", "--caution-border": "#463A1E",
      "--blocked": "#EA8D8D", "--blocked-bg": "#2A1919", "--blocked-border": "#4A2C2C",
      "--band": "#A0B4C5", "--band-bg": "#1A2128", "--band-border": "#2C3742",
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
  const SURFACES = ["--background", "--card", "--muted"] as const;

  // The reference's --tx3 fails AA at the 9.5-11.5px sizes it is used at:
  // 2.86:1 on --s2 in light. Corrected to #676A6F / #898D93. If anyone "restores
  // fidelity" to #888C92 / #767B82 this fails, naming the ratio.
  for (const [theme, tokens] of [["light", light], ["dark", dark]] as const) {
    for (const surface of SURFACES) {
      it(`${theme} --text-faint on ${surface} passes AA`, () => {
        expect(contrastRatio(hex(tokens, "--text-faint"), hex(tokens, surface))).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${theme} --muted-foreground on --card passes AA`, () => {
      expect(contrastRatio(hex(tokens, "--muted-foreground"), hex(tokens, "--card"))).toBeGreaterThanOrEqual(4.5);
    });
    for (const state of ["pass", "caution", "blocked", "band"] as const) {
      it(`${theme} --${state} on --${state}-bg passes AA`, () => {
        expect(contrastRatio(hex(tokens, `--${state}`), hex(tokens, `--${state}-bg`))).toBeGreaterThanOrEqual(4.5);
      });
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

  it("radii are the reference's 1/2/3px, not a multiplied cascade", () => {
    const theme = readTokens(css.replace(/^@theme inline \{/m, ":root {"), ":root");
    expect(theme["--radius-sm"]).toBe("1px");
    expect(theme["--radius-md"]).toBe("2px");
    expect(theme["--radius-lg"]).toBe("3px");
    expect(theme["--radius-xl"]).toBe("3px");
  });
});
