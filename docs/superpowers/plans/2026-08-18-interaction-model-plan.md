# Interaction model + visual port (phase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the reference design system app-wide, then rebuild `/affordability` as an answer-first screen with depth, disclosure, deep links, honest derived defaults and per-figure provenance — surfacing the 22 engine results the page currently throws away — and add `/sources` as the target those provenance marks link to.

**Architecture:** Four seams, built bottom-up so each is testable alone. (1) A **token layer** in `src/app/globals.css` — the reference palette, semantic state triples, type scale, geometry and fonts — restyling the existing surface in place before anything is rebuilt, so a visual regression is attributable to one commit. (2) A **pure lib layer**: `number-format`, `sections`, `storage`, `resolve-inputs`, `scale`, `affordability-view` — no React, fully unit-tested. (3) **Small generic components**: `NumberField`, `DisclosureSection`, `DepthControl`, `JumpRail`, `Provenance`. (4) The **page**, which is composition only: it reads `src/domain/` for every number, `src/lib/` for every derived state and geometry, and `messages/*.json` for every string.

**Tech Stack:** Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind v4 · shadcn/ui (Radix, Nova preset) · next-intl (en/fr) · next-themes · Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-08-18-interaction-model-design.md`
**Companions:** `docs/superpowers/specs/2026-08-18-design-parity-inventory.md` (the audit), `docs/superpowers/specs/2026-08-18-visual-system-port.md` (the extracted design system)

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Every page route stays prerendered** (`●` in the `next build` route table). `scripts/verify-prerender` enforces it and must be run manually after each page lands — it is NOT in `scripts/check`, because `next build` takes a per-project lock and `scripts/check` runs from a post-edit hook.
- **`useSearchParams` is not used anywhere in this work.** The hash is read from `window.location.hash` in an effect.
- **`/sources` is a server component and must call `setRequestLocale(locale)`.** Omitting it silently makes the route dynamic.
- **`src/domain/` is the source of truth for every number.** No calculation in a component, no province rule inline. A screen needing a value the engine does not expose gets it added to the engine, with a test.
- **No hardcoded UI copy.** Every string goes through `messages/en.json` / `messages/fr.json`, read via `useTranslations()` / `getTranslations()`.
- **Copy is mined, not written.** Task 8 carries the exact reference-key → message-key mapping; en is index `0` and fr is index `1` of each reference array. `/sources` is the one exception — that copy does not exist in the reference and is written fresh.
- **The unverified-placeholder disclosure stays visible**, in its current wording (`Affordability.unverifiedFlag`, `lastVerified`, `noCityData`), on every screen that renders a jurisdiction figure. Nothing here makes any figure verified; no new copy may imply it.
- **`src/middleware.ts` stays `middleware.ts`.** Next 16 renamed it to `proxy.ts`; `@opennextjs/cloudflare` hard-refuses a Node-runtime proxy, so "fixing" it breaks `scripts/ship`.
- **`design-reference/**` is reference material.** Never import from it in `src/`.
- **Do not churn:** `src/domain/`'s 14 jurisdiction files, `useSharedState`'s allowlist model, `src/lib/shared-inputs.ts` as the single registry (add keys; never a second mechanism), `src/i18n/routing.ts`'s no-alias/no-JSON constraint.
- **Phase boundaries.** `pathnames` and the nav shell are phase 1.5. The remaining engine port (`scenario`, `rentVsBuy`, `amortization`, `marginalRate`, `waterfall`, `glidePath`, `hbpPlay`) is phase 2. Home is phase 3. Do not pull them forward.
- Every task ends with `scripts/check` passing before commit. Conventional commits. Branch `claude/interaction-model` (already checked out); never push to `main`.
- **The two corrections that must not be reverted**, guarded by tests in Task 1:
  - `--tx3` light `#888C92` → **`#676A6F`**; dark `#767B82` → **`#898D93`** (the reference values fail WCAG AA at the sizes they are used at).
  - **Form controls have a 16px floor** — the control itself, not its label or unit suffix.

---

## Challenges to the spec

The brief invites disagreement. Seven items, in descending order of consequence. **Items 1 and 2 were put to the user and both were accepted on 2026-08-19**; the task bodies below already implement them. Items 3–7 are implementation calls this plan simply takes.

### 1. `income2` should be *unknown*, not a derived constant — **ACCEPTED 2026-08-19**

Spec §6.1 gives `income2` a constant derived default (`DEFAULT_INCOME_2`), and §4.4 lists an "add a second applicant" affordance. Those disagree: if `income2` derives to a real number, the second applicant is already present and the affordance can only ever mean *remove*.

The reference does default to a dual-income household (`inc1: 75000, inc2: 45000, app2: true`), but that assertion **roughly doubles every new visitor's headline number** from a fact they never gave — the same failure the spec identifies for `funds` and rejects there.

**Recommendation:** make `income2` a third *unknown* alongside `funds` and `save`. `null` renders the "Add a second applicant" control; clicking it writes `DEFAULT_INCOME_2` as an explicit edit. The default household is one income. This also removes any need for an `app2` boolean, keeping the registry additions exactly as the spec lists them.

**If rejected:** `income2` derives to `DEFAULT_INCOME_2 = 45000`, and an `app2: boolean` key is added to the registry (a deviation the spec's key list does not carry).

### 2. `comfortCeiling` belongs in `isPersonalised` — **ACCEPTED 2026-08-19**

Spec §6.3 lists incomes, the four debts and `funds`. A user who states their monthly all-in ceiling has given us their own limit, and it is the single input that drives `comfort` — the headline figure. Leaving it out means that user still reads `typical` over a number that is entirely theirs.

**Recommendation:** add `comfortCeiling`. Not `price`: price is the target being tested, not the household's situation.

### 3. Radii are set explicitly, not derived by multiplication

`globals.css` derives `--radius-sm` … `--radius-4xl` from `--radius` by multiplication. At `--radius: 3px` that yields `rounded-lg: 3px`, `rounded-xl: 4.2px`, `rounded-sm: 1.8px` — none of which are the reference's 1 / 2 / 3. The visual-system doc names the cascade as a fidelity risk; the fix is to stop cascading. The whole `--radius-*` scale is written out: `sm: 1px` (bars, tracks), `md: 2px` (inputs, chips, cells), `lg/xl: 3px` (cards, panels, buttons), `2xl+: 4px`.

### 4. Fonts come from `next/font/google`, not vendored `.woff2`

Spec §10 says "self-hosted under `src/app/fonts/`". `next/font/google` **is** self-hosting: Next downloads the files at build time and serves them as same-origin static assets — "no requests are sent to Google by the browser" (`node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`). It gives latin subsetting, `font-display: swap` and preload for free, and the app already does exactly this for Geist. Vendoring eight binaries buys no runtime difference and adds a manual subsetting job.

Cost, stated: the production build needs network access to fetch the font files. That is already true today.

### 5. The 16px guard is a CSS-source test, not a computed-style test

The visual-system doc asks for "a test asserting the computed `font-size` of every form control is ≥16px". jsdom has no CSS engine and no Tailwind — `getComputedStyle` on a `class="text-base"` element returns nothing useful. Replaced with a strictly stronger two-part guard (Task 1 + Task 3):

- `globals.css` is parsed in a test; `--control-font-size` is asserted ≥16px, and the `--tx3` values are converted from `oklch()` to sRGB and asserted at ≥4.5:1 against `--s0`, `--s1` and `--s2` **in both themes**. That guards the contrast correction numerically rather than by string equality, so a later "restore fidelity" pass fails with the actual ratio in the message.
- Component tests assert every form control (`NumberField`, `Input`, `SelectTrigger`) carries the shared `control` class that consumes that token.

### 6. `federal.contractRate: 4.29` becomes unread — left alone

Once `contractRate` derives from `federal.rates.insured` / `.uninsured`, the `contractRate` field on `FederalRules` has no reader. Removing it is domain churn this work is told not to do. It stays, and Task 12 notes it on issue [#3](https://github.com/vivitali/norma/issues/3).

### 7. Two of the spec's three worked `oklch()` examples are wrong — regenerated

The visual-system doc offers three conversions "for checking". Round-tripped back to sRGB with the standard Oklab matrices:

| Spec value | Renders as | Should be |
|---|---|---|
| `#F7F5F1` → `oklch(0.9694 0.0058 84.57)` | `#F7F5F1` ✅ | — |
| `#22375C` → `oklch(0.3216 0.0684 258.36)` | **`#1C3356`** ❌ | `oklch(0.3389 0.0708 261.03)` |
| `#1A6B45` → `oklch(0.4523 0.0967 156.94)` | **`#18663F`** ❌ | `oklch(0.4699 0.0983 158.04)` |

`#1C3356` is a visibly darker, duller navy than the accent the system is built around. Taking those examples as a template would have shifted the whole palette. This is precisely why the spec says conversions are "generated and verified round-trip at implementation time rather than hand-copied" — Task 1 carries the generated table, and its test round-trips every token back to the reference hex.

The `--tx3` corrections are unaffected: recomputing contrast from the corrected hex reproduces the spec's audit exactly (light 4.99 / 5.43 / 4.60 on `--s0` / `--s1` / `--s2`; dark 5.53 / 5.12 / 4.62).

**Not challenged, explicitly:** the `funds`/`save` *unanswered* state. The handoff flags it as the assistant's own call and untested by the user. It is right, and the reason is the one in item 1: the alternative asserts a savings balance on the user's behalf. It also needs no new copy — when `funds` is answered but `save` is not, the reference already has the `monthsAway == null` branch, which falls back to `ckCsNo`.

---

## File structure

**New — pure lib (no React):**

| File | Responsibility |
|---|---|
| `src/lib/number-format.ts` | Locale separators, parse, format. Formatting only; `money()` stays in the engine. |
| `src/lib/sections.ts` | `SectionDef` / `DisclosureDef` types, the Affordability registry, `visibleSections()`, `isDisclosureOpen()`. |
| `src/lib/storage.ts` | `norma.inputs.v2`, the field schema, `coerce()`, `migrateV1()`, read/write. |
| `src/lib/resolve-inputs.ts` | `resolveInputs()`, the named default constants, `isPersonalised()`. |
| `src/lib/scale.ts` | Presentation geometry: gap band, gauges, impact width, marker alignment. Percentages, never money. |
| `src/lib/affordability-view.ts` | The verdict state machine and the three check states. Policy over engine output; no arithmetic. |
| `src/lib/tone.ts` | The five semantic tones and their token classes, in one place. The lib layer must not import from `src/components/`. |
| `src/test/color.ts` | `oklch()` → sRGB → relative luminance → WCAG contrast, for the token guard. |

**New — components:**

| File | Responsibility |
|---|---|
| `src/components/number-field.tsx` | The one number input. `type="text"`, `inputMode="decimal"`, null-for-empty, blur-formats. |
| `src/components/disclosure-section.tsx` | One disclosure: heading + `aria-expanded`/`aria-controls` toggle + panel. |
| `src/components/depth-control.tsx` | The three-way radiogroup, roving tabindex, arrow keys. |
| `src/components/jump-rail.tsx` | Real anchors that also move focus to the target heading. |
| `src/components/provenance.tsx` | The `rule` / `estimate` mark, linking to `/sources`. |
| `src/components/affordability/*.tsx` | Verdict · StatStrip · Checks · GapBand · ImpactRow · InputGroups · MathColumns · Gauges. |
| `src/components/sources-content.tsx` | Client half of `/sources` (needs the selected jurisdiction). |

**New — hooks / routes:**

| File | Responsibility |
|---|---|
| `src/hooks/use-hash-target.ts` | `window.location.hash` in an effect + `hashchange`. Never `useSearchParams`. |
| `src/hooks/use-depth.ts` | The global persisted depth, on `useSharedState`. |
| `src/hooks/use-previous-result.ts` | Prior `AffordabilityResult`, for the delta chips. |
| `src/app/[locale]/sources/page.tsx` | Server component. `setRequestLocale(locale)`. |

**Modified:** `src/app/globals.css` (replaced token layer) · `src/app/[locale]/layout.tsx` (fonts) · `src/lib/shared-inputs.ts` (v2 shape + keys) · `src/hooks/use-shared-state.ts` (delegates to `storage.ts`) · `src/domain/engine.ts` (four new results + `defaultContractRate`) · `src/components/ui/{input,card,button,select,switch}.tsx` (token-driven restyle) · `src/components/{app-header,home-content,jurisdiction-picker,locale-switcher,theme-toggle}.tsx` (restyle in place) · `src/app/[locale]/affordability/page.tsx` (rebuilt) · `messages/{en,fr}.json` · `CLAUDE.md`.

---

## Task 1: The visual system port — tokens, fonts, geometry, and the guard that keeps them

Lands first and on its own, so its effect is visible in isolation and a regression is attributable (spec §10.1). It restyles the existing header, Home, jurisdiction picker, locale switcher and theme toggle **in place** — it does not redesign them.

**Files:**
- Create: `src/test/color.ts`
- Create: `src/app/globals.test.ts`
- Modify: `src/app/globals.css` (token layer replaced)
- Modify: `src/app/[locale]/layout.tsx:2-21` (fonts)
- Modify: `src/components/ui/input.tsx`, `src/components/ui/card.tsx`
- Modify: `src/components/app-header.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties consumed by every later task — surfaces `--background --card --surface-sunken`, borders `--border --border-hairline --input`, text `--foreground --muted-foreground --text-faint`, accent `--primary --ring --accent-surface --accent-border`, and four semantic triples `--pass/--pass-bg/--pass-border`, `--caution/--caution-bg/--caution-border`, `--blocked/--blocked-bg/--blocked-border`, `--band/--band-bg/--band-border`, each exposed to Tailwind as `--color-*`. Utility classes `.figure` (mono, tabular lining numerals) and `.micro` (the uppercase micro-label) and `.control` (the 16px form-control floor). From `src/test/color.ts`: `parseOklch(s: string): [number, number, number]`, `oklchToHex(L: number, C: number, H: number): string`, `contrastRatio(hexA: string, hexB: string): number`, `readTokens(css: string, block: ":root" | ".dark"): Record<string, string>`.

- [ ] **Step 1: Write the colour helper `src/test/color.ts`**

```ts
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
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
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
  // Anchored at line start so `@theme inline`'s own `:root`-less block cannot match,
  // and non-greedy to the first closing brace at column 0.
  const re = new RegExp(`^\\${block === ":root" ? ":root" : ".dark"}\\s*\\{([\\s\\S]*?)^\\}`, "m");
  const m = re.exec(css);
  if (!m) throw new Error(`no ${block} block in the stylesheet`);
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const d = /^\s*(--[\w-]+)\s*:\s*([^;]+);/.exec(line);
    if (d) out[d[1]] = d[2].trim();
  }
  return out;
}
```

- [ ] **Step 2: Write the failing token guard `src/app/globals.test.ts`**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, oklchToHex, parseOklch, readTokens } from "@/test/color";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
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
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run src/app/globals.test.ts`
Expected: FAIL — `no :root block` is not the failure; the tokens exist but hold stock shadcn greyscale, so every round-trip assertion fails with `#FFFFFF` / `#252525`-class values, and `--control-font-size` / `--surface-sunken` / the semantic triples are `undefined`.

- [ ] **Step 4: Replace the token layer in `src/app/globals.css`**

Keep the three `@import` lines and `@custom-variant dark` as they are. Replace the `@theme inline`, `:root` and `.dark` blocks with the following, and extend `@layer base`. Values are generated, round-trip-verified conversions of the reference palette — **not** the spec's three hand-written examples, two of which are wrong (challenge 7).

```css
@theme inline {
  /* surfaces, text, borders, accent — shadcn's own token names, reference values */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--foreground);
  --color-popover: var(--card);
  --color-popover-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--muted);
  --color-secondary-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--muted);
  --color-accent-foreground: var(--foreground);
  --color-destructive: var(--blocked);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* tokens with no shadcn equivalent */
  --color-surface-sunken: var(--surface-sunken);
  --color-border-hairline: var(--border-hairline);
  --color-text-faint: var(--text-faint);
  --color-accent-surface: var(--accent-surface);
  --color-accent-border: var(--accent-border);

  /* four semantic state triples. "caution" is the state of the two most common
     verdicts (over, shortCash) and was inexpressible in the stock theme. */
  --color-pass: var(--pass);
  --color-pass-bg: var(--pass-bg);
  --color-pass-border: var(--pass-border);
  --color-caution: var(--caution);
  --color-caution-bg: var(--caution-bg);
  --color-caution-border: var(--caution-border);
  --color-blocked: var(--blocked);
  --color-blocked-bg: var(--blocked-bg);
  --color-blocked-border: var(--blocked-border);
  --color-band: var(--band);
  --color-band-bg: var(--band-bg);
  --color-band-border: var(--band-border);

  --font-sans: var(--font-plex-sans), system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;
  --font-heading: var(--font-plex-sans), system-ui, sans-serif;

  /* Written out, not derived from --radius by multiplication: the reference uses
     1px on bars and tracks, 2px on inputs and chips, 3px on cards and panels.
     A cascade from 3px gives 1.8 / 2.4 / 4.2, which is none of those. */
  --radius-sm: 1px;
  --radius-md: 2px;
  --radius-lg: 3px;
  --radius-xl: 3px;
  --radius-2xl: 4px;
  --radius-3xl: 4px;
  --radius-4xl: 4px;
}

:root {
  --radius: 3px;

  --background: oklch(0.9706 0.0057 84.57);       /* #F7F5F1 warm cream, not white */
  --card: oklch(1.0000 0.0000 89.88);             /* #FFFFFF */
  --muted: oklch(0.9435 0.0099 87.47);            /* #EFECE5 */
  --surface-sunken: oklch(0.9101 0.0141 88.69);   /* #E5E1D7 */
  --border: oklch(0.8801 0.0159 86.43);           /* #DCD7CC */
  --border-hairline: oklch(0.9256 0.0128 86.83);  /* #EAE6DD */
  --input: oklch(0.8065 0.0208 84.59);            /* #C6BFB1 */
  --foreground: oklch(0.2126 0.0067 258.37);      /* #17191C */
  --muted-foreground: oklch(0.4658 0.0095 253.92);/* #565A5F */
  /* CORRECTED, do not revert: the reference's #888C92 is 2.86:1 on --muted and
     is used at 9.5-11.5px, where AA-large does not apply. See globals.test.ts. */
  --text-faint: oklch(0.5234 0.0087 260.73);      /* #676A6F (ref #888C92) */
  --primary: oklch(0.3389 0.0708 261.03);         /* #22375C */
  --primary-foreground: oklch(1.0000 0.0000 89.88);
  --ring: oklch(0.4756 0.0960 259.81);            /* #3B5C92 */
  --accent-surface: oklch(0.9416 0.0121 259.82);  /* #E7ECF4 */
  --accent-border: oklch(0.8512 0.0295 259.59);   /* #C3CFE2 */

  --pass: oklch(0.4699 0.0983 158.04);            /* #1A6B45 */
  --pass-bg: oklch(0.9412 0.0158 160.61);         /* #E3EFE8 */
  --pass-border: oklch(0.8656 0.0378 161.41);     /* #BEDBCB */
  --caution: oklch(0.5023 0.1033 73.04);          /* #87590A */
  --caution-bg: oklch(0.9506 0.0253 86.87);       /* #F6EEDC */
  --caution-border: oklch(0.8705 0.0521 87.40);   /* #E3D3AE */
  --blocked: oklch(0.4376 0.1340 24.57);          /* #8D2A2A */
  --blocked-bg: oklch(0.9393 0.0166 26.65);       /* #F6E7E5 */
  --blocked-border: oklch(0.8474 0.0381 26.09);   /* #E5C4C0 */
  --band: oklch(0.4575 0.0391 244.66);            /* #455A6C */
  --band-bg: oklch(0.9435 0.0076 241.67);         /* #E8EDF1 */
  --band-border: oklch(0.8611 0.0173 242.46);     /* #C8D3DC */

  /* The one deviation from "port the scale as measured": iOS Safari zooms the
     viewport when a control under 16px takes focus. Labels, units and helper
     text keep their measured sizes. */
  --control-font-size: 1rem;
}

