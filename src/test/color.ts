/**
 * oklch() → sRGB → WCAG contrast, for the token guard in globals.test.ts.
 * Björn Ottosson's Oklab matrices. Lives in src/test/ because nothing ships it:
 * its only job is to stop the palette's two contrast corrections being reverted
 * by a later "restore fidelity against the reference" pass.
 */
export function parseOklch(value: string): [number, number, number] {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(value);
  if (!m) throw new Error(`not an oklch() value: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function linToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function srgbToLin(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function oklchToHex(L: number, C: number, H: number): string {
  const h = (H * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const to = (x: number) =>
    Math.max(0, Math.min(255, Math.round(linToSrgb(x) * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${(to(r) + to(g) + to(b)).toUpperCase()}`;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => srgbToLin(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Custom properties declared in one top-level block of a CSS source. */
export function readTokens(css: string, block: ":root" | ".dark"): Record<string, string> {
  // Anchored at line start and closed by a brace at column 0, so a nested block
  // cannot swallow the match.
  const re = new RegExp(`^\\${block}\\s*\\{([\\s\\S]*?)^\\}`, "m");
  const m = re.exec(css);
  if (!m) throw new Error(`no ${block} block in the stylesheet`);
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const d = /^\s*(--[\w-]+)\s*:\s*([^;]+);/.exec(line);
    if (d) out[d[1]] = d[2].trim();
  }
  return out;
}