.dark {
  --background: oklch(0.1904 0.0069 258.37);      /* #121417 */
  --card: oklch(0.2250 0.0090 255.61);            /* #191C20 */
  --muted: oklch(0.2625 0.0110 254.03);           /* #21252A */
  --surface-sunken: oklch(0.3028 0.0129 253.01);  /* #2A2F35 */
  --border: oklch(0.3230 0.0142 256.78);          /* #2F343B */
  --border-hairline: oklch(0.2835 0.0124 258.37); /* #262A30 */
  --input: oklch(0.3804 0.0158 255.61);           /* #3D434B */
  --foreground: oklch(0.9342 0.0070 88.64);       /* #EBE9E4 */
  --muted-foreground: oklch(0.7294 0.0104 252.84);/* #A3A8AE */
  /* CORRECTED, do not revert: reference #767B82 is 3.61:1 on --muted. */
  --text-faint: oklch(0.6420 0.0101 258.35);      /* #898D93 (ref #767B82) */
  --primary: oklch(0.7592 0.0740 256.94);         /* #93B3E0 */
  --primary-foreground: oklch(0.1904 0.0069 258.37);
  --ring: oklch(0.8235 0.0590 258.07);            /* #AEC7EC */
  --accent-surface: oklch(0.2648 0.0267 253.32);  /* #1C2632 */
  --accent-border: oklch(0.3471 0.0373 253.36);   /* #2C3B4D */

  --pass: oklch(0.7518 0.1096 160.38);            /* #6AC497 */
  --pass-bg: oklch(0.2513 0.0256 169.94);         /* #152620 */
  --pass-border: oklch(0.3672 0.0482 161.69);     /* #264737 */
  --caution: oklch(0.7717 0.1267 79.90);          /* #DFAB4C */
  --caution-bg: oklch(0.2555 0.0278 85.50);       /* #292213 */
  --caution-border: oklch(0.3540 0.0461 86.85);   /* #463A1E */
  --blocked: oklch(0.7408 0.1135 20.13);          /* #EA8D8D */
  --blocked-bg: oklch(0.2358 0.0274 19.32);       /* #2A1919 */
  --blocked-border: oklch(0.3305 0.0447 19.73);   /* #4A2C2C */
  --band: oklch(0.7601 0.0330 243.83);            /* #A0B4C5 */
  --band-bg: oklch(0.2440 0.0169 248.52);         /* #1A2128 */
  --band-border: oklch(0.3314 0.0245 248.57);     /* #2C3742 */
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-size: 12px;
    line-height: 1.5;
  }
  html {
    @apply font-sans;
  }
  /* The reference separates surfaces with borders and background steps, never
     elevation: one shadow token, on one of eight screens. Stock shadcn card
     shadows and rings come off rather than sitting alongside. */
  [data-slot="card"] {
    @apply ring-0 border border-border;
  }
  /* Ports directly from the reference and is better than shadcn's default ring
     for this system. */
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
    border-radius: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  }
}

@layer components {
  /* Applied once, rather than ad-hoc `tabular-nums` on individual spans. */
  .figure {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums lining-nums;
  }
  /* The system's signature: 89 uses across the eight reference screens. */
  .micro {
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  /* The 16px floor, in one place so the guard in globals.test.ts covers every
     control that opts into it. */
  .control {
    font-size: var(--control-font-size);
  }
}

@keyframes ab-pulse {
  from { background: var(--accent-surface); }
  to { background: transparent; }
}
.ab-pulse {
  animation: ab-pulse 0.7s ease-out;
}
```

- [ ] **Step 5: Run the guard — it must pass**

Run: `npx vitest run src/app/globals.test.ts`
Expected: PASS, all round-trips and all contrast assertions.

- [ ] **Step 6: Swap the fonts in `src/app/[locale]/layout.tsx`**

Replace the two `Geist` imports and constants with IBM Plex. `next/font/google` self-hosts: the files are downloaded at build time and served same-origin, so there is no third-party request on first paint. Only the four weights the system actually uses.

```tsx
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
```

and on `<html>`: `className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}`.

Note the latent bug this fixes: `@theme inline` declared `--font-sans: var(--font-sans)` — self-referential, so it never resolved — while the layout was setting `--font-geist-sans`.

- [ ] **Step 7: Restyle the shadcn primitives through their class surface**

`src/components/ui/input.tsx` — swap `rounded-lg` → `rounded-md` (2px), drop `md:text-sm` (it would take the control below the 16px floor on desktop, which is exactly the regression the guard exists to prevent), add `control`, and give it the reference's heights:

```tsx
"control h-11 sm:h-[38px] w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-1 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
```

`src/components/ui/card.tsx` — `rounded-xl` stays (now 3px) and `ring-1 ring-foreground/10` → `border border-border`. Leave the rest.

Do **not** fork or reach into Radix internals for `Select`, `Switch` or `Button` — they inherit the tokens.

- [ ] **Step 8: Restyle `AppHeader` in place**

The header strip is `--muted` (`--s2`) with a bottom border, the wordmark is weight 600. Structure and children are unchanged — the nav shell is phase 1.5.

```tsx
<header className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
  <Link href="/" className="text-[13px] font-semibold tracking-tight">
```

- [ ] **Step 9: Run the whole gate and the prerender guard**

Run: `scripts/check`
Expected: PASS — existing header/home/affordability tests are structural, not visual, so none should break. If `src/components/app-header.test.tsx` asserts a class, update the assertion; if it asserts a role or name, it should be untouched.

Run: `scripts/verify-prerender`
Expected: PASS — all four page routes (`/en`, `/fr`, `/en/affordability`, `/fr/affordability`) prerendered.

- [ ] **Step 10: Commit**

```bash
git add src/app/globals.css src/app/globals.test.ts src/test/color.ts \
        "src/app/[locale]/layout.tsx" src/components/ui/input.tsx \
        src/components/ui/card.tsx src/components/app-header.tsx
git commit -m "feat: port the reference visual system app-wide

Palette, four semantic state triples, geometry and IBM Plex replace stock
shadcn greyscale. Caution was previously inexpressible and is the state of
the two most common verdicts.

Two deliberate corrections, guarded by globals.test.ts: --text-faint moves
to #676A6F/#898D93 (the reference values fail WCAG AA at the 9.5-11.5px
sizes they are used at), and form controls have a 16px floor (iOS Safari
zooms below it).

Radii are written out rather than multiplied from --radius, and the oklch
conversions are generated and round-trip-verified -- two of the three
worked examples in the visual-system spec do not round-trip."
```

---

## Task 2: `number-format` + `NumberField`

The highest-frequency interaction in the product, and currently the most broken: `e.target.valueAsNumber` turns a half-typed or French-formatted entry into `0` silently, and `money()` itself emits U+202F thousands separators in French — so a French user re-typing a figure the app just showed them gets zero.

**Files:**
- Create: `src/lib/number-format.ts`, `src/lib/number-format.test.ts`
- Create: `src/components/number-field.tsx`, `src/components/number-field.test.tsx`

**Interfaces:**
- Consumes: `.control` from Task 1.
- Produces:
  - `separatorsFor(locale: string): { group: string; decimal: string }`
  - `parseLocaleNumber(raw: string, locale: string): number | null`
  - `formatLocaleNumber(n: number, locale: string, dp?: number): string`
  - `<NumberField>` with props `{ id: string; label: string; value: number | null; placeholder?: number; onCommit: (v: number | null) => void; min?: number; max?: number; step?: number; dp?: number; suffix?: string; describedBy?: string; }`. `value === null` renders `placeholder` as the visible text in a "derived" style; committing an empty string calls `onCommit(null)`.

- [ ] **Step 1: Write the failing test `src/lib/number-format.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { formatLocaleNumber, parseLocaleNumber, separatorsFor } from "./number-format";

describe("separatorsFor", () => {
  // Derived from Intl.NumberFormat().formatToParts, never hardcoded: fr-CA groups
  // with U+202F (narrow no-break space) and that is what money() emits.
  it("reads en-CA separators", () => {
    expect(separatorsFor("en-CA")).toEqual({ group: ",", decimal: "." });
  });
  it("reads fr-CA separators", () => {
    expect(separatorsFor("fr-CA")).toEqual({ group: " ", decimal: "," });
  });
});

describe("parseLocaleNumber", () => {
  it("parses an en-CA grouped figure", () => {
    expect(parseLocaleNumber("350,000", "en-CA")).toBe(350000);
  });
  it("parses an en-CA decimal", () => {
    expect(parseLocaleNumber("350,000.50", "en-CA")).toBe(350000.5);
  });
  it("parses a fr-CA figure grouped with U+202F", () => {
    expect(parseLocaleNumber("350 000", "fr-CA")).toBe(350000);
  });
  it("parses a fr-CA decimal grouped with U+202F", () => {
    expect(parseLocaleNumber("350 000,50", "fr-CA")).toBe(350000.5);
  });
  it("tolerates every space the formatters emit", () => {
    // U+00A0, U+2009 and a plain space all appear in the wild for the same figure.
    for (const sp of [" ", " ", " "]) {
      expect(parseLocaleNumber(`350${sp}000`, "fr-CA")).toBe(350000);
    }
  });
  it("strips a currency symbol in either position", () => {
    expect(parseLocaleNumber("$350,000", "en-CA")).toBe(350000);
    expect(parseLocaleNumber("350 000 $", "fr-CA")).toBe(350000);
  });
  it("reads a minus sign, including the typographic one money() emits", () => {
    expect(parseLocaleNumber("-340", "en-CA")).toBe(-340);
    expect(parseLocaleNumber("− 340", "en-CA")).toBe(-340);
  });
  it("returns null for empty, not 0", () => {
    // "not told" and "told zero" are different facts and drive different UI.
    expect(parseLocaleNumber("", "en-CA")).toBeNull();
    expect(parseLocaleNumber("   ", "en-CA")).toBeNull();
  });
  it("returns null for a partial entry rather than 0", () => {
    expect(parseLocaleNumber("-", "en-CA")).toBeNull();
    expect(parseLocaleNumber(".", "en-CA")).toBeNull();
    expect(parseLocaleNumber("abc", "en-CA")).toBeNull();
  });
});

describe("formatLocaleNumber", () => {
  it("groups in en-CA", () => {
    expect(formatLocaleNumber(350000, "en-CA")).toBe("350,000");
  });
  it("groups in fr-CA with U+202F", () => {
    expect(formatLocaleNumber(350000, "fr-CA")).toBe("350 000");
  });
  it("round-trips through parse in both locales", () => {
    for (const loc of ["en-CA", "fr-CA"]) {
      expect(parseLocaleNumber(formatLocaleNumber(1234567.89, loc, 2), loc)).toBe(1234567.89);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/number-format.test.ts`
Expected: FAIL — `Failed to resolve import "./number-format"`.

- [ ] **Step 3: Write `src/lib/number-format.ts`**

```ts
/**
 * Locale-aware number parsing and formatting for input controls. Formatting only:
 * money() stays in the engine, because currency placement is a domain convention
 * ("- $340" in en, "- 340 $" in fr) and two screens must never disagree about it.
 *
 * Separators come from Intl, never from a table: fr-CA groups with U+202F, which
 * is exactly what money() emits at engine.ts:62 -- so a French user re-typing a
 * figure the app just showed them must not get 0.
 */

/** Every space character a formatter may emit between digit groups. */
const SPACES = /[\s   ]/g;
/** Both minus signs: ASCII, and the U+2212 money() puts in front of a negative. */
const MINUS = /[−–—]/g;

export function separatorsFor(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  return { group, decimal };
}

export function parseLocaleNumber(raw: string, locale: string): number | null {
  const { group, decimal } = separatorsFor(locale);
  let s = raw.replace(MINUS, "-").replace(SPACES, "");
  if (s === "") return null;
  // Drop the currency symbol and any group separator, then normalise the decimal
  // mark. Order matters: in fr-CA the group separator is whitespace, already gone.
  s = s.split(group).join("");
  if (decimal !== ".") s = s.split(decimal).join(".");
  s = s.replace(/[^\d.-]/g, "");
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatLocaleNumber(n: number, locale: string, dp = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}
```

- [ ] **Step 4: Run it — must pass**

Run: `npx vitest run src/lib/number-format.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing component test `src/components/number-field.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { NumberField } from "./number-field";

describe("NumberField", () => {
  it("is a text input with a decimal keypad, not type=number", () => {
    // type=number brings spinners, valueAsNumber's NaN, and no way to hold a
    // locale-formatted string mid-edit.
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={vi.fn()} />);
    const input = screen.getByLabelText("Price");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "decimal");
  });

  it("carries the 16px control class", () => {
    renderWithIntl(<NumberField id="price" label="Price" value={1} onCommit={vi.fn()} />);
    expect(screen.getByLabelText("Price").className).toContain("control");
  });

  it("shows the value formatted while unfocused", () => {
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={vi.fn()} />);
    expect(screen.getByLabelText("Price")).toHaveValue("350,000");
  });

  it("shows raw digits while focused, so typing is not fought", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={vi.fn()} />);
    const input = screen.getByLabelText("Price");
    await user.click(input);
    expect(input).toHaveValue("350000");
  });

  it("commits on blur, not on every keystroke", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={onCommit} />);
    const input = screen.getByLabelText("Price");
    await user.clear(input);
    await user.type(input, "425000");
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(425000);
  });

  it("commits null when blanked, not 0", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={onCommit} />);
    await user.clear(screen.getByLabelText("Price"));
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(null);
  });

  it("does not commit 0 for a partial entry", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Price" value={null} placeholder={400000} onCommit={onCommit} />);
    const input = screen.getByLabelText("Price");
    await user.type(input, "-");
    await user.tab();
    expect(onCommit).not.toHaveBeenCalledWith(0);
  });

  it("renders the derived placeholder when the value is null", () => {
    // "Absent means derived": an untouched field still shows a real, correct
    // number -- the city benchmark -- rather than an empty box.
    renderWithIntl(<NumberField id="price" label="Price" value={null} placeholder={400000} onCommit={vi.fn()} />);
    expect(screen.getByLabelText("Price")).toHaveValue("400,000");
  });

  it("clamps to min on commit, so negative income is impossible", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="income" label="Income" value={70000} min={0} onCommit={onCommit} />);
    const input = screen.getByLabelText("Income");
    await user.clear(input);
    await user.type(input, "-5000");
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  it("parses a French figure it was just shown", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(
      <NumberField id="price" label="Prix" value={350000} onCommit={onCommit} />,
      { locale: "fr" },
    );
    const input = screen.getByLabelText("Prix");
    await user.clear(input);
    await user.type(input, "350 000");
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(350000);
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `npx vitest run src/components/number-field.test.tsx`
Expected: FAIL — `Failed to resolve import "./number-field"`.

- [ ] **Step 7: Write `src/components/number-field.tsx`**

```tsx
"use client";

import { useEffect, useId, useState } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLocaleNumber, parseLocaleNumber } from "@/lib/number-format";
import { cn } from "@/lib/utils";

const INTL_LOCALES: Record<string, string> = { en: "en-CA", fr: "fr-CA" };

export interface NumberFieldProps {
  id: string;
  label: string;
  /** null means "not told". The field then shows `placeholder`, styled as derived. */
  value: number | null;
  /** The derived default, shown when `value` is null. */
  placeholder?: number;
  onCommit: (value: number | null) => void;
  min?: number;
  max?: number;
  dp?: number;
  /** Rendered beside the control, at its own (smaller) size -- not inside it. */
  suffix?: string;
  describedBy?: string;
  className?: string;
}

/**
 * The one number input in the product.
 *
 * Formatted on blur, raw while focused: fighting a formatter mid-keystroke is why
 * grouped inputs are usually worse than plain ones. Empty commits null rather than
 * 0, so blanking a derivable field returns it to its derived default instead of
 * asserting the user earns nothing.
 */
export function NumberField({
  id, label, value, placeholder, onCommit, min, max, dp = 0, suffix, describedBy, className,
}: NumberFieldProps) {
  const locale = useLocale();
  const intlLocale = INTL_LOCALES[locale] ?? "en-CA";
  const shown = value ?? placeholder ?? null;
  const [draft, setDraft] = useState<string | null>(null);
  const suffixId = useId();

  // Re-sync when the resolved value changes underneath us (jurisdiction change,
  // a derived default moving) -- but never while the user is mid-edit.
  useEffect(() => {
    if (draft === null) return;
  }, [draft]);

  const display =
    draft !== null ? draft : shown === null ? "" : formatLocaleNumber(shown, intlLocale, dp);

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = parseLocaleNumber(raw, intlLocale);
    if (parsed === null) {
      // An empty box means "not told". A partial entry ("-", ".") means the user
      // is not finished -- neither is a 0, and neither may become one.
      onCommit(raw.trim() === "" ? null : value);
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onCommit(next);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-[11.5px] font-semibold text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-baseline gap-1.5">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          className={cn("figure text-right font-medium", value === null && "text-muted-foreground")}
          value={display}
          aria-describedby={[describedBy, suffix ? suffixId : null].filter(Boolean).join(" ") || undefined}
          onFocus={() => setDraft(shown === null ? "" : String(shown))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setDraft(null);
          }}
        />
        {suffix ? (
          <span id={suffixId} className="text-[10.5px] text-text-faint">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
```

Delete the vestigial `useEffect` before committing — it was in the sketch and does nothing. (Named here rather than left for a reviewer to find.)

- [ ] **Step 8: Run the component test — must pass**

Run: `npx vitest run src/components/number-field.test.tsx`
Expected: PASS.

- [ ] **Step 9: Run the gate and commit**

Run: `scripts/check`

```bash
git add src/lib/number-format.ts src/lib/number-format.test.ts \
        src/components/number-field.tsx src/components/number-field.test.tsx
git commit -m "feat: add NumberField and locale-aware number parsing

Replaces valueAsNumber, which silently turned a half-typed or French
formatted entry into 0 -- money() emits U+202F thousands separators in
fr-CA, so re-typing a figure the app had just shown produced zero.

Empty now commits null rather than 0, which is what makes 'absent means
derived' representable at all."
```

---

## Task 3: Section registry, disclosure, depth control, jump rail, hash targeting

The machinery every later page inherits rather than reinvents (spec §2). Built and tested with a synthetic registry, before the Affordability page uses it.

**Files:**
- Create: `src/lib/sections.ts`, `src/lib/sections.test.ts`
- Create: `src/hooks/use-hash-target.ts`, `src/hooks/use-hash-target.test.tsx`
- Create: `src/components/disclosure-section.tsx`, `src/components/disclosure-section.test.tsx`
- Create: `src/components/depth-control.tsx`, `src/components/depth-control.test.tsx`
- Create: `src/components/jump-rail.tsx`, `src/components/jump-rail.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces:
  - `type Depth = 0 | 1 | 2`
  - `interface DisclosureDef { id: string; labelKey: string; openAtDepth: Depth | null }`
  - `interface SectionDef { id: string; labelKey: string; minDepth: Depth; disclosures?: readonly DisclosureDef[] }`
  - `const AFFORDABILITY_SECTIONS: readonly SectionDef[]`
  - `visibleSections(sections: readonly SectionDef[], depth: Depth): SectionDef[]`
  - `isDisclosureOpen(args: { def: DisclosureDef; depth: Depth; hashTarget: string | null; override: boolean | undefined }): boolean`
  - `useHashTarget(): string | null`
  - `<DisclosureSection id label open onToggle headingLevel? tone? summary? children>`
  - `<DepthControl value onChange label optionLabels>`
  - `<JumpRail links={{ id, label }[]} label>`

- [ ] **Step 1: Write the failing registry test `src/lib/sections.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { AFFORDABILITY_SECTIONS, isDisclosureOpen, visibleSections, type DisclosureDef } from "./sections";

describe("visibleSections", () => {
  it("hides the math section below depth 2", () => {
    // Depth sets PRESENCE for math: below 'the math' the section is not rendered
    // and does not appear in the jump rail.
    for (const depth of [0, 1] as const) {
      expect(visibleSections(AFFORDABILITY_SECTIONS, depth).map((s) => s.id)).toEqual([
        "verdict", "checks", "gap", "inputs",
      ]);
    }
  });
  it("shows the math section at depth 2", () => {
    expect(visibleSections(AFFORDABILITY_SECTIONS, 2).map((s) => s.id)).toEqual([
      "verdict", "checks", "gap", "inputs", "math",
    ]);
  });
});

describe("isDisclosureOpen", () => {
  const def: DisclosureDef = { id: "check-comfort", labelKey: "ckComfort", openAtDepth: 1 };
  const never: DisclosureDef = { id: "adv-income", labelKey: "cAdvanced", openAtDepth: null };

  it("is closed at 'the answer' by default", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: null, override: undefined })).toBe(false);
  });
  it("opens at or above its floor depth", () => {
    expect(isDisclosureOpen({ def, depth: 1, hashTarget: null, override: undefined })).toBe(true);
    expect(isDisclosureOpen({ def, depth: 2, hashTarget: null, override: undefined })).toBe(true);
  });
  it("never auto-opens when openAtDepth is null", () => {
    expect(isDisclosureOpen({ def: never, depth: 2, hashTarget: null, override: undefined })).toBe(false);
  });
  it("opens when the hash names it, at any depth", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: "check-comfort", override: undefined })).toBe(true);
    expect(isDisclosureOpen({ def: never, depth: 0, hashTarget: "adv-income", override: undefined })).toBe(true);
  });
  it("ignores a hash naming something else", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: "check-cash", override: undefined })).toBe(false);
  });
  it("lets an explicit open win at the lowest depth", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: null, override: true })).toBe(true);
  });
  it("lets an explicit CLOSE win at the highest depth", () => {
    // The reference's own defect: `open = openCheck === key || depth >= 1` pins
    // every check open at depth >= 1 and makes its toggle inoperative. The
    // override is two-way here, deliberately.
    expect(isDisclosureOpen({ def, depth: 2, hashTarget: null, override: false })).toBe(false);
  });
  it("lets an explicit close win over the hash", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: "check-comfort", override: false })).toBe(false);
  });
});

describe("AFFORDABILITY_SECTIONS", () => {
  it("has globally unique ids across sections and disclosures", () => {
    // The ids are URL hash targets and test handles; a collision silently makes
    // one of them unreachable.
    const ids = AFFORDABILITY_SECTIONS.flatMap((s) => [s.id, ...(s.disclosures ?? []).map((d) => d.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("opens the three checks at 'why'", () => {
    const checks = AFFORDABILITY_SECTIONS.find((s) => s.id === "checks");
    expect(checks?.disclosures?.map((d) => [d.id, d.openAtDepth])).toEqual([
      ["check-approval", 1], ["check-comfort", 1], ["check-cash", 1],
    ]);
  });
  it("never auto-opens the advanced disclosures", () => {
    const inputs = AFFORDABILITY_SECTIONS.find((s) => s.id === "inputs");
    expect(inputs?.disclosures?.every((d) => d.openAtDepth === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/sections.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/sections.ts`**

```ts
/**
 * One typed registry per page, so the jump rail, the presence gate, the hash
 * targets and the parity test all read a single source. Later pages register
 * their own list rather than re-deriving the machinery.
 */

export type Depth = 0 | 1 | 2;

export interface DisclosureDef {
  /** Globally unique. The URL hash target and the test handle. */
  id: string;
  /** Message key, relative to the page's namespace. */
  labelKey: string;
  /** Depth at or above which this starts open. null = never auto-opens. */
  openAtDepth: Depth | null;
}

export interface SectionDef {
  id: string;
  labelKey: string;
  /** Below this depth the section is not rendered and is absent from the jump rail. */
  minDepth: Depth;
  disclosures?: readonly DisclosureDef[];
}

export const AFFORDABILITY_SECTIONS: readonly SectionDef[] = [
  { id: "verdict", labelKey: "d1", minDepth: 0 },
  {
    id: "checks",
    labelKey: "ckTitle",
    minDepth: 0,
    disclosures: [
      { id: "check-approval", labelKey: "ckApproval", openAtDepth: 1 },
      { id: "check-comfort", labelKey: "ckComfort", openAtDepth: 1 },
      { id: "check-cash", labelKey: "ckCash", openAtDepth: 1 },
    ],
  },
  { id: "gap", labelKey: "gapTitle", minDepth: 0 },
  {
    id: "inputs",
    labelKey: "adjust",
    minDepth: 0,
    disclosures: [
      { id: "adv-income", labelKey: "cAdvanced", openAtDepth: null },
      { id: "adv-purchase", labelKey: "cAdvanced", openAtDepth: null },
      { id: "adv-limits", labelKey: "cAdvanced", openAtDepth: null },
    ],
  },
  { id: "math", labelKey: "mTitle", minDepth: 2 },
] as const;

export function visibleSections(sections: readonly SectionDef[], depth: Depth): SectionDef[] {
  return sections.filter((s) => depth >= s.minDepth);
}

/**
 * Depth sets a FLOOR, never a state. An explicit click wins over both the hash
 * and the floor, in both directions, for the rest of the session -- which is the
 * one place this deliberately diverges from the reference, whose
 * `open = openCheck === key || depth >= 1` renders every toggle inoperative
 * at depth >= 1.
 */
export function isDisclosureOpen({
  def, depth, hashTarget, override,
}: {
  def: DisclosureDef;
  depth: Depth;
  hashTarget: string | null;
  override: boolean | undefined;
}): boolean {
  if (override !== undefined) return override;
  if (hashTarget === def.id) return true;
  return def.openAtDepth !== null && depth >= def.openAtDepth;
}
```

- [ ] **Step 4: Run — must pass**

Run: `npx vitest run src/lib/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing hash test `src/hooks/use-hash-target.test.tsx`**

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHashTarget } from "./use-hash-target";

afterEach(() => {
  window.location.hash = "";
});

describe("useHashTarget", () => {
  it("returns null when there is no hash", () => {
    const { result } = renderHook(() => useHashTarget());
    expect(result.current).toBeNull();
  });

  it("reads the hash present on mount", () => {
    window.location.hash = "#check-comfort";
    const { result } = renderHook(() => useHashTarget());
    expect(result.current).toBe("check-comfort");
  });

  it("follows a hashchange", () => {
    const { result } = renderHook(() => useHashTarget());
    act(() => {
      window.location.hash = "#gap";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current).toBe("gap");
  });

  it("decodes a percent-encoded hash", () => {
    window.location.hash = "#check%2Dcash";
    const { result } = renderHook(() => useHashTarget());
    expect(result.current).toBe("check-cash");
  });
});
```

- [ ] **Step 6: Write `src/hooks/use-hash-target.ts`**

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * The hash names exactly one disclosure or section. Read in an effect rather
 * than with useSearchParams: useSearchParams opts the route out of static
 * rendering, and every page route in this app must stay prerendered --
 * Cloudflare serves prerendered pages as free static assets and bills dynamic
 * routes as Worker invocations under a 10ms CPU cap.
 *
 * Returns null on the server and on the first client render, so the prerendered
 * HTML and the hydrated tree agree.
 */
export function useHashTarget(): string | null {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const raw = window.location.hash.replace(/^#/, "");
      setTarget(raw === "" ? null : decodeURIComponent(raw));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return target;
}
```

- [ ] **Step 7: Run the hash test — must pass**

Run: `npx vitest run src/hooks/use-hash-target.test.tsx`
Expected: PASS.

- [ ] **Step 8: Write the failing component tests**

`src/components/disclosure-section.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisclosureSection } from "./disclosure-section";

describe("DisclosureSection", () => {
  it("wires aria-expanded and aria-controls to the panel", () => {
    render(
      <DisclosureSection id="check-comfort" label="Comfort" open onToggle={vi.fn()}>
        <p>rows</p>
      </DisclosureSection>,
    );
    const toggle = screen.getByRole("button", { name: /Comfort/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveTextContent("rows");
  });

  it("hides the panel content when closed", () => {
    render(
      <DisclosureSection id="check-comfort" label="Comfort" open={false} onToggle={vi.fn()}>
        <p>rows</p>
      </DisclosureSection>,
    );
    expect(screen.getByRole("button", { name: /Comfort/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("rows")).not.toBeInTheDocument();
  });

  it("calls onToggle on click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <DisclosureSection id="check-comfort" label="Comfort" open onToggle={onToggle}>
        <p>rows</p>
      </DisclosureSection>,
    );
    await user.click(screen.getByRole("button", { name: /Comfort/ }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("gives the heading a programmatic focus target", () => {
    // Jump-rail links move focus here. Scrolling without moving focus leaves a
    // keyboard user exactly where they started.
    render(
      <DisclosureSection id="check-cash" label="Cash" open onToggle={vi.fn()}>
        <p>rows</p>
      </DisclosureSection>,
    );
    expect(document.getElementById("check-cash")).toHaveAttribute("tabindex", "-1");
  });
});
```

`src/components/depth-control.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepthControl } from "./depth-control";

const LABELS = ["The answer", "Why", "The math"] as const;

describe("DepthControl", () => {
  it("is a labelled radiogroup, not three toggle buttons", () => {
    // One choice among three. aria-pressed on three independent buttons would
    // misdescribe it to a screen reader.
    render(<DepthControl value={0} onChange={vi.fn()} label="Detail" optionLabels={LABELS} />);
    const group = screen.getByRole("radiogroup", { name: "Detail" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks the current depth checked", () => {
    render(<DepthControl value={1} onChange={vi.fn()} label="Detail" optionLabels={LABELS} />);
    expect(screen.getByRole("radio", { name: /Why/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /The answer/ })).toHaveAttribute("aria-checked", "false");
  });

  it("uses roving tabindex", () => {
    render(<DepthControl value={1} onChange={vi.fn()} label="Detail" optionLabels={LABELS} />);
    expect(screen.getByRole("radio", { name: /Why/ })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: /The math/ })).toHaveAttribute("tabindex", "-1");
  });

  it("moves with arrow keys", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DepthControl value={0} onChange={onChange} label="Detail" optionLabels={LABELS} />);
    const first = screen.getByRole("radio", { name: /The answer/ });
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("does not wrap past the ends", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DepthControl value={0} onChange={onChange} label="Detail" optionLabels={LABELS} />);
    screen.getByRole("radio", { name: /The answer/ }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DepthControl value={0} onChange={onChange} label="Detail" optionLabels={LABELS} />);
    await user.click(screen.getByRole("radio", { name: /The math/ }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});
```

`src/components/jump-rail.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JumpRail } from "./jump-rail";

describe("JumpRail", () => {
  it("renders real anchors so the links can be copied and shared", () => {
    render(<JumpRail label="Jump to" links={[{ id: "gap", label: "The gap" }]} />);
    expect(screen.getByRole("link", { name: "The gap" })).toHaveAttribute("href", "#gap");
  });

  it("moves focus to the target heading, not only the scroll position", async () => {
    const user = userEvent.setup();
    render(
      <>
        <JumpRail label="Jump to" links={[{ id: "gap", label: "The gap" }]} />
        <h2 id="gap" tabIndex={-1}>The gap</h2>
      </>,
    );
    await user.click(screen.getByRole("link", { name: "The gap" }));
    expect(document.getElementById("gap")).toHaveFocus();
  });

  it("is a labelled navigation landmark", () => {
    render(<JumpRail label="Jump to" links={[{ id: "gap", label: "The gap" }]} />);
    expect(screen.getByRole("navigation", { name: "Jump to" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Write the three components**

`src/components/disclosure-section.tsx`:

First, `src/lib/tone.ts` — one home for the five tones, so nothing in `src/lib/` ever has to import from `src/components/`:

```ts
/** The four semantic state triples from the token layer, plus a neutral. */
export type Tone = "pass" | "caution" | "blocked" | "band" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  pass: "bg-pass-bg border-pass-border text-pass",
  caution: "bg-caution-bg border-caution-border text-caution",
  blocked: "bg-blocked-bg border-blocked-border text-blocked",
  band: "bg-band-bg border-band-border text-band",
  neutral: "bg-card border-border text-foreground",
};

export const toneClass = (tone: Tone): string => TONE_CLASS[tone];
```

then `src/components/disclosure-section.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { toneClass, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export interface DisclosureSectionProps {
  /** Doubles as the URL hash target and the heading's focus target. */
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  tone?: Tone;
  /** Rendered next to the label while both open and closed -- the headline figure. */
  summary?: ReactNode;
  /** One line of plain language, always visible. */
  why?: ReactNode;
  children: ReactNode;
}

export function DisclosureSection({
  id, label, open, onToggle, tone = "neutral", summary, why, children,
}: DisclosureSectionProps) {
  const panelId = `${id}-panel`;
  return (
    <div className={cn("rounded-lg border", toneClass(tone))}>
      <h3 id={id} tabIndex={-1} className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left sm:min-h-0"
        >
          <span className="micro">{label}</span>
          {summary ? <span className="figure ml-auto font-semibold">{summary}</span> : null}
          <span aria-hidden="true" className="figure text-text-faint">{open ? "–" : "+"}</span>
        </button>
      </h3>
      {why ? <p className="px-3 pb-2 text-[11.5px] text-muted-foreground">{why}</p> : null}
      <div id={panelId} hidden={!open} className="border-t border-border-hairline px-3 py-2">
        {children}
      </div>
    </div>
  );
}
```

Note: `hidden` (not conditional rendering) keeps `aria-controls` pointing at a real element in both states, which is what the "hides the panel content when closed" test asserts via `queryByText` — `hidden` content is excluded from the accessibility tree and from Testing Library's default queries.

`src/components/depth-control.tsx`:

```tsx
"use client";

import { useRef } from "react";
import type { Depth } from "@/lib/sections";
import { cn } from "@/lib/utils";

export interface DepthControlProps {
  value: Depth;
  onChange: (depth: Depth) => void;
  label: string;
  optionLabels: readonly [string, string, string];
}

/**
 * A radiogroup, not three toggle buttons: this is a single choice among three,
 * and aria-pressed on three independent buttons would misdescribe it.
 *
 * The encoding is zero-based; the labels are the contract. The reference stores
 * depth 0 and displays "1 / 2 / 3" as ordinals, which is why the default is
 * sometimes described as "level 1".
 */
export function DepthControl({ value, onChange, label, optionLabels }: DepthControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    if (to < 0 || to > 2) return;
    onChange(to as Depth);
    refs.current[to]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {optionLabels.map((optionLabel, i) => (
        <button
          key={optionLabel}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={value === i}
          tabIndex={value === i ? 0 : -1}
          onClick={() => onChange(i as Depth)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(i + 1); }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(i - 1); }
          }}
          className={cn(
            "micro flex min-h-11 items-center gap-1.5 rounded-md px-2.5 sm:min-h-0 sm:py-1.5",
            value === i ? "bg-card text-primary" : "text-text-faint",
          )}
        >
          <span aria-hidden="true" className="figure">{i + 1}</span>
          {optionLabel}
        </button>
      ))}
    </div>
  );
}
```

`src/components/jump-rail.tsx`:

```tsx
"use client";

export interface JumpLink {
  id: string;
  label: string;
}

/**
 * Real anchors, so a link can be copied and shared, plus an onClick that moves
 * focus to the target heading. Scrolling without moving focus leaves a keyboard
 * user where they started -- the failure this exists to avoid.
 */
export function JumpRail({ links, label }: { links: readonly JumpLink[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          onClick={() => {
            // Let the browser do the scroll and the history entry; only take
            // over focus, which it does not move for a same-document hash.
            const target = document.getElementById(link.id);
            if (target instanceof HTMLElement) target.focus({ preventScroll: true });
          }}
          className="micro shrink-0 rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
```

- [ ] **Step 10: Run the component tests — must pass**

Run: `npx vitest run src/components/disclosure-section.test.tsx src/components/depth-control.test.tsx src/components/jump-rail.test.tsx`
Expected: PASS.

- [ ] **Step 11: Run the gate and commit**

Run: `scripts/check`

```bash
git add src/lib/sections.ts src/lib/sections.test.ts src/lib/tone.ts src/hooks/use-hash-target.ts \
        src/hooks/use-hash-target.test.tsx src/components/disclosure-section.tsx \
        src/components/disclosure-section.test.tsx src/components/depth-control.tsx \
        src/components/depth-control.test.tsx src/components/jump-rail.tsx \
        src/components/jump-rail.test.tsx
git commit -m "feat: add the section registry, disclosure, depth control and jump rail

Depth sets a floor, never a state, and every disclosure carries a two-way
override -- so a check can be opened at 'the answer' and closed at 'the
math'. The reference pins checks open at depth >= 1 and leaves their
toggles inoperative; that defect is asserted against.

The hash is read from window.location.hash in an effect. useSearchParams
would opt the route out of static rendering."
```

---

## Task 4: Engine additions — the four values the screen needs and the engine does not expose

`src/domain/` is the source of truth for every number, so the cash gap, the months to close, and the cost of debt in purchase-price terms are added here rather than computed in a component.

**Files:**
- Modify: `src/domain/engine.ts:266-366` (`AffordabilityInput`, `affordability`)
- Modify: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `defaultContractRate(F: FederalRules, dpPct: number): number` — the rate as a percentage.
  - Four new fields on `AffordabilityResult`: `cashGap: number | null`, `monthsToClose: number | null`, `debtCapacity: number`, `capacityPer100: number`.
  - Two new optional fields on `AffordabilityInput`: `funds?: number | null`, `save?: number | null`.

- [ ] **Step 1: Write the failing engine tests**

Append to `src/domain/engine.test.ts`. Reuse whatever base-input fixture the file already defines for `affordability` (around line 292); the snippets below name it `base`.

```ts
import { defaultContractRate } from "./engine";

describe("defaultContractRate", () => {
  // contractRate is NOT an input in the reference -- it is derived from the down
  // payment against the federal insured/uninsured spread. The port dropped this
  // and hardcoded 4.29, which left federal.rates.insured/.uninsured unread by
  // any screen.
  it("uses the insured rate below 20% down", () => {
    expect(defaultContractRate(federal, 10)).toBeCloseTo(federal.rates.insured * 100, 10);
    expect(defaultContractRate(federal, 19.99)).toBeCloseTo(federal.rates.insured * 100, 10);
  });
  it("uses the uninsured rate at 20% down and above", () => {
    expect(defaultContractRate(federal, 20)).toBeCloseTo(federal.rates.uninsured * 100, 10);
    expect(defaultContractRate(federal, 25)).toBeCloseTo(federal.rates.uninsured * 100, 10);
  });
});

describe("affordability cash and debt-cost outputs", () => {
  it("reports cashGap as null when funds are unknown", () => {
    // "Not told" is not "told zero": a 0 here would fabricate a shortfall equal
    // to the entire cash requirement and drive the verdict from it.
    const r = affordability(winnipeg, federal, { ...base, funds: null, save: null });
    expect(r.cashGap).toBeNull();
    expect(r.monthsToClose).toBeNull();
  });

  it("reports cashGap as funds minus net cash at closing", () => {
    const r = affordability(winnipeg, federal, { ...base, funds: 50000, save: 1200 });
    expect(r.cashGap).toBeCloseTo(50000 - r.cc.net, 6);
  });

  it("reports months to close, rounded up", () => {
    const dry = affordability(winnipeg, federal, { ...base, funds: 0, save: null });
    const needed = dry.cc.net;
    const r = affordability(winnipeg, federal, { ...base, funds: needed - 2500, save: 1000 });
    expect(r.monthsToClose).toBe(3);
  });

  it("reports zero months when the funds already cover it", () => {
    const dry = affordability(winnipeg, federal, { ...base, funds: 0, save: null });
    const r = affordability(winnipeg, federal, { ...base, funds: dry.cc.net + 1, save: 1000 });
    expect(r.monthsToClose).toBe(0);
  });

  it("reports months as null when nothing is being saved", () => {
    const r = affordability(winnipeg, federal, { ...base, funds: 1000, save: 0 });
    expect(r.monthsToClose).toBeNull();
  });

  it("prices debt in purchase-price terms", () => {
    // The most behaviour-changing number on the page: what one dollar of monthly
    // obligation removes from the lender's ceiling.
    const r = affordability(winnipeg, federal, { ...base, debts: 550 });
    expect(r.debtCapacity).toBeCloseTo(550 * r.capacityPerDollar, 6);
    expect(r.capacityPer100).toBeCloseTo(100 * r.capacityPerDollar, 6);
  });

  it("prices debt at zero when there is none, while still pricing $100", () => {
    const r = affordability(winnipeg, federal, { ...base, debts: 0 });
    expect(r.debtCapacity).toBe(0);
    expect(r.capacityPer100).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: FAIL — `defaultContractRate is not exported`, and `cashGap` etc. are `undefined`.

- [ ] **Step 3: Implement in `src/domain/engine.ts`**

Add above `affordability`:

```ts
/**
 * The contract rate a borrower would actually be offered, from the down payment.
 * Insured mortgages price below uninsured ones because the lender's risk is
 * covered. Derived rather than entered: the reference computes it at
 * Affordability.dc.html:768 and Home.dc.html:444, and hardcoding it left
 * federal.rates.insured/.uninsured unread by any screen. Returned as a
 * percentage, which is what AffordabilityInput.contractRate takes.
 */
export function defaultContractRate(F: FederalRules, dpPct: number): number {
  return (dpPct < 20 ? F.rates.insured : F.rates.uninsured) * 100;
}
```

Extend `AffordabilityInput`:

```ts
  /** Funds available at closing. null = not told; there is nothing honest to assume. */
  funds?: number | null;
  /** Monthly saving toward the purchase. null = not told. */
  save?: number | null;
```

And in the returned object of `affordability`, after `capacityPerDollar` is computed:

```ts
  // Cash at closing against what the buyer actually has. Both null-safe: a
  // missing figure must stay missing all the way to the screen, so the cash
  // check can render `unanswered` instead of a fabricated shortfall.
  const funds = o.funds ?? null;
  const save = o.save ?? null;
  const cashGap = funds === null ? null : funds - cc.net;
  const monthsToClose =
    cashGap === null || save === null || save <= 0 ? null : Math.max(0, Math.ceil(-cashGap / save));
```

and in the return literal:

```ts
    cashGap,
    monthsToClose,
    debtCapacity: o.debts * capacityPerDollar,
    capacityPer100: 100 * capacityPerDollar,
```

- [ ] **Step 4: Run — must pass**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the gate and commit**

Run: `scripts/check`

```bash
git add src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): derive the contract rate and expose cash and debt-cost outputs

contractRate is derived from dpPct against the federal insured/uninsured
spread, restoring the rate model the port dropped -- and resolving the
'now-unused insured/uninsured rate spread' question on #3.

cashGap and monthsToClose are null-safe end to end: unknown funds must
stay unknown all the way to the screen rather than becoming a zero that
fabricates a shortfall."
```

---

## Task 5: Shared inputs v2 — the registry shape, the resolver, and derived defaults

"Absent means derived": derivable inputs store `null` when untouched and resolve at read time. No `touched` flags, no re-seed effect on jurisdiction change — an untouched value re-derives automatically because it was never stored.

**Files:**
- Modify: `src/lib/shared-inputs.ts` (whole file)
- Modify: `src/lib/shared-inputs.test.ts`
- Create: `src/lib/resolve-inputs.ts`, `src/lib/resolve-inputs.test.ts`

**Interfaces:**
- Consumes: `defaultContractRate` (Task 4), `Depth` (Task 3).
- Produces:
  - `type SharedInputs` — nullable on every derivable key; `debts` gone; `car`, `student`, `cc`, `otherDebt`, `funds`, `save`, `depth` added.
  - `SHARED_INPUT_DEFAULTS: SharedInputs`, `SHARED_INPUT_SCHEMA: Record<keyof SharedInputs, FieldSchema>`
  - `type FieldSchema = { kind: "number"; nullable: boolean; min?: number; max?: number } | { kind: "boolean" } | { kind: "enum"; values: readonly string[] } | { kind: "numberEnum"; values: readonly number[] }`
  - `JURISDICTION_KEYS`, `DEPTH_KEYS`, `AFFORDABILITY_KEYS`, and their `*_DEFAULTS`
  - `interface ResolvedInputs` and `resolveInputs(stored: AffordabilityFormState, j: Jurisdiction, F: FederalRules): ResolvedInputs`
  - `isPersonalised(stored: AffordabilityFormState): boolean`
  - The named constants `DEFAULT_INCOME_1`, `DEFAULT_COMFORT_CEILING`, `DEFAULT_INSURANCE_ANNUAL`, `DEFAULT_UTILITIES`

- [ ] **Step 1: Write the failing resolver test `src/lib/resolve-inputs.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { AFFORDABILITY_DEFAULTS } from "./shared-inputs";
import { isPersonalised, resolveInputs, DEFAULT_COMFORT_CEILING } from "./resolve-inputs";

const winnipeg = getJurisdiction("winnipeg")!;
const vancouver = getJurisdiction("vancouver")!;
const untouched = AFFORDABILITY_DEFAULTS;

describe("resolveInputs", () => {
  it("derives price from the city benchmark for the chosen property type", () => {
    // A Winnipeg user and a Vancouver user must not both start at $450,000.
    expect(resolveInputs(untouched, winnipeg, federal).price).toBe(winnipeg.bench.house);
    expect(resolveInputs(untouched, vancouver, federal).price).toBe(vancouver.bench.house);
  });

  it("follows the property type", () => {
    const condo = { ...untouched, ptype: "condo" as const };
    expect(resolveInputs(condo, winnipeg, federal).price).toBe(winnipeg.bench.condo);
  });

  it("keeps an edited price across a jurisdiction change", () => {
    const edited = { ...untouched, price: 512345 };
    expect(resolveInputs(edited, winnipeg, federal).price).toBe(512345);
    expect(resolveInputs(edited, vancouver, federal).price).toBe(512345);
  });

  it("derives the contract rate from the down payment", () => {
    expect(resolveInputs({ ...untouched, dpPct: 10 }, winnipeg, federal).contractRate)
      .toBeCloseTo(federal.rates.insured * 100, 10);
    expect(resolveInputs({ ...untouched, dpPct: 20 }, winnipeg, federal).contractRate)
      .toBeCloseTo(federal.rates.uninsured * 100, 10);
  });

  it("keeps an overridden contract rate across the 20% boundary", () => {
    const over = { ...untouched, contractRate: 5.75 };
    expect(resolveInputs({ ...over, dpPct: 10 }, winnipeg, federal).contractRate).toBe(5.75);
    expect(resolveInputs({ ...over, dpPct: 20 }, winnipeg, federal).contractRate).toBe(5.75);
  });

  it("sums the four named debts", () => {
    const r = resolveInputs(
      { ...untouched, car: 550, student: 200, cc: 75, otherDebt: 0 }, winnipeg, federal,
    );
    expect(r.debts).toBe(825);
  });

  it("treats untouched debts as zero, not as an assumed payment", () => {
    expect(resolveInputs(untouched, winnipeg, federal).debts).toBe(0);
  });

  it("derives condoFee to 0 even for a condo", () => {
    // We have no strata-fee data. Inventing one would be a rule with no source;
    // the comfort check asks for it inline instead.
    const condo = { ...untouched, ptype: "condo" as const };
    expect(resolveInputs(condo, winnipeg, federal).condoFee).toBe(0);
  });

  it("leaves funds and save null -- there is nothing honest to assume", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    expect(r.funds).toBeNull();
    expect(r.save).toBeNull();
  });

  it("passes an answered funds figure through", () => {
    expect(resolveInputs({ ...untouched, funds: 50000 }, winnipeg, federal).funds).toBe(50000);
  });

  it("resolves the comfort ceiling to the named constant", () => {
    expect(resolveInputs(untouched, winnipeg, federal).comfortCeiling).toBe(DEFAULT_COMFORT_CEILING);
  });

  it("resolves a blanked field back to its derived default", () => {
    // Blanking is how a user says "go back to what you had". Empty commits null
    // from NumberField, and null re-derives here.
    const blanked = { ...untouched, price: 999999 };
    expect(resolveInputs({ ...blanked, price: null }, winnipeg, federal).price).toBe(winnipeg.bench.house);
  });
});

describe("isPersonalised", () => {
  it("is false on an untouched form", () => {
    expect(isPersonalised(untouched)).toBe(false);
  });
  it("is true once income is given", () => {
    expect(isPersonalised({ ...untouched, income1: 92000 })).toBe(true);
  });
  it("is true once any of the four debts is given", () => {
    for (const key of ["car", "student", "cc", "otherDebt"] as const) {
      expect(isPersonalised({ ...untouched, [key]: 100 })).toBe(true);
    }
  });
  it("is true once funds are given", () => {
    expect(isPersonalised({ ...untouched, funds: 30000 })).toBe(true);
  });
  it("is true once the monthly ceiling is stated", () => {
    // The user's own limit, and the single input driving the headline figure.
    expect(isPersonalised({ ...untouched, comfortCeiling: 3100 })).toBe(true);
  });
  it("is false for a price change alone", () => {
    // Price is the target being tested, not the household's situation.
    expect(isPersonalised({ ...untouched, price: 600000 })).toBe(false);
  });
});
```

- [ ] **Step 2: Rewrite `src/lib/shared-inputs.ts`**

Keep the existing file comment and the `slice()` helper verbatim. Replace the type, the defaults and the key tuples.

```ts
import type { PropertyType } from "@/domain/types";
import { defaultJurisdiction } from "@/domain/jurisdictions";
import type { Depth } from "@/lib/sections";

export type SharedInputs = {
  jurId: string;
  depth: Depth;

  // The purchase
  /** null = derive from the city benchmark for the chosen property type. */
  price: number | null;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  /** null = derive from dpPct against the federal insured/uninsured spread. */
  contractRate: number | null;

  // Income
  /** null = derive from the named placeholder constant. */
  income1: number | null;
  /** null = no second applicant. Adding one writes a real figure. */
  income2: number | null;
  otherIncome: number | null;
  haircut: number;

  // Monthly debts, split so the impact chip is attributable
  car: number | null;
  student: number | null;
  cc: number | null;
  otherDebt: number | null;

  // Your limits
  comfortCeiling: number | null;
  insuranceAnnual: number | null;
  utilities: number | null;
  condoFee: number | null;

  // Cash. The two UNKNOWNS: null means "not told, and there is nothing honest
  // to assume". Defaulting funds to the reference's $50,000 would assert a
  // savings balance on the user's behalf and drive every new visitor's verdict
  // from a number they never gave.
  funds: number | null;
  save: number | null;
};

export const SHARED_INPUT_DEFAULTS: SharedInputs = {
  jurId: defaultJurisdiction.id,
  depth: 0,
  price: null,
  dpPct: 10,
  amortYears: 30,
  ftb: true,
  ptype: "house",
  elsewhere: false,
  contractRate: null,
  income1: null,
  income2: null,
  otherIncome: null,
  haircut: 0,
  car: null,
  student: null,
  cc: null,
  otherDebt: null,
  comfortCeiling: null,
  insuranceAnnual: null,
  utilities: null,
  condoFee: null,
  funds: null,
  save: null,
};

/**
 * The shape each key must have when it comes back out of localStorage. Needed
 * because a nullable default carries no usable `typeof`: `typeof null` is
 * "object", so the defaults object alone cannot validate stored content.
 */
export type FieldSchema =
  | { kind: "number"; nullable: boolean; min?: number; max?: number }
  | { kind: "boolean" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "numberEnum"; values: readonly number[] };

export const SHARED_INPUT_SCHEMA: Record<keyof SharedInputs, FieldSchema> = {
  jurId: { kind: "enum", values: [] }, // filled below from the jurisdiction list
  depth: { kind: "numberEnum", values: [0, 1, 2] },
  price: { kind: "number", nullable: true, min: 0 },
  dpPct: { kind: "number", nullable: false, min: 0, max: 100 },
  amortYears: { kind: "number", nullable: false, min: 1, max: 40 },
  ftb: { kind: "boolean" },
  ptype: { kind: "enum", values: ["house", "condo", "newbuild"] },
  elsewhere: { kind: "boolean" },
  contractRate: { kind: "number", nullable: true, min: 0, max: 30 },
  income1: { kind: "number", nullable: true, min: 0 },
  income2: { kind: "number", nullable: true, min: 0 },
  otherIncome: { kind: "number", nullable: true, min: 0 },
  haircut: { kind: "number", nullable: false, min: 0, max: 50 },
  car: { kind: "number", nullable: true, min: 0 },
  student: { kind: "number", nullable: true, min: 0 },
  cc: { kind: "number", nullable: true, min: 0 },
  otherDebt: { kind: "number", nullable: true, min: 0 },
  comfortCeiling: { kind: "number", nullable: true, min: 0 },
  insuranceAnnual: { kind: "number", nullable: true, min: 0 },
  utilities: { kind: "number", nullable: true, min: 0 },
  condoFee: { kind: "number", nullable: true, min: 0 },
  funds: { kind: "number", nullable: true, min: 0 },
  save: { kind: "number", nullable: true, min: 0 },
};
```

`jurId`'s allowed values come from the jurisdiction list; import `jurisdictions` from `@/domain/jurisdictions` and set `values: jurisdictions.map((j) => j.id)` inline rather than leaving the empty array above. (Check the exact export name in `src/domain/jurisdictions/index.ts` — `getJurisdiction` and `defaultJurisdiction` are known to exist; use whatever list export sits beside them, or `Object.keys` of the registry.)

Key tuples:

```ts
export const JURISDICTION_KEYS = ["jurId"] as const satisfies readonly (keyof SharedInputs)[];
type JurisdictionState = Pick<SharedInputs, (typeof JURISDICTION_KEYS)[number]>;
export const JURISDICTION_DEFAULTS: JurisdictionState = slice(JURISDICTION_KEYS);

/** Depth is global across every page, not per page -- hence its own tuple. */
export const DEPTH_KEYS = ["depth"] as const satisfies readonly (keyof SharedInputs)[];
export type DepthState = Pick<SharedInputs, (typeof DEPTH_KEYS)[number]>;
export const DEPTH_DEFAULTS: DepthState = slice(DEPTH_KEYS);

export const AFFORDABILITY_KEYS = [
  "price", "dpPct", "amortYears", "ftb", "ptype", "elsewhere", "contractRate",
  "income1", "income2", "otherIncome", "haircut",
  "car", "student", "cc", "otherDebt",
  "comfortCeiling", "insuranceAnnual", "utilities", "condoFee",
  "funds", "save",
] as const satisfies readonly (keyof SharedInputs)[];
export type AffordabilityFormState = Pick<SharedInputs, (typeof AFFORDABILITY_KEYS)[number]>;
export const AFFORDABILITY_DEFAULTS: AffordabilityFormState = slice(AFFORDABILITY_KEYS);
```

- [ ] **Step 3: Write `src/lib/resolve-inputs.ts`**

```ts
import type { FederalRules, Jurisdiction, PropertyType } from "@/domain/types";
import { defaultContractRate } from "@/domain/engine";
import type { AffordabilityFormState } from "./shared-inputs";

/**
 * Named placeholder constants, of exactly the same class as the jurisdiction
 * figures in src/domain/: carried over from the prototype, NOT sourced from
 * 2026 government or market data. Every one of them is marked an estimate in
 * the UI and is covered by the unverified-figures disclosure.
 *
 * comfortCeiling stays a flat constant rather than a fraction of income:
 * deriving it would mean inventing an affordability heuristic with no source,
 * in a product whose whole thesis is that its numbers trace to something.
 */
export const DEFAULT_INCOME_1 = 75000;
export const DEFAULT_INCOME_2 = 45000;
export const DEFAULT_COMFORT_CEILING = 2700;
export const DEFAULT_INSURANCE_ANNUAL = 1500;
export const DEFAULT_UTILITIES = 300;

export interface ResolvedInputs {
  price: number;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  contractRate: number;
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  car: number;
  student: number;
  cc: number;
  otherDebt: number;
  /** The one derived total: car + student + cc + otherDebt. */
  debts: number;
  comfortCeiling: number;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  /**
   * The two UNKNOWNS stay nullable on purpose. There is no honest derivation, so
   * the type forces every consumer to handle the unanswered case rather than
   * silently reading a fabricated zero.
   */
  funds: number | null;
  save: number | null;
}

/**
 * Resolve stored inputs against the selected jurisdiction and the federal rules.
 * Pure, one place, fully tested.
 *
 * This is what removes the need for `priceTouched`-style flags and for any
 * re-seed effect on jurisdiction change: an untouched value re-derives
 * automatically because it was never stored in the first place.
 */
export function resolveInputs(
  stored: AffordabilityFormState,
  j: Jurisdiction,
  F: FederalRules,
): ResolvedInputs {
  const car = stored.car ?? 0;
  const student = stored.student ?? 0;
  const cc = stored.cc ?? 0;
  const otherDebt = stored.otherDebt ?? 0;

  return {
    price: stored.price ?? j.bench[stored.ptype],
    dpPct: stored.dpPct,
    amortYears: stored.amortYears,
    ftb: stored.ftb,
    ptype: stored.ptype,
    elsewhere: stored.elsewhere,
    contractRate: stored.contractRate ?? defaultContractRate(F, stored.dpPct),
    income1: stored.income1 ?? DEFAULT_INCOME_1,
    // null means "no second applicant", not "a second applicant earning nothing".
    income2: stored.income2 ?? 0,
    otherIncome: stored.otherIncome ?? 0,
    haircut: stored.haircut,
    car, student, cc, otherDebt,
    debts: car + student + cc + otherDebt,
    comfortCeiling: stored.comfortCeiling ?? DEFAULT_COMFORT_CEILING,
    insuranceAnnual: stored.insuranceAnnual ?? DEFAULT_INSURANCE_ANNUAL,
    utilities: stored.utilities ?? DEFAULT_UTILITIES,
    // 0 even for a condo: we have no strata-fee data, and inventing one would be
    // a rule with no source. The comfort check asks for it inline instead.
    condoFee: stored.condoFee ?? 0,
    funds: stored.funds,
    save: stored.save,
  };
}

/**
 * Whether the answer on screen is driven by the household's own situation or by
 * placeholder defaults. Drives the `typical` / `yours` tag, and with it the
 * honest first paint: the prerendered HTML shows a real, correct, city-derived
 * answer tagged `typical`, and hydration flips the tag and the figures. A
 * designed state change, not a hydration glitch.
 *
 * Price is deliberately excluded: it is the target being tested, not the
 * household's situation. comfortCeiling is deliberately included: it is the
 * user's own stated limit and the single input driving the headline figure.
 */
export function isPersonalised(stored: AffordabilityFormState): boolean {
  return (
    stored.income1 !== null ||
    stored.income2 !== null ||
    stored.car !== null ||
    stored.student !== null ||
    stored.cc !== null ||
    stored.otherDebt !== null ||
    stored.funds !== null ||
    stored.comfortCeiling !== null
  );
}
```

- [ ] **Step 4: Update `src/lib/shared-inputs.test.ts`**

The existing file asserts `SHARED_INPUT_DEFAULTS.contractRate === 4.29` (line 43) and the old `AFFORDABILITY_KEYS` contents. Replace those assertions:

```ts
it("has no literal price or rate default -- both derive", () => {
  // 450000 and 4.29 were the same figure for every user in every jurisdiction.
  expect(SHARED_INPUT_DEFAULTS.price).toBeNull();
  expect(SHARED_INPUT_DEFAULTS.contractRate).toBeNull();
});

it("covers every SharedInputs key across the three key tuples", () => {
  // A key added to SharedInputs and to no tuple is never persisted and never
  // read -- silently dead state, which is how `haircut` and `elsewhere` got
  // that way in the first place.
  const covered = new Set<string>([...JURISDICTION_KEYS, ...DEPTH_KEYS, ...AFFORDABILITY_KEYS]);
  expect([...Object.keys(SHARED_INPUT_DEFAULTS)].filter((k) => !covered.has(k))).toEqual([]);
});

it("has a schema entry for every key", () => {
  expect(Object.keys(SHARED_INPUT_SCHEMA).sort()).toEqual(Object.keys(SHARED_INPUT_DEFAULTS).sort());
});
```

- [ ] **Step 5: Run — must pass**

Run: `npx vitest run src/lib/resolve-inputs.test.ts src/lib/shared-inputs.test.ts`
Expected: PASS. `src/app/[locale]/affordability/page.tsx` will not typecheck at this point — it still reads `form.debts` and passes nullable values to the engine. That is expected; it is rebuilt in Task 9. To keep the tree green between commits, apply the minimal bridge in Step 6.

- [ ] **Step 6: Bridge the old page so the tree stays green**

In `src/app/[locale]/affordability/page.tsx`, replace the direct `affordability(jurisdiction, federal, form)` call with `affordability(jurisdiction, federal, resolveInputs(form, jurisdiction, federal))`, delete the `debts` field row and the `contractRate` field row from the JSX, and change `numberField` to read `form[key] ?? 0`. Nothing else. The page is replaced wholesale in Task 9; this is only so `scripts/check` passes on this commit.

- [ ] **Step 7: Run the gate and commit**

Run: `scripts/check`

```bash
git add src/lib/shared-inputs.ts src/lib/shared-inputs.test.ts src/lib/resolve-inputs.ts \
        src/lib/resolve-inputs.test.ts "src/app/[locale]/affordability/page.tsx"
git commit -m "feat: derive inputs instead of hardcoding them

price now comes from the selected city's benchmark for the chosen property
type, and contractRate from the down payment -- a Winnipeg user and a
Vancouver user no longer both start at \$450,000.

Derivable keys store null when untouched and resolve at read time, so a
jurisdiction change needs no re-seed effect and blanking a field returns
it to its derived default. funds and save stay null: there is nothing
honest to assume, and the type forces every consumer to say so."
```

---

## Task 6: Storage v2 — coerce and migration

`localStorage` content is currently cast straight into typed state, and the `v1` suffix promises versioning that is unimplemented. This work adds eight keys and removes one.

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`
- Modify: `src/hooks/use-shared-state.ts` (delegates; the `ready` gate and allowlist model are untouched)
- Create: `src/hooks/use-depth.ts`

**Interfaces:**
- Consumes: `SHARED_INPUT_SCHEMA`, `SHARED_INPUT_DEFAULTS` (Task 5).
- Produces: `STORE_KEY_V1`, `STORE_KEY_V2`, `coerceStored(raw: unknown): Partial<SharedInputs>`, `migrateV1(v1: Record<string, unknown>): Record<string, unknown>`, `readStored<T>(allowlist): Partial<T>`, `writeStored<T>(allowlist, state): void`, `useDepth(): [Depth, (d: Depth) => void]`.

- [ ] **Step 1: Write the failing test `src/lib/storage.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { coerceStored, migrateV1, readStored, STORE_KEY_V1, STORE_KEY_V2, writeStored } from "./storage";
import { AFFORDABILITY_KEYS } from "./shared-inputs";

beforeEach(() => window.localStorage.clear());

describe("coerceStored", () => {
  it("keeps well-typed values", () => {
    expect(coerceStored({ price: 500000, ftb: false, ptype: "condo" }))
      .toEqual({ price: 500000, ftb: false, ptype: "condo" });
  });
  it("drops a value of the wrong type rather than casting it", () => {
    expect(coerceStored({ price: "lots", ftb: "yes" })).toEqual({});
  });
  it("drops an unknown key", () => {
    expect(coerceStored({ notAKey: 1 })).toEqual({});
  });
  it("drops a stale enum member", () => {
    // A stale ptype used to blank the Select silently, leaving a control with
    // no visible value and no way to tell why.
    expect(coerceStored({ ptype: "duplex" })).toEqual({});
  });
  it("keeps null on a nullable key and drops it on a non-nullable one", () => {
    expect(coerceStored({ price: null })).toEqual({ price: null });
    expect(coerceStored({ dpPct: null })).toEqual({});
  });
  it("drops a non-finite number", () => {
    expect(coerceStored({ price: Number.NaN })).toEqual({});
  });
  it("clamps to the schema bounds", () => {
    expect(coerceStored({ dpPct: 140 })).toEqual({ dpPct: 100 });
    expect(coerceStored({ income1: -5 })).toEqual({ income1: 0 });
  });
  it("accepts a valid depth and rejects an invalid one", () => {
    expect(coerceStored({ depth: 2 })).toEqual({ depth: 2 });
    expect(coerceStored({ depth: 7 })).toEqual({});
  });
  it("returns {} for a non-object", () => {
    for (const raw of [null, 42, "x", []]) expect(coerceStored(raw)).toEqual({});
  });
});

describe("migrateV1", () => {
  it("moves debts to otherDebt", () => {
    expect(migrateV1({ debts: 300 }).otherDebt).toBe(300);
    expect("debts" in migrateV1({ debts: 300 })).toBe(false);
  });
  it("drops the old universal price literal so the city benchmark takes over", () => {
    // v1 wrote every key on first render, so a returning user who never touched
    // price has 450000 stored. The blob cannot distinguish touched from
    // untouched; equality with the old default is the only available signal.
    expect(migrateV1({ price: 450000 }).price).toBeNull();
  });
  it("keeps any other price as a real edit", () => {
    expect(migrateV1({ price: 512000 }).price).toBe(512000);
  });
  it("drops the old universal rate literal", () => {
    expect(migrateV1({ contractRate: 4.29 }).contractRate).toBeNull();
  });
  it("keeps any other rate as a deliberate override", () => {
    expect(migrateV1({ contractRate: 5.5 }).contractRate).toBe(5.5);
  });
  it("leaves new keys absent so they derive", () => {
    const out = migrateV1({ price: 450000 });
    for (const key of ["funds", "save", "car", "student", "cc", "depth"]) {
      expect(out[key]).toBeUndefined();
    }
  });
});

describe("readStored", () => {
  it("migrates a v1 blob on first read and writes v2", () => {
    window.localStorage.setItem(
      STORE_KEY_V1,
      JSON.stringify({ price: 450000, contractRate: 4.29, debts: 300, income1: 82000, ptype: "condo" }),
    );
    const out = readStored(AFFORDABILITY_KEYS);
    expect(out.price).toBeNull();
    expect(out.contractRate).toBeNull();
    expect(out.otherDebt).toBe(300);
    expect(out.income1).toBe(82000);
    expect(out.ptype).toBe("condo");
    expect(window.localStorage.getItem(STORE_KEY_V2)).not.toBeNull();
  });

  it("leaves v1 in place, so the migration is re-runnable while it is new", () => {
    window.localStorage.setItem(STORE_KEY_V1, JSON.stringify({ debts: 300 }));
    readStored(AFFORDABILITY_KEYS);
    expect(window.localStorage.getItem(STORE_KEY_V1)).not.toBeNull();
  });

  it("prefers v2 when both exist", () => {
    window.localStorage.setItem(STORE_KEY_V1, JSON.stringify({ income1: 1 }));
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ income1: 2 }));
    expect(readStored(AFFORDABILITY_KEYS).income1).toBe(2);
  });

  it("returns {} for unparseable content instead of throwing", () => {
    window.localStorage.setItem(STORE_KEY_V2, "{not json");
    expect(readStored(AFFORDABILITY_KEYS)).toEqual({});
  });

  it("only returns allowlisted keys", () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ income1: 5, jurId: "toronto" }));
    expect(readStored(["income1"] as const)).toEqual({ income1: 5 });
  });
});

describe("writeStored", () => {
  it("merges into the existing blob rather than replacing it", () => {
    // Two independent call sites -- the header's jurisdiction picker and the
    // page's form -- share one storage key.
    writeStored(["jurId"] as const, { jurId: "toronto" });
    writeStored(["income1"] as const, { income1: 90000 });
    const blob = JSON.parse(window.localStorage.getItem(STORE_KEY_V2)!);
    expect(blob).toMatchObject({ jurId: "toronto", income1: 90000 });
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/storage.ts`**

```ts
import { SHARED_INPUT_SCHEMA, type SharedInputs } from "./shared-inputs";

export const STORE_KEY_V1 = "norma.inputs.v1";
export const STORE_KEY_V2 = "norma.inputs.v2";

/** The two literals v1 wrote for every user in every jurisdiction. */
const V1_UNIVERSAL_PRICE = 450000;
const V1_UNIVERSAL_RATE = 4.29;

/**
 * Type-check each key against its schema instead of casting the blob into typed
 * state. A stale enum member is dropped rather than silently blanking a Select,
 * and a number outside its bounds is clamped rather than producing negative
 * monthly figures.
 */
export function coerceStored(raw: unknown): Partial<SharedInputs> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const schema = SHARED_INPUT_SCHEMA[key as keyof SharedInputs];
    if (!schema) continue;
    if (schema.kind === "boolean") {
      if (typeof value === "boolean") out[key] = value;
    } else if (schema.kind === "enum") {
      if (typeof value === "string" && schema.values.includes(value)) out[key] = value;
    } else if (schema.kind === "numberEnum") {
      if (typeof value === "number" && schema.values.includes(value)) out[key] = value;
    } else {
      if (value === null) {
        if (schema.nullable) out[key] = null;
        continue;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      let n = value;
      if (schema.min !== undefined) n = Math.max(schema.min, n);
      if (schema.max !== undefined) n = Math.min(schema.max, n);
      out[key] = n;
    }
  }
  return out as Partial<SharedInputs>;
}

/**
 * v1 -> v2.
 *
 * Known loss, deliberate: v1 wrote EVERY key on first render, so a returning
 * user who never touched price or rate has the old literals stored. The blob
 * cannot distinguish touched from untouched, so equality with the old default is
 * the only available signal. A user who deliberately typed exactly 450000 loses
 * that edit and gets their city's benchmark instead -- a better outcome than
 * pinning every returning user to a rate that is now wrong.
 */
export function migrateV1(v1: Record<string, unknown>): Record<string, unknown> {
  const { debts, price, contractRate, ...rest } = v1;
  const out: Record<string, unknown> = { ...rest };
  if (typeof debts === "number") out.otherDebt = debts;
  if (price !== undefined) out.price = price === V1_UNIVERSAL_PRICE ? null : price;
  if (contractRate !== undefined) {
    out.contractRate = contractRate === V1_UNIVERSAL_RATE ? null : contractRate;
  }
  return out;
}

function parse(key: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function readStored<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
): Partial<T> {
  if (typeof window === "undefined") return {};
  let blob = parse(STORE_KEY_V2);
  if (!blob) {
    const v1 = parse(STORE_KEY_V1);
    if (!v1) return {};
    blob = migrateV1(v1);
    // v1 is left in place: harmless, and it keeps the migration re-runnable
    // while it is new.
    try {
      window.localStorage.setItem(STORE_KEY_V2, JSON.stringify(blob));
    } catch {
      // storage full or unavailable -- the migrated values still load this session
    }
  }
  const clean = coerceStored(blob) as Record<string, unknown>;
  const out: Partial<T> = {};
  for (const key of allowlist) {
    if (key in clean) out[key] = clean[key] as T[typeof key];
  }
  return out;
}

export function writeStored<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  state: T,
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = parse(STORE_KEY_V2) ?? {};
    for (const key of allowlist) existing[key] = state[key];
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify(existing));
  } catch {
    // storage full or unavailable (private browsing) -- state still lives in memory
  }
}
```

- [ ] **Step 4: Rewire `src/hooks/use-shared-state.ts`**

Delete the local `STORE_KEY`, `readStore` and `writeStore`; import `readStored` / `writeStored` from `@/lib/storage` and call them from the two effects. **Keep the `ready` gate and its comment verbatim** — it is what makes the persist effect immune to StrictMode's double-invoke, and nothing here changes that reasoning. The existing `src/hooks/use-shared-state.test.tsx` must go green unchanged except for its storage-key literal.

- [ ] **Step 5: Write `src/hooks/use-depth.ts`**

```ts
"use client";

import { useCallback } from "react";
import { useSharedState } from "./use-shared-state";
import { DEPTH_DEFAULTS, DEPTH_KEYS } from "@/lib/shared-inputs";
import type { Depth } from "@/lib/sections";

/**
 * Depth persists globally, across every page -- a reader who has chosen "the
 * math" wants it on the next tool too. Open sections do NOT persist: they live
 * in the URL hash, so a specific expanded state can be shared and cited.
 */
export function useDepth(): [Depth, (depth: Depth) => void] {
  const [state, update] = useSharedState(DEPTH_KEYS, DEPTH_DEFAULTS);
  const setDepth = useCallback((depth: Depth) => update({ depth }), [update]);
  return [state.depth, setDepth];
}
```

- [ ] **Step 6: Run — must pass**

Run: `npx vitest run src/lib/storage.test.ts src/hooks/use-shared-state.test.tsx`
Expected: PASS.

- [ ] **Step 7: Run the gate and commit**

Run: `scripts/check`

```bash
git add src/lib/storage.ts src/lib/storage.test.ts src/hooks/use-shared-state.ts src/hooks/use-depth.ts
git commit -m "feat: version and validate persisted inputs

norma.inputs.v2, with a coerce step against a per-key schema: stored
content is no longer cast straight into typed state, so a stale ptype
cannot silently blank a Select and an out-of-range figure is clamped
rather than producing negative monthly costs.

The v1 migration moves debts to otherDebt and drops the two universal
literals (450000, 4.29) so they re-derive. That loss is deliberate and
asserted as intended: the blob cannot tell a touched value from an
untouched one, and equality with the old default is the only signal
available."
```

---

## Task 7: The verdict machine and the presentation geometry

Two pure modules so the page is composition only. The split is deliberate: `affordability-view.ts` holds *policy over engine output* (which of four tones), `scale.ts` holds *layout geometry* (percentages). Neither computes money — every figure comes from `src/domain/`.

**Files:**
- Create: `src/lib/tone.ts`
- Create: `src/lib/affordability-view.ts`, `src/lib/affordability-view.test.ts`
- Create: `src/lib/scale.ts`, `src/lib/scale.test.ts`

`src/lib/tone.ts` is written in Task 3 (`DisclosureSection` needs it first); it is listed here because `affordability-view.ts` consumes it.

**Interfaces:**
- Consumes: `AffordabilityResult` (Task 4), `ResolvedInputs` (Task 5).
- Produces:
  - `type VerdictKey = "declined" | "shortCash" | "over" | "comfortable"`
  - `type CheckState = "pass" | "caution" | "blocked" | "unanswered"`
  - `verdictKey(r: AffordabilityResult): VerdictKey`
  - `approvalState(r)`, `comfortState(r)`, `cashState(r)`: `CheckState`
  - `verdictTone(key: VerdictKey): Tone`, `checkTone(state: CheckState): Tone`
  - `gapBand(comfort: number, ceiling: number, price: number): GapBand`
  - `gaugeBar(value: number, limit: number): GaugeBar`
  - `impactWidth(debtCapacity: number, ceiling: number): number`
  - `markerAlign(pct: number): "start" | "center" | "end"`

- [ ] **Step 1: Write the failing test `src/lib/affordability-view.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { AffordabilityResult } from "@/domain/engine";
import { approvalState, cashState, comfortState, verdictKey } from "./affordability-view";

/** Only the fields these functions read. Cast at one narrow seam, not per test. */
const make = (over: Partial<AffordabilityResult>) =>
  ({ approvalPass: true, comfortPass: true, cashGap: null, cc: { net: 40000 }, ...over }) as AffordabilityResult;

describe("verdictKey", () => {
  // The reference's state machine, ported whole and evaluated in order.
  it("reports declined first, whatever else is wrong", () => {
    expect(verdictKey(make({ approvalPass: false, comfortPass: false, cashGap: -1 }))).toBe("declined");
  });
  it("reports shortCash before over", () => {
    expect(verdictKey(make({ comfortPass: false, cashGap: -1 }))).toBe("shortCash");
  });
  it("reports over when the cash is fine", () => {
    expect(verdictKey(make({ comfortPass: false, cashGap: 5000 }))).toBe("over");
  });
  it("reports comfortable when nothing binds", () => {
    expect(verdictKey(make({}))).toBe("comfortable");
  });
  it("never reports shortCash while funds are unknown", () => {
    // The divergence from the reference, which defaults funds to $50,000 and so
    // drives every new visitor's verdict from a savings balance they never gave.
    expect(verdictKey(make({ comfortPass: false, cashGap: null }))).toBe("over");
    expect(verdictKey(make({ cashGap: null }))).toBe("comfortable");
  });
});

describe("check states", () => {
  it("maps approval to pass or blocked", () => {
    expect(approvalState(make({ approvalPass: true }))).toBe("pass");
    expect(approvalState(make({ approvalPass: false }))).toBe("blocked");
  });
  it("maps comfort to pass or caution, never blocked", () => {
    // Over your own ceiling is a caution. Only a lender blocks.
    expect(comfortState(make({ comfortPass: true }))).toBe("pass");
    expect(comfortState(make({ comfortPass: false }))).toBe("caution");
  });
  it("reports cash as unanswered while funds are unknown", () => {
    expect(cashState(make({ cashGap: null }))).toBe("unanswered");
  });
  it("reports cash as blocked on a shortfall", () => {
    expect(cashState(make({ cashGap: -1 }))).toBe("blocked");
  });
  it("reports cash as caution on a thin margin", () => {
    // Under a tenth of the requirement is not comfortable, it is close.
    expect(cashState(make({ cashGap: 3000 }))).toBe("caution");
  });
  it("reports cash as pass on a real margin", () => {
    expect(cashState(make({ cashGap: 9000 }))).toBe("pass");
  });
});
```

- [ ] **Step 2: Write `src/lib/affordability-view.ts`**

```ts
import type { AffordabilityResult } from "@/domain/engine";
import type { Tone } from "./tone";

export type VerdictKey = "declined" | "shortCash" | "over" | "comfortable";
export type CheckState = "pass" | "caution" | "blocked" | "unanswered";

/**
 * How thin a cash margin still counts as comfortable. A display threshold, not a
 * lending rule -- named so it reads as the judgement it is.
 */
const THIN_CASH_MARGIN = 0.1;

/**
 * The reference's four-state machine (Affordability.dc.html:780-791), evaluated
 * in order. A small closed set, never free text.
 *
 * One divergence: shortCash is skipped entirely while funds are unknown. The
 * reference defaults funds to $50,000, which asserts a savings balance on the
 * user's behalf.
 */
export function verdictKey(r: AffordabilityResult): VerdictKey {
  if (!r.approvalPass) return "declined";
  if (r.cashGap !== null && r.cashGap < 0) return "shortCash";
  if (!r.comfortPass) return "over";
  return "comfortable";
}

export function approvalState(r: AffordabilityResult): CheckState {
  return r.approvalPass ? "pass" : "blocked";
}

/** Over the ceiling you set for yourself is a caution. Only a lender blocks. */
export function comfortState(r: AffordabilityResult): CheckState {
  return r.comfortPass ? "pass" : "caution";
}

export function cashState(r: AffordabilityResult): CheckState {
  if (r.cashGap === null) return "unanswered";
  if (r.cashGap < 0) return "blocked";
  return r.cashGap < r.cc.net * THIN_CASH_MARGIN ? "caution" : "pass";
}

const VERDICT_TONE: Record<VerdictKey, Tone> = {
  declined: "blocked",
  shortCash: "caution",
  over: "caution",
  comfortable: "pass",
};

export const verdictTone = (key: VerdictKey): Tone => VERDICT_TONE[key];

const CHECK_TONE: Record<CheckState, Tone> = {
  pass: "pass",
  caution: "caution",
  blocked: "blocked",
  unanswered: "neutral",
};

export const checkTone = (state: CheckState): Tone => CHECK_TONE[state];
```

- [ ] **Step 3: Write the failing test `src/lib/scale.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { gapBand, gaugeBar, impactWidth, markerAlign } from "./scale";

describe("gapBand", () => {
  it("puts the band between comfort and ceiling when the lender approves higher", () => {
    const b = gapBand(400000, 500000, 450000);
    expect(b.inverted).toBe(false);
    expect(b.bandLeft).toBeCloseTo(b.comfortPct, 5);
    expect(b.bandWidth).toBeGreaterThan(0);
  });

  it("marks the inverted case rather than clamping it to zero", () => {
    // "You would be comfortable carrying more than a lender will approve" is a
    // different fact from "lenders approve into danger", not a negative number.
    const b = gapBand(500000, 400000, 450000);
    expect(b.inverted).toBe(true);
    expect(b.bandWidth).toBeGreaterThan(0);
  });

  it("scales to whichever of the three figures is largest", () => {
    // A target far above both ceilings must stay on the bar.
    const b = gapBand(300000, 400000, 900000);
    expect(b.targetPct).toBeLessThanOrEqual(100);
    expect(b.targetPct).toBeGreaterThan(b.ceilingPct);
  });

  it("clamps every percentage into 0..100", () => {
    for (const b of [gapBand(0, 0, 0), gapBand(-5, 10, 1e9)]) {
      for (const v of [b.comfortPct, b.ceilingPct, b.targetPct, b.bandLeft, b.bandWidth]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("reports a hairline band as not worth drawing", () => {
    expect(gapBand(400000, 400100, 400000).hasBand).toBe(false);
    expect(gapBand(400000, 500000, 450000).hasBand).toBe(true);
  });
});

describe("gaugeBar", () => {
  it("scales against a 60% axis, not against the limit", () => {
    expect(gaugeBar(30, 39).width).toBeCloseTo(50, 5);
    expect(gaugeBar(30, 39).limitPct).toBeCloseTo(65, 5);
  });
  it("passes comfortably below nine tenths of the limit", () => {
    expect(gaugeBar(30, 39).state).toBe("pass");
  });
  it("cautions in the last tenth before the limit", () => {
    expect(gaugeBar(38, 39).state).toBe("caution");
  });
  it("blocks above the limit", () => {
    expect(gaugeBar(41, 39).state).toBe("blocked");
  });
  it("clamps a ratio beyond the axis", () => {
    expect(gaugeBar(200, 39).width).toBe(100);
  });
});

describe("impactWidth", () => {
  it("expresses the debt cost as a share of the un-debted ceiling", () => {
    expect(impactWidth(50000, 450000)).toBeCloseTo(10, 5);
  });
  it("is zero when there is no debt", () => {
    expect(impactWidth(0, 450000)).toBe(0);
  });
  it("does not divide by zero", () => {
    expect(Number.isFinite(impactWidth(0, 0))).toBe(true);
  });
});

describe("markerAlign", () => {
  it("pulls a marker in at the ends so its label stays on the bar", () => {
    expect(markerAlign(2)).toBe("start");
    expect(markerAlign(50)).toBe("center");
    expect(markerAlign(95)).toBe("end");
  });
});
```

- [ ] **Step 4: Write `src/lib/scale.ts`**

```ts
/**
 * Presentation geometry: percentages for bars, bands and gauges. Never money --
 * every figure on screen comes from src/domain/. This module exists so the page
 * contains no arithmetic in JSX and so the awkward cases (the inverted band, a
 * target off the end of the scale, a zero denominator) are tested rather than
 * eyeballed.
 */

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export interface GapBand {
  comfortPct: number;
  ceilingPct: number;
  targetPct: number;
  bandLeft: number;
  bandWidth: number;
  /** comfort > ceiling: the lender is the binding limit. Different copy, different colour. */
  inverted: boolean;
  /** Below this the band is a hairline and is not drawn. */
  hasBand: boolean;
}

export function gapBand(comfort: number, ceiling: number, price: number): GapBand {
  const lo = Math.min(comfort, ceiling);
  const hi = Math.max(comfort, ceiling);
  const scale = Math.max(hi, price) * 1.03 || 1;
  const pct = (v: number) => clamp((v / scale) * 100);
  const bandLeft = pct(lo);
  const bandWidth = clamp(pct(hi) - bandLeft);
  return {
    comfortPct: pct(comfort),
    ceilingPct: pct(ceiling),
    targetPct: pct(price),
    bandLeft,
    bandWidth,
    inverted: comfort > ceiling,
    hasBand: bandWidth > 0.8,
  };
}

/** The reference's fixed 60% axis, so GDS and TDS are comparable bar to bar. */
const GAUGE_MAX = 60;

export interface GaugeBar {
  width: number;
  limitPct: number;
  state: "pass" | "caution" | "blocked";
}

export function gaugeBar(value: number, limit: number): GaugeBar {
  return {
    width: clamp((value / GAUGE_MAX) * 100),
    limitPct: clamp((limit / GAUGE_MAX) * 100),
    state: value <= limit * 0.9 ? "pass" : value <= limit ? "caution" : "blocked",
  };
}

/** The debt cost as a share of the ceiling the household would have had without it. */
export function impactWidth(debtCapacity: number, ceiling: number): number {
  return clamp((debtCapacity / Math.max(1, ceiling + debtCapacity)) * 100);
}

/** Keep a marker's label on the bar rather than hanging off its end. */
export function markerAlign(pct: number): "start" | "center" | "end" {
  if (pct > 86) return "end";
  if (pct < 14) return "start";
  return "center";
}
```

- [ ] **Step 5: Run both — must pass**

Run: `npx vitest run src/lib/affordability-view.test.ts src/lib/scale.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the gate and commit**

Run: `scripts/check`

```bash
git add src/lib/affordability-view.ts src/lib/affordability-view.test.ts src/lib/scale.ts src/lib/scale.test.ts
git commit -m "feat: add the verdict state machine and the bar geometry

Four verdict states evaluated in order, and four check states including
'unanswered' for a cash check with no funds figure. Geometry is separate
and keeps the inverted gap band -- comfort above ceiling is a different
fact, not a negative number to clamp."
```

---

## Task 8: Mine the copy

Every string this work needs already exists in four languages. This is restructuring, not translation. **Take index `0` for `messages/en.json` and index `1` for `messages/fr.json`.** Copy the strings exactly, including their typographic apostrophes (’) and non-breaking spaces.

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`
- Create: `messages/parity.test.ts`

**Sources:** `design-reference/Affordability.dc.html:651-755` (the screen's own `S` table) and `design-reference/hbt-data.js:10+` (the shared `t` table).

- [ ] **Step 1: Add the `Depth` namespace**

From the `S` table. `Depth` is its own namespace because depth is global across every page.

| Message key | Reference key |
|---|---|
| `Depth.label` | `depth` ("Detail") |
| `Depth.answer` | `d1` |
| `Depth.why` | `d2` |
| `Depth.math` | `d3` |
| `Depth.jumpTo` | `jump` |

- [ ] **Step 2: Extend the `Affordability` namespace**

Keep every key the file already has — the disclosure copy (`unverifiedFlag`, `lastVerified`, `noCityData`) is unchanged, and `ptype*` / `ftb` are reused.

From `Affordability.dc.html`'s `S` table, one message key per reference key, same name:

`aDeep` · `aTitle` · `aSub` · `stComfort` · `stComfortNote` · `stCeiling` · `stCeilingNote` · `stMonthly` · `stCash` · `ckTitle` · `ckSub` · `ckApproval` · `ckComfort` · `ckCash` · `wPass` · `wCaution` · `wBlocked` · `ckApOk` · `ckApNo` · `ckTds` · `ckGds` · `ckCfOk` · `ckCfNo` · `ckCsOk` · `ckCsNo` · `headroom` · `over` · `short` · `gapTitle` · `gapZone` · `gapZoneInv` · `gapTarget` · `gapOf` · `gapOfInv` · `cIncome` · `cApp1` · `cApp2` · `cAddApp` · `cRemove` · `cAdvanced` · `cHide` · `cHaircut` · `cHaircutWhy` · `cDebts` · `cCar` · `cStudent` · `cCc` · `cOtherDebt` · `cPurchase` · `cLimits` · `cComfortCeiling` · `cInsurance` · `cUtilities` · `cCondoFee` · `cFunds` · `keyLever` · `impactPre` · `impactNone` · `impactFoot` · `perHundred` · `mTitle` · `mSub` · `mLender` · `mComfort` · `mQualInc` · `mStressRate` · `mStressWhy` · `mFactor` · `mFactorWhy` · `mGdsAllow` · `mTdsAllow` · `mBinding` · `mMaxPrice` · `mImplied` · `mStated` · `mLess` · `mBudget` · `mFactorContract` · `mComfortPrice` · `mDownReq` · `mPiAt` · `mRatios` · `mGdsFull` · `mTdsFull` · `mLimitWord` · `mPi` · `mPropTax` · `mMaint` · `mTotal` · `defaults` · `heatNote` · `vComfort` · `vOver` · `vDeclined` · `vShortCash` · `vMonths` · `tagComfort` · `subComfort`

From `hbt-data.js`'s shared `t` table, same treatment:

`adjust` · `closingCosts` · `separateNote` · `grpAtClosing` · `netCash` · `downPaymentRow` · `monthsToClose` · `monthlySavings` · `available` · `locTagTpl` · `sourcesForTpl`

Placeholders: `heatNote` carries `{h}`, `vMonths` carries `{n}`, `locTagTpl` carries `{city}`, `sourcesForTpl` carries `{prov}`. next-intl uses the same `{name}` syntax as the reference's `.replace()`, so they port unchanged.

Two keys need writing rather than mining, because the reference has no equivalent:

```json
"tagTypical": "Typical for your city",
"tagYours": "Your numbers",
"cashUnanswered": "We can tell you what this costs. Tell us what you have and we can tell you whether it is enough.",
"condoFeePrompt": "You picked a condo. Add its monthly fee and the comfort figure sharpens."
```

with the French:

```json
"tagTypical": "Typique pour votre ville",
"tagYours": "Vos chiffres",
"cashUnanswered": "Nous pouvons vous dire ce que cela coûte. Dites-nous ce dont vous disposez et nous vous dirons si cela suffit.",
"condoFeePrompt": "Vous avez choisi un condo. Ajoutez ses frais mensuels et le chiffre de confort s’affine."
```

- [ ] **Step 3: Add the `Provenance` and `Sources` namespaces**

Not in the reference (it carries provenance as a single `sourcesLine` per screen). Written fresh, and deliberately worded so that neither mark can be read as a verification claim.

```json
"Provenance": {
  "rule": "rule",
  "estimate": "estimate",
  "ruleTitle": "From a rule in the tables — see sources",
  "estimateTitle": "A local or household estimate — see sources"
},
"Sources": {
  "title": "Where these numbers come from",
  "subtitle": "Every figure on this site is either a rule from a dated table or an estimate. Neither is verified.",
  "ruleHeading": "Marked “rule”",
  "ruleBody": "The figure follows a rule in the tables: land transfer tax brackets, CMHC premium bands, the GDS and TDS limits, the stress-test floor and buffer, and the minimum down payment. Exact given the table — and the table itself is not verified.",
  "estimateHeading": "Marked “estimate”",
  "estimateBody": "The figure is a local or household estimate: benchmark prices, professional fees, the property tax rate, insurance, utilities, and every pre-filled default on this site.",
  "forJurisdiction": "For {city}",
  "federalHeading": "Federal",
  "provincialHeading": "Provincial and municipal",
  "marketHeading": "Market data",
  "osfi": "OSFI Guideline B-20 — residential mortgage underwriting",
  "cmhc": "CMHC / SCHL — mortgage loan insurance premiums",
  "none": "No source recorded for this jurisdiction yet."
}
```

French:

```json
"Provenance": {
  "rule": "règle",
  "estimate": "estimation",
  "ruleTitle": "Provient d’une règle des tables — voir les sources",
  "estimateTitle": "Estimation locale ou du ménage — voir les sources"
},
"Sources": {
  "title": "D’où viennent ces chiffres",
  "subtitle": "Chaque chiffre de ce site est soit une règle tirée d’une table datée, soit une estimation. Ni l’un ni l’autre n’est vérifié.",
  "ruleHeading": "Marqué « règle »",
  "ruleBody": "Le chiffre suit une règle des tables : tranches de droits de mutation, bandes de prime SCHL, limites ABD et ATD, plancher et marge du test de résistance, mise de fonds minimale. Exact selon la table — et la table elle-même n’est pas vérifiée.",
  "estimateHeading": "Marqué « estimation »",
  "estimateBody": "Le chiffre est une estimation locale ou du ménage : prix de référence, honoraires professionnels, taux de taxe foncière, assurance, services publics, et chaque valeur pré-remplie de ce site.",
  "forJurisdiction": "Pour {city}",
  "federalHeading": "Fédéral",
  "provincialHeading": "Provincial et municipal",
  "marketHeading": "Données de marché",
  "osfi": "Ligne directrice B-20 du BSIF — souscription de prêts hypothécaires résidentiels",
  "cmhc": "SCHL / CMHC — primes d’assurance prêt hypothécaire",
  "none": "Aucune source enregistrée pour ce territoire pour l’instant."
}
```

- [ ] **Step 4: Write the parity test `messages/parity.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import en from "./en.json";
import fr from "./fr.json";
import { jurisdictions } from "@/domain/jurisdictions";

function paths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    paths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("message parity", () => {
  it("has the same keys in both locales", () => {
    // A key present in one locale and missing in the other renders as the raw
    // key path to half the users, and nothing fails until someone sees it.
    const [a, b] = [paths(en).sort(), paths(fr).sort()];
    expect(a.filter((k) => !b.includes(k))).toEqual([]);
    expect(b.filter((k) => !a.includes(k))).toEqual([]);
  });

  it("has no empty string anywhere", () => {
    for (const messages of [en, fr]) {
      const empties = paths(messages).filter((p) => {
        const value = p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empties).toEqual([]);
    }
  });

  it("names every jurisdiction in both locales", () => {
    for (const messages of [en, fr]) {
      const names = (messages as { Jurisdictions: Record<string, string> }).Jurisdictions;
      expect(jurisdictions.map((j) => j.id).filter((id) => !names[id])).toEqual([]);
    }
  });

  it("carries no jurisdiction name for an id that no longer exists", () => {
    const ids = new Set(jurisdictions.map((j) => j.id));
    for (const messages of [en, fr]) {
      const names = (messages as { Jurisdictions: Record<string, string> }).Jurisdictions;
      expect(Object.keys(names).filter((k) => !ids.has(k))).toEqual([]);
    }
  });
});
```

If `jurisdictions` is not the export name in `src/domain/jurisdictions/index.ts`, use whatever list it exposes; `getJurisdiction` and `defaultJurisdiction` are known to exist there.

- [ ] **Step 5: Run and commit**

Run: `npx vitest run messages/parity.test.ts` — PASS.
Run: `scripts/check`

```bash
git add messages/en.json messages/fr.json messages/parity.test.ts
git commit -m "feat(i18n): mine the screen copy from the design reference

Verdict sentences, check names and rows, gap copy, impact copy, math row
labels and the depth and jump labels already existed in four languages in
design-reference/. Ported en and fr; uk and es stay out of scope (#1) and
their columns are untouched at the source.

Only /sources and four state strings are written fresh -- the reference
has no equivalent. Both provenance marks are worded so neither can be
read as a verification claim."
```

---

## Task 9: The Affordability page — answer first

The page becomes composition only: it reads `src/domain/` for every number, `src/lib/` for every state and every percentage, and `messages/*.json` for every string. It stays `"use client"` and inherits static rendering from the layout's `setRequestLocale`.

**Files:**
- Rewrite: `src/app/[locale]/affordability/page.tsx`
- Create: `src/app/[locale]/affordability/rendered-keys.ts`, `src/app/[locale]/affordability/rendered-keys.test.ts`
- Create: `src/components/affordability/verdict-card.tsx`, `stat-strip.tsx`, `checks.tsx`
- Rewrite: `src/app/[locale]/affordability/page.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–8.
- Produces: `RENDERED`, `DELIBERATELY_UNRENDERED` from `rendered-keys.ts`.

Page order, top to bottom (spec §4): deep-dive tag / title / subtitle · depth control + jump rail · verdict · stat strip · the three checks · the gap band · inputs · the math (depth 2 only) · provenance and disclosure footer. **Inputs sit below the answer. No screen in this product opens on an empty form.**

- [ ] **Step 1: Write the engine-coverage manifest `src/app/[locale]/affordability/rendered-keys.ts`**

```ts
import type { AffordabilityResult } from "@/domain/engine";

/**
 * Every field affordability() returns, classified. The screen used to render 6
 * of 22; this manifest is what stops that recurring silently. Adding a field to
 * the engine and leaving it unclassified fails the typecheck, naming the key.
 */
export const RENDERED = [
  "qualIncome", "qualRate", "fq", "fc", "gdsAllow", "tdsAllow", "binding", "tdsBinds",
  "ceiling", "comfort", "budget", "monthly", "cc", "gdsAtTarget", "tdsAtTarget",
  "impliedMortgage", "comfortDown", "comfortPI", "approvalPass", "comfortPass",
  "comfortGap", "gap", "cashGap", "monthsToClose", "debtCapacity", "capacityPer100",
] as const satisfies readonly (keyof AffordabilityResult)[];

export const DELIBERATELY_UNRENDERED = [
  // Gross income is never shown on its own: qualIncome is the figure that
  // actually binds, and showing both invites the reader to use the wrong one.
  "gross",
  // Surfaced as debtCapacity and capacityPer100, which are the same fact in
  // units a reader can act on.
  "capacityPerDollar",
] as const satisfies readonly (keyof AffordabilityResult)[];

type Covered = (typeof RENDERED)[number] | (typeof DELIBERATELY_UNRENDERED)[number];
type Uncovered = Exclude<keyof AffordabilityResult, Covered>;
/** Fails the typecheck naming the offending key if a result field is left unclassified. */
const _exhaustive: [Uncovered] extends [never] ? true : Uncovered = true;
void _exhaustive;
```

- [ ] **Step 2: Write the runtime half `src/app/[locale]/affordability/rendered-keys.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { affordability } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { resolveInputs } from "@/lib/resolve-inputs";
import { AFFORDABILITY_DEFAULTS } from "@/lib/shared-inputs";
import { DELIBERATELY_UNRENDERED, RENDERED } from "./rendered-keys";

describe("engine-output coverage", () => {
  it("classifies exactly the fields affordability() returns", () => {
    // The typecheck catches an unclassified NEW field; this catches a
    // classified field that no longer exists.
    const j = getJurisdiction("winnipeg")!;
    const result = affordability(j, federal, resolveInputs(AFFORDABILITY_DEFAULTS, j, federal));
    const classified = [...RENDERED, ...DELIBERATELY_UNRENDERED].sort();
    expect(classified).toEqual(Object.keys(result).sort());
  });

  it("classifies each key exactly once", () => {
    const all = [...RENDERED, ...DELIBERATELY_UNRENDERED];
    expect(new Set(all).size).toBe(all.length);
  });
});
```

- [ ] **Step 3: Run — it should pass immediately if Task 4 landed correctly**

Run: `npx vitest run "src/app/[locale]/affordability/rendered-keys.test.ts"`
Expected: PASS. A failure here means the engine returns a field this plan did not anticipate; classify it rather than deleting it from the manifest.

- [ ] **Step 4: Write the failing page test `src/app/[locale]/affordability/page.test.tsx`**

Replace the file. `useJurisdiction` needs its provider, so render through it.

```tsx
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import AffordabilityPage from "./page";

const renderPage = (locale: "en" | "fr" = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <AffordabilityPage />
    </JurisdictionProvider>,
    { locale },
  );

beforeEach(() => window.localStorage.clear());
afterEach(() => { window.location.hash = ""; });

describe("Affordability — the answer comes first", () => {
  it("shows a real figure before any input is touched", () => {
    // Requirement: no screen in this product opens on an empty form.
    renderPage();
    const verdict = screen.getByRole("region", { name: /verdict/i });
    expect(within(verdict).getByText(/\$[\d,]+/)).toBeInTheDocument();
  });

  it("tags the untouched answer as typical, not as the user's", () => {
    renderPage();
    expect(screen.getByText(/Typical for your city/i)).toBeInTheDocument();
  });

  it("flips to 'your numbers' once income is given", async () => {
    const user = userEvent.setup();
    renderPage();
    const income = screen.getByLabelText(/Applicant 1/i);
    await user.clear(income);
    await user.type(income, "95000");
    await user.tab();
    expect(screen.getByText(/Your numbers/i)).toBeInTheDocument();
  });

  it("renders all four stat-strip figures", () => {
    renderPage();
    for (const label of [/Comfortable price/i, /Lender ceiling/i, /True all-in monthly/i, /Cash needed at closing/i]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});

describe("Affordability — the parity checklist", () => {
  // Each registry section, asserted present by role and accessible name, so
  // dropping a section fails the suite rather than quietly shipping.
  it("renders every section present at the default depth", () => {
    renderPage();
    for (const name of [/verdict/i, /three checks/i, /the gap/i, /Adjust your numbers/i]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("does not render the math section at the default depth", () => {
    renderPage();
    expect(screen.queryByRole("region", { name: /line by line/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /line by line/i })).not.toBeInTheDocument();
  });
});

describe("Affordability — depth", () => {
  it("leaves the three checks collapsed at 'the answer'", () => {
    renderPage();
    for (const name of [/Approval/i, /Comfort/i, /Cash/i]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("opens the three checks at 'why'", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("radio", { name: /Why/i }));
    for (const name of [/Approval/i, /Comfort/i, /Cash/i]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-expanded", "true");
    }
  });

  it("adds the math section and its jump link at 'the math'", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("radio", { name: /The math/i }));
    expect(screen.getByRole("region", { name: /line by line/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /line by line/i })).toBeInTheDocument();
  });

  it("survives a remount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(screen.getByRole("radio", { name: /The math/i }));
    unmount();
    renderPage();
    expect(await screen.findByRole("radio", { name: /The math/i })).toHaveAttribute("aria-checked", "true");
  });

  it("lets a check be opened at 'the answer' and closed at 'the math'", async () => {
    // The reference's own defect, asserted against: it pins every check open at
    // depth >= 1 and leaves the toggle inoperative.
    const user = userEvent.setup();
    renderPage();
    const comfort = () => screen.getByRole("button", { name: /Comfort/i });
    await user.click(comfort());
    expect(comfort()).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("radio", { name: /The math/i }));
    await user.click(comfort());
    expect(comfort()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Affordability — deep links", () => {
  it("opens the check the hash names and moves focus to its heading", async () => {
    window.location.hash = "#check-comfort";
    renderPage();
    expect(await screen.findByRole("button", { name: /Comfort/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("is inert for an unknown hash", () => {
    window.location.hash = "#not-a-section";
    renderPage();
    expect(screen.getByRole("button", { name: /Comfort/i })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Affordability — the unanswered cash check", () => {
  it("still shows the cash required, and asks for the one field it wants", async () => {
    // Nothing is gated: cc.net is fully computable from defaults.
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Cash/i }));
    const panel = screen.getByRole("region", { name: /three checks/i });
    expect(within(panel).getByText(/\$[\d,]+/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Funds available/i)).toBeInTheDocument();
  });

  it("never reports shortCash while funds are unknown", () => {
    renderPage();
    expect(screen.queryByText(/not yet enough cash to close/i)).not.toBeInTheDocument();
  });
});

describe("Affordability — the disclosure stays", () => {
  it("keeps the unverified-figures wording visible", () => {
    renderPage();
    expect(screen.getByText(/Placeholder figures/i)).toBeInTheDocument();
    expect(screen.getByText(/Rules last verified/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run and watch it fail**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: FAIL on nearly every assertion — the current page has no verdict, no depth control, no checks.

- [ ] **Step 6: Write `src/components/affordability/verdict-card.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { verdictKey, verdictTone, type VerdictKey } from "@/lib/affordability-view";
import { toneClass } from "@/lib/tone";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VerdictCard({
  result, personalised,
}: { result: AffordabilityResult; personalised: boolean }) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const key: VerdictKey = verdictKey(result);
  const tone = verdictTone(key);

  const head =
    key === "comfortable" ? `${t("vComfort")} ${fmt(result.comfort)}.`
    : key === "over" ? t("vOver")
    : key === "declined" ? t("vDeclined")
    : t("vShortCash");

  const sub =
    key === "declined" ? (result.tdsBinds ? t("ckTds") : t("ckGds"))
    : key === "shortCash"
      ? result.monthsToClose === null ? t("ckCsNo") : t("vMonths", { n: result.monthsToClose })
      : t("subComfort");

  const tag =
    key === "comfortable" ? t("tagComfort")
    : key === "declined" ? t("wBlocked")
    : t("wCaution");

  return (
    <section
      aria-labelledby="verdict"
      className={cn("rounded-lg border p-4", toneClass(tone))}
    >
      <div className="flex items-center gap-2">
        <span className="micro">{tag}</span>
        <span className="micro rounded-md border border-current px-1.5 py-0.5 opacity-80">
          {personalised ? t("tagYours") : t("tagTypical")}
        </span>
      </div>
      <h2 id="verdict" tabIndex={-1} className="mt-1.5 text-[19px] leading-tight font-semibold">
        {head}
      </h2>
      <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>
    </section>
  );
}
```

The `region` role comes from `<section aria-labelledby>`; the accessible name is the `<h2>`, which is why the tests query `getByRole("region", { name: /verdict/i })` against the *rendered heading text*. If the mined `vComfort` copy does not contain the word "verdict", change those queries to match the actual heading rather than adding an `aria-label` that duplicates it.

- [ ] **Step 7: Write `src/components/affordability/stat-strip.tsx`**

Four figures in a responsive grid — comfortable price (with `stComfortNote`), lender ceiling (with `stCeilingNote`), true all-in monthly (with headroom/over from `comfortGap`), cash at closing (with a down-payment vs closing-cost split bar from `cc.fin.down / cc.cash`). Every figure gets `.figure`; every figure carries a `<Provenance>` mark (Task 11 — until then, leave the mark out and add it in that task). No arithmetic: the split bar's width comes from `impactWidth`-style helpers already in `scale.ts`, or add `splitWidth(down: number, cash: number): number` there with a test if none fits.

- [ ] **Step 8: Write `src/components/affordability/checks.tsx`**

One `<section aria-labelledby="checks">` containing three `DisclosureSection`s, one per check. Each takes its state from `approvalState` / `comfortState` / `cashState`, its tone from `checkTone`, its headline figure and its rows as listed in spec §4.2:

| Check | Headline | Rows |
|---|---|---|
| Approval | `ceiling` | `mQualInc`, `mStressRate`, `mGdsAllow`, `mTdsAllow`, `mBinding` (with `TDS`/`GDS`), `mMaxPrice` |
| Comfort | `comfortGap` as `headroom` or `over` | `mPi`, `mPropTax`, `cInsurance`, `cUtilities`, `cCondoFee`, `mMaint`, `mTotal`, `mStated` |
| Cash | `cashGap` as `headroom` or `short`; `cc.net` when unanswered | `downPaymentRow`, `closingCosts`, `grpAtClosing`, `netCash`, `cFunds`, `monthsToClose` |

The monthly breakdown that is a standalone card today becomes the comfort check's rows — same figures, in the place that explains them. Delete the standalone card.

Two inline asks, both rendering a `NumberField` inside the check that wants it:
- cash check, `cashState === "unanswered"`: `cashUnanswered` + the `funds` field.
- comfort check, `ptype === "condo" && stored.condoFee === null`: `condoFeePrompt` + the `condoFee` field.

- [ ] **Step 9: Rewrite `src/app/[locale]/affordability/page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { affordability } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSharedState } from "@/hooks/use-shared-state";
import { useDepth } from "@/hooks/use-depth";
import { useHashTarget } from "@/hooks/use-hash-target";
import { AFFORDABILITY_DEFAULTS, AFFORDABILITY_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { AFFORDABILITY_SECTIONS, isDisclosureOpen, visibleSections, type Depth } from "@/lib/sections";
import { DepthControl } from "@/components/depth-control";
import { JumpRail } from "@/components/jump-rail";
import { VerdictCard } from "@/components/affordability/verdict-card";
import { StatStrip } from "@/components/affordability/stat-strip";
import { Checks } from "@/components/affordability/checks";

export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  const tDepth = useTranslations("Depth");
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(AFFORDABILITY_KEYS, AFFORDABILITY_DEFAULTS);
  const [depth, setDepth] = useDepth();
  const hashTarget = useHashTarget();

  /** Explicit opens and closes, for this session only. Depth is a floor, not a state. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const toggle = (id: string, currentlyOpen: boolean) =>
    setOverrides((prev) => ({ ...prev, [id]: !currentlyOpen }));

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );
  const result = useMemo(
    () => affordability(jurisdiction, federal, resolved),
    [jurisdiction, resolved],
  );

  const sections = visibleSections(AFFORDABILITY_SECTIONS, depth);
  const openOf = (sectionId: string, disclosureId: string) => {
    const def = AFFORDABILITY_SECTIONS.find((s) => s.id === sectionId)
      ?.disclosures?.find((d) => d.id === disclosureId);
    if (!def) return false;
    return isDisclosureOpen({ def, depth, hashTarget, override: overrides[def.id] });
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 pb-24 sm:p-6 sm:pb-6">
      <div>
        <p className="micro text-text-faint">{t("aDeep")}</p>
        <h1 className="text-[27px] leading-tight font-semibold tracking-tight">{t("aTitle")}</h1>
        <p className="mt-1 max-w-prose text-[12.5px] text-muted-foreground">{t("aSub")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-y border-border-hairline py-2">
        <DepthControl
          value={depth}
          onChange={(d: Depth) => setDepth(d)}
          label={tDepth("label")}
          optionLabels={[tDepth("answer"), tDepth("why"), tDepth("math")]}
        />
        <JumpRail
          label={tDepth("jumpTo")}
          links={sections.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
        />
      </div>

      <VerdictCard result={result} personalised={isPersonalised(stored)} />
      <StatStrip result={result} />
      <Checks
        result={result}
        stored={stored}
        resolved={resolved}
        update={update}
        isOpen={(id) => openOf("checks", id)}
        onToggle={toggle}
      />

      {/* GapBand, InputGroups, MathColumns and the footer land in Task 10. */}
    </main>
  );
}
```

Section headings carry `id` and `tabIndex={-1}` (the jump-rail focus targets); the ids are exactly the registry ids.

- [ ] **Step 10: Run the page test — it must pass**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: PASS, except assertions covering the gap band, the inputs section and the math section, which land in Task 10. Mark those three with `it.todo(...)` in this commit rather than deleting them, so the missing coverage is visible.

- [ ] **Step 11: Run the gate, then the prerender guard**

Run: `scripts/check`
Run: `scripts/verify-prerender` — every page route must still be `●`.

- [ ] **Step 12: Commit**

```bash
git add "src/app/[locale]/affordability" src/components/affordability
git commit -m "feat: rebuild Affordability answer-first

Verdict, stat strip and three expandable checks replace two cards and a
standalone monthly table. The page opens on a real, correct, city-derived
number tagged 'typical' and flips to 'yours' on personalisation -- the
hydration flash becomes a designed state change.

rendered-keys.ts classifies every field affordability() returns, so a new
engine result cannot be added and silently left unrendered. The screen
used to show 6 of 22."
```

---

## Task 10: The rest of the screen — gap, consequence, inputs, the math, phone

**Files:**
- Create: `src/components/affordability/gap-band.tsx`, `impact-row.tsx`, `input-groups.tsx`, `math-columns.tsx`, `gauges.tsx`, `sticky-verdict.tsx`
- Create: `src/hooks/use-previous-result.ts`, `src/hooks/use-previous-result.test.tsx`
- Modify: `src/app/[locale]/affordability/page.tsx`, `page.test.tsx`

- [ ] **Step 1: Turn the three `it.todo` assertions into failing tests, and add these**

```tsx
describe("Affordability — the gap band", () => {
  it("names the danger zone when the lender approves above comfort", () => {
    renderPage();
    expect(screen.getByText(/Lenders will approve into this zone/i)).toBeInTheDocument();
  });
});

describe("Affordability — inputs", () => {
  it("groups the twelve controls under four labelled headings", () => {
    renderPage();
    for (const name of [/^Income$/i, /Monthly debts/i, /The purchase/i, /Your limits/i]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
  });

  it("splits debts into four named fields", () => {
    renderPage();
    for (const label of [/Car loan or lease/i, /Student loan/i, /Card or credit line/i, /Other obligations/i]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("gives haircut and elsewhere real controls", async () => {
    // Both were dead state: in SharedInputs, in the engine signature, with no
    // way for a user to reach them.
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole("button", { name: /Advanced/i })[0]);
    expect(screen.getByRole("slider", { name: /haircut/i })).toBeInTheDocument();
  });

  it("says every field is pre-filled and overwritable", () => {
    renderPage();
    expect(screen.getByText(/Pre-filled from your city/i)).toBeInTheDocument();
  });
});

describe("Affordability — consequence", () => {
  it("prices $100 of monthly debt when no debt is entered", () => {
    renderPage();
    expect(screen.getByText(/No monthly debts entered/i)).toBeInTheDocument();
  });

  it("prices the entered debt in purchase-price terms", async () => {
    const user = userEvent.setup();
    renderPage();
    const car = screen.getByLabelText(/Car loan or lease/i);
    await user.clear(car);
    await user.type(car, "550");
    await user.tab();
    expect(screen.getByText(/reduces what a lender will approve/i)).toBeInTheDocument();
  });
});

describe("Affordability — the math", () => {
  it("shows both derivation columns and both ratio gauges at 'the math'", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("radio", { name: /The math/i }));
    expect(screen.getByText(/What a lender would approve/i)).toBeInTheDocument();
    expect(screen.getByText(/What you could comfortably carry/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /GDS/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /TDS/i })).toBeInTheDocument();
  });

  it("explains the heat allowance", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("radio", { name: /The math/i }));
    expect(screen.getByText(/standard heating allowance/i)).toBeInTheDocument();
  });
});

describe("Affordability — number formatting end to end", () => {
  it("keeps the sign outside the symbol in French", () => {
    // money() emits "− 340 $" in fr and "−$340" in en. Never "$-340".
    renderPage("fr");
    expect(document.body.textContent).not.toMatch(/\$-\d/);
  });
});
```

- [ ] **Step 2: Write `src/hooks/use-previous-result.ts`**

```ts
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The prior value, held long enough to show what changed. One aria-live region
 * announces the change for the whole page -- one per chip would produce a
 * volley of announcements on a single keystroke.
 */
export function usePreviousResult<T>(value: T, holdMs = 4000): T | null {
  const [previous, setPrevious] = useState<T | null>(null);
  const latest = useRef(value);

  useEffect(() => {
    if (latest.current === value) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrevious(latest.current);
    latest.current = value;
    const timer = setTimeout(() => setPrevious(null), holdMs);
    return () => clearTimeout(timer);
  }, [value, holdMs]);

  return previous;
}
```

Its test asserts: `null` on first render; the prior value after a change; back to `null` after `holdMs` (`vi.useFakeTimers()`).

- [ ] **Step 3: Build the six components**

- **`gap-band.tsx`** — `<section aria-labelledby="gap">`. Consumes `gapBand(result.comfort, result.ceiling, resolved.price)` from `scale.ts`. Two copy paths, driven by `inverted`: `gapZone` + caution tokens, or `gapZoneInv` + band tokens. Sub-line is `fmt(Math.abs(result.gap))` + `gapOf` / `gapOfInv`. The target marker is labelled `gapTarget` and positioned with `markerAlign`. Percentages go into inline `style={{ left, width }}` — a Tailwind class cannot carry a computed percentage, and this is the one place inline style is correct.
- **`impact-row.tsx`** — the debts group's consequence chip. `result.debtCapacity > 0` → `impactPre` + `−fmt(debtCapacity)` + bar at `impactWidth(...)` + `impactFoot`, in caution tokens. Otherwise `impactNone` + `fmt(result.capacityPer100)` + `perHundred`, in neutral tokens. A 3px left accent border (the reference's one use of a 3px border).
- **`input-groups.tsx`** — four `<fieldset>` elements with `<legend>` (which is what gives `role="group"` its accessible name), inside `<section aria-labelledby="inputs">`, under `adjust` with the `defaults` note. Layout per spec §4.4:

  | Group | Primary | Advanced (its own `DisclosureSection`) |
  |---|---|---|
  | Income | applicant 1; *add a second applicant* | other income; the haircut slider |
  | Monthly debts | car · student · card/line · other | — |
  | The purchase | price (`NumberField` + range); down payment 5/10/20/25; amortization 25/30; property type; first-time buyer | mortgage rate override; buying elsewhere in Ontario |
  | Your limits | monthly all-in ceiling; funds available; monthly saving | home insurance; utilities and heat; condo or strata fee |

  The haircut slider is a native `<input type="range">` with `aria-valuetext` set to the formatted percentage — the reference's own choice, and it needs the explicit cross-browser track/thumb CSS from the visual-system doc §4 (track 3px `--input`; thumb 18×8px, `border-radius: 1px`, `background: var(--primary)`, `margin-top: -8px` on WebKit). Add that CSS to `globals.css` under `@layer components`.

  Down payment and amortization are segmented `radiogroup`s, not Selects — same pattern as `DepthControl`. Extract the roving-tabindex logic from `DepthControl` into a shared `SegmentedGroup` if a third use appears; two uses do not justify it yet.
- **`math-columns.tsx`** — `<section aria-labelledby="math">`, two columns of labelled rows, exactly the `mathCols` rows at `Affordability.dc.html:907-931`. `why` notes on `mStressRate`, `mFactor` and `mBinding`. Then the heat-allowance note: `t("heatNote", { h: fmt(federal.heatAllowance) })`.
- **`gauges.tsx`** — GDS and TDS from `gaugeBar(result.gdsAtTarget, federal.gds)` and `gaugeBar(result.tdsAtTarget, federal.tds)`. Each bar is `role="img"` with an `aria-label` naming the code, the value and the limit, so it is not a decorative div to a screen reader.
- **`sticky-verdict.tsx`** — phone only (`sm:hidden`), `position: sticky` under the header, one line: the comfort figure and the state colour. Rendered only once the verdict card has scrolled out, via an `IntersectionObserver` on the verdict section. `aria-hidden="true"`: it is a visual restatement of content already in the accessibility tree, and announcing it twice is worse than not announcing it.

- [ ] **Step 4: Phone layout**

- The depth control moves into a **fixed bottom bar** below `sm` (`fixed inset-x-0 bottom-0 border-t bg-card`), 44px targets; `main` already carries `pb-24 sm:pb-6` for it.
- The jump rail becomes a horizontally scrollable chip row under the sticky verdict — `JumpRail` already has `overflow-x-auto` and `shrink-0`.
- Input groups stack as cards; the grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Every control is 44px minimum below `sm` — already in `Input` (`h-11 sm:h-[38px]`) and in `DisclosureSection`/`DepthControl` (`min-h-11 sm:min-h-0`).

- [ ] **Step 5: Delta chips**

In the page: `const previous = usePreviousResult(result)`. `StatStrip` receives `previous` and renders a transient chip beside any headline figure whose value changed, formatted with an explicit sign. One `<div aria-live="polite" className="sr-only">` for the whole page carries the change as a sentence. Under `prefers-reduced-motion` the chip appears without animating — the global reduced-motion rule from Task 1 already handles that.

- [ ] **Step 6: Wire it all into the page and run**

Run: `npx vitest run "src/app/[locale]/affordability"`
Expected: PASS, including the three previously-`todo` assertions.

- [ ] **Step 7: Gate, prerender guard, commit**

Run: `scripts/check`
Run: `scripts/verify-prerender`

```bash
git add "src/app/[locale]/affordability" src/components/affordability src/hooks/use-previous-result.ts \
        src/hooks/use-previous-result.test.tsx src/app/globals.css
git commit -m "feat: complete the Affordability screen

The gap band (including the inverted case, which gets its own copy and
colour rather than being clamped), the debt-impact chip in purchase-price
terms, four labelled input groups replacing fourteen stacked fields, the
two derivation columns with GDS/TDS gauges at 'the math', and a phone
layout with a fixed depth bar and a sticky verdict.

haircut and elsewhere get controls, ending their existence as state no
user could reach."
```

---

## Task 11: `/sources` and the provenance marks

Requirement 8: exact provincial rules and estimated local costs distinguishable **per line**, not blanket-disclaimed in grey at the bottom. The marks need a target, which is why `/sources` is in phase 1 rather than later.

**Files:**
- Create: `src/app/[locale]/sources/page.tsx`, `src/app/[locale]/sources/page.test.tsx`
- Create: `src/components/sources-content.tsx`
- Create: `src/components/provenance.tsx`, `src/components/provenance.test.tsx`
- Modify: the affordability components, to carry marks

- [ ] **Step 1: Write the failing provenance test `src/components/provenance.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { Provenance } from "./provenance";

describe("Provenance", () => {
  it("distinguishes a rule from an estimate", () => {
    renderWithIntl(<><Provenance kind="rule" /><Provenance kind="estimate" /></>);
    expect(screen.getByRole("link", { name: /rule/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /estimate/i })).toBeInTheDocument();
  });

  it("links to the sources page", () => {
    renderWithIntl(<Provenance kind="rule" />);
    expect(screen.getByRole("link", { name: /rule/i })).toHaveAttribute("href", expect.stringContaining("/sources"));
  });

  it("never claims the figure is verified", () => {
    // The marks describe DERIVATION, not verification. A "rule" figure is exact
    // given the rules table, and the rules table is itself unverified.
    renderWithIntl(<><Provenance kind="rule" /><Provenance kind="estimate" /></>);
    expect(document.body.textContent).not.toMatch(/verified|confirmed|official/i);
  });
});
```

- [ ] **Step 2: Write `src/components/provenance.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type ProvenanceKind = "rule" | "estimate";

/**
 * Per-figure derivation mark.
 *
 * "rule" means the figure follows a rule in the tables -- LTT brackets, CMHC
 * premium bands, GDS/TDS limits, the stress-test floor and buffer, minimum down
 * payment. "estimate" means a local or household figure.
 *
 * The marks describe DERIVATION, NOT VERIFICATION. A rule figure is exact given
 * the rules table, and the rules table is itself an unverified placeholder --
 * which the blanket disclosure keeps saying, in its current wording, on every
 * screen. No copy here may imply otherwise.
 */
export function Provenance({ kind }: { kind: ProvenanceKind }) {
  const t = useTranslations("Provenance");
  return (
    <Link
      href={`/sources#${kind}`}
      title={t(kind === "rule" ? "ruleTitle" : "estimateTitle")}
      className="micro ml-1 align-super text-text-faint underline decoration-dotted underline-offset-2"
    >
      {t(kind)}
    </Link>
  );
}
```

- [ ] **Step 3: Write the failing route test `src/app/[locale]/sources/page.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { SourcesContent } from "@/components/sources-content";

describe("/sources route", () => {
  it("calls setRequestLocale, or it silently becomes dynamic", () => {
    // The exact omission that costs a prerender. scripts/verify-prerender
    // catches it too, but only after a full build; this fails in 2 seconds.
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).toContain("setRequestLocale(locale)");
  });

  it("does not use useSearchParams anywhere in the route", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("useSearchParams");
  });
});

describe("SourcesContent", () => {
  const render = () =>
    renderWithIntl(
      <JurisdictionProvider>
        <SourcesContent />
      </JurisdictionProvider>,
    );

  it("explains both marks, at ids the marks link to", () => {
    render();
    expect(document.getElementById("rule")).toBeInTheDocument();
    expect(document.getElementById("estimate")).toBeInTheDocument();
  });

  it("names the federal verification date and the two federal sources", () => {
    render();
    expect(screen.getByText(/OSFI/i)).toBeInTheDocument();
    expect(screen.getByText(/CMHC/i)).toBeInTheDocument();
    expect(screen.getByText(/Rules last verified/i)).toBeInTheDocument();
  });

  it("keeps the unverified-figures disclosure", () => {
    render();
    expect(screen.getByText(/Placeholder figures/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Write the route**

`src/app/[locale]/sources/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { SourcesContent } from "@/components/sources-content";

export default async function SourcesPage({ params }: PageProps<"/[locale]/sources">) {
  const { locale } = await params;
  // Without this the route drops out of static rendering and Cloudflare bills
  // it as a Worker invocation under a 10ms CPU cap. scripts/verify-prerender
  // fails the build if it goes missing.
  setRequestLocale(locale);

  return <SourcesContent />;
}
```

`src/components/sources-content.tsx` is `"use client"` — it reads `useJurisdiction()`, which lives in client state. It renders: the title and subtitle; two `<section>`s with `id="rule"` and `id="estimate"` carrying `ruleHeading`/`ruleBody` and `estimateHeading`/`estimateBody`; then, for the selected jurisdiction, `j.orgs.transfer`, `j.orgs.rebate`, `j.orgs.muni`, `j.orgs.premTax` under `provincialHeading`, `j.orgs.market` under `marketHeading`, and `Sources.osfi` / `Sources.cmhc` / `Affordability.lastVerified` + `federal.verified` under `federalHeading`. An absent org renders `Sources.none`, never an empty row — matching `buildLines`' own convention that a non-applicable line is absent, not a zero. It ends with the unverified-figures disclosure in its current wording.

- [ ] **Step 5: Add the marks to the figures**

Every figure that comes from a rules table gets `<Provenance kind="rule" />`; every figure that comes from a benchmark, a fee table, a tax rate or one of the `resolve-inputs` constants gets `<Provenance kind="estimate" />`. Concretely: `qualRate`, `gdsAllow`, `tdsAllow`, `cc.fin.premium`, `cc.creditsAtClosing` and the minimum-down figure are **rule**; `price`, `monthly.propTax`, `monthly.insurance`, `monthly.utilities`, `monthly.maintenance`, `comfortCeiling` and every closing fee are **estimate**.

`LineItem.exact` already exists (`engine.ts:100`) and `buildLines()` already sets it on every government line; nothing reads it. Where a component renders `LineItem`s, drive the mark from `exact` rather than from a second hardcoded list.

- [ ] **Step 6: Run, verify prerendering, commit**

Run: `npx vitest run src/components/provenance.test.tsx "src/app/[locale]/sources"`
Run: `scripts/check`
Run: `scripts/verify-prerender` — **six** page routes now, all `●`: `/en`, `/fr`, `/en/affordability`, `/fr/affordability`, `/en/sources`, `/fr/sources`.

```bash
git add "src/app/[locale]/sources" src/components/sources-content.tsx src/components/provenance.tsx \
        src/components/provenance.test.tsx src/components/affordability
git commit -m "feat: add /sources and per-figure provenance marks

Two marks -- rule and estimate -- describing DERIVATION, not verification.
A rule figure is exact given the rules table; the rules table is itself an
unverified placeholder, which the blanket disclosure keeps saying on every
screen. The marks link to /sources, which is what makes them meaningful
rather than decorative.

/sources is a server component and calls setRequestLocale; a route test
asserts that directly, so a regression fails in seconds rather than
waiting on a full build."
```

---

## Task 12: Close the documentation debt and the loose ends

**Files:**
- Modify: `CLAUDE.md`
- Modify: `src/domain/engine.test.ts` (the tautological assertion)
- Modify: whichever test file has duplicate engine imports

- [ ] **Step 1: Correct `CLAUDE.md`**

Three edits, all under "Where the project is":

1. Issue [#2](https://github.com/vivitali/norma/issues/2) is **closed**; all three seams landed, including the rebate-indexing fix — `credits()` looks its target up by key in both `gov` and `j.transfer` (`engine.ts:182`, `engine.ts:200`). So `elsewhere` is safe to expose and **Closing Costs is unblocked**. Remove the claim that #2 is open and blocking.
2. Add the phase-1 outcome under "Where the project is": the visual system is ported app-wide, Affordability is rebuilt answer-first, `/sources` exists, storage is at `v2`, and phase 1.5 (`pathnames` + nav shell) is next.
3. Update the Conventions section: `norma.inputs.v2`, and the note that every page route must stay prerendered now covers six routes.

- [ ] **Step 2: Fix the tautological `comfortPass` assertion**

From issue #3. Find the assertion in `src/domain/engine.test.ts` that computes its expectation the same way the implementation does (`monthly.total <= comfortCeiling`) and replace it with fixed inputs and a literal expected value, so it can actually fail.

- [ ] **Step 3: Remove the duplicate engine imports**

Also from #3. One `import { ... } from "./engine"` per test file.

- [ ] **Step 4: Comment `federal.contractRate` as unread**

In `src/domain/federal.ts`, above `contractRate: 4.29`:

```ts
  /**
   * No longer read by any screen: the contract rate derives from dpPct against
   * `rates.insured` / `rates.uninsured` (see `defaultContractRate` in engine.ts).
   * Left in place rather than removed -- src/domain/ is not churned by UI work.
   * Tracked on #3.
   */
```

- [ ] **Step 5: Full verification, then review**

```bash
scripts/check          # lint + typegen + typecheck + full vitest suite
scripts/test           # the suite on its own
scripts/verify-prerender   # six page routes, all prerendered
```

Then, and only with all three green, run the `reviewer` subagent on the full diff (`git diff main...HEAD`), address every finding, and repeat until it approves.

- [ ] **Step 6: Commit and open the PR**

```bash
git add CLAUDE.md src/domain/engine.test.ts src/domain/federal.ts
git commit -m "docs: correct the stale #2 note and record phase 1

Issue #2 is closed and all three seams landed, including the rebate
indexing fix -- so elsewhere is safe to expose and Closing Costs is
unblocked. CLAUDE.md said otherwise."
```

PR body links the three specs and this plan, and states plainly what is NOT in it: `pathnames` and the nav shell (phase 1.5), the remaining engine port (phase 2), Home (phase 3), and the fact that **no jurisdiction figure was verified by this work**.

**Note on the branch:** `claude/interaction-model` is branched off `claude/hosting-cicd`, which is ~11 commits ahead of `main` with no PR open. That is where `scripts/verify-prerender`, `scripts/assert-prerendered.mjs` and `scripts/ship` live. **This cannot merge until hosting does** — say so in the PR rather than letting a reviewer discover it.

---

## Self-review against the spec

| Spec section | Task |
|---|---|
| §1 Depth (floor, two-way override, radiogroup) | 3, 6 (`useDepth`), 9 |
| §2 Section registry | 3 |
| §3 Deep linking, focus movement | 3, 9 |
| §4 The page — order, verdict, checks, gap, inputs, consequence, math | 9, 10 |
| §5 Number input | 2 |
| §6 Derived defaults, two kinds of null, typical/yours | 5 |
| §7 Storage v2, coerce, migration | 6 |
| §8 Phone | 10 |
| §9 Provenance, `/sources` | 11 |
| §10 Design tokens, full visual port | 1 |
| §11 Prerendering | 1, 9, 10, 11 (guard run after each page) |
| §12 i18n | 8 |
| §13 Testing | every task; the manifest in 9, parity in 8, contrast/16px in 1 |
| §14 Phasing | scope of this plan; 1.5/2/3 explicitly excluded |
| §16 Documentation debt | 12 |

**Deliberately not in this plan**, and why:

- **`?s=` shareable links** (#3) — the spec defers them; they need their own design pass against the prerender constraint.
- **uk/es locales** (#1) — out of scope; the reference columns are left untouched so the later change stays a config edit plus two message files.
- **`pathnames` / nav shell** — phase 1.5. `/sources` therefore ships at `/en/sources` with no French slug and no link in the header; the provenance marks are its only entry point until 1.5 lands. Stated here so it is a known gap, not an oversight.
- **A `SegmentedGroup` abstraction** — `DepthControl`, down payment and amortization all share roving-tabindex logic, but the second and third uses are trivial. Extract when a fourth appears.
