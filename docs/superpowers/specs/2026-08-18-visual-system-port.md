# Visual system port — extracted reference

Date: 2026-08-18
Status: extraction complete. Two corrections required before use; one open question.
Companion: §10 of `2026-08-18-interaction-model-design.md`, which is the policy this data serves.

## Provenance and confidence

Extracted from the `<style>` blocks and inline styles of all eight `design-reference/*.dc.html`
files. Values below are **read from the source, not estimated**.

**The eight screens share one system.** The `:root` and `[data-theme="dark"]` token blocks are
byte-identical across all eight files. The only real divergence is `--shadow`, which exists solely
in `Closing Costs.dc.html`. Every other per-file difference is scratch plumbing for the canvas
templating (`--bgS`, `--bgD`, `--kBg`, `--gW`, `--rowFw`, `--bgL`, `--cellBg`, `--colBg`) — these
are not design tokens and are **not ported**.

Also not ported: the `.dv*` classes (`.dvT`, `.dvH`, `.dvOpt`, `.dvLab`, `.dvNote`, `.dvNext`,
`.dvId`, `.dvOid`, `.dvName`), which are Claude Design canvas chrome, and `body{background:#E8E5DF}`,
which is the canvas backdrop. The app's page background is `--s0`.

---

## 1. Palette

| Token | Role | Light | Dark |
|---|---|---|---|
| `--s0` | page background | `#F7F5F1` | `#121417` |
| `--s1` | card / raised surface | `#FFFFFF` | `#191C20` |
| `--s2` | recessed / header strip | `#EFECE5` | `#21252A` |
| `--s3` | deepest recess | `#E5E1D7` | `#2A2F35` |
| `--br` | default border | `#DCD7CC` | `#2F343B` |
| `--brh` | hairline (internal dividers) | `#EAE6DD` | `#262A30` |
| `--brs` | strong border (inputs, tracks) | `#C6BFB1` | `#3D434B` |
| `--tx` | primary text | `#17191C` | `#EBE9E4` |
| `--tx2` | secondary text | `#565A5F` | `#A3A8AE` |
| `--tx3` | tertiary text | `#888C92` ⚠ | `#767B82` ⚠ |
| `--ac` | accent | `#22375C` | `#93B3E0` |
| `--ac2` | accent, lighter (focus ring) | `#3B5C92` | `#AEC7EC` |
| `--acbg` | accent surface | `#E7ECF4` | `#1C2632` |
| `--acbr` | accent border | `#C3CFE2` | `#2C3B4D` |
| `--pass` | pass foreground | `#1A6B45` | `#6AC497` |
| `--passbg` / `--passbr` | pass surface / border | `#E3EFE8` / `#BEDBCB` | `#152620` / `#264737` |
| `--caut` | caution foreground | `#87590A` | `#DFAB4C` |
| `--cautbg` / `--cautbr` | caution surface / border | `#F6EEDC` / `#E3D3AE` | `#292213` / `#463A1E` |
| `--blk` | blocked foreground | `#8D2A2A` | `#EA8D8D` |
| `--blkbg` / `--blkbr` | blocked surface / border | `#F6E7E5` / `#E5C4C0` | `#2A1919` / `#4A2C2C` |
| `--def` | neutral band foreground | `#455A6C` | `#A0B4C5` |
| `--defbg` / `--defbr` | neutral band surface / border | `#E8EDF1` / `#C8D3DC` | `#1A2128` / `#2C3742` |
| `--shadow` | *(Closing Costs only)* | `0 1px 2px rgba(23,25,28,.05)` | `0 1px 2px rgba(0,0,0,.4)` |

The light palette is **warm** — `#F7F5F1` cream, not white — with a cool navy accent. Dark is neutral
cool. That warm/cool split is the system's most distinctive characteristic and the thing most easily
lost by "approximating" it.

### 1.1 Contrast audit — measured, not assumed

WCAG 2.1 ratios computed for every foreground/background pair the system actually uses:

| Pair | Light | Dark |
|---|---|---|
| `--tx` on `--s1` | 17.61 ✅ | 14.09 ✅ |
| `--tx2` on `--s1` | 6.95 ✅ | 7.14 ✅ |
| **`--tx3` on `--s1`** | **3.38 ⚠** | **4.01 ⚠** |
| **`--tx3` on `--s2`** | **2.86 ❌** | **3.61 ⚠** |
| `--ac` on `--s1` | 11.87 ✅ | 7.95 ✅ |
| `--pass` on `--passbg` | 5.50 ✅ | 7.49 ✅ |
| `--caut` on `--cautbg` | 5.25 ✅ | 7.56 ✅ |
| `--blk` on `--blkbg` | 7.00 ✅ | 6.95 ✅ |
| `--def` on `--defbg` | 6.08 ✅ | 7.61 ✅ |

**All four semantic state pairs pass AA in both themes.** Whoever authored this checked them — those
are the pairs that carry meaning, and they hold up.

**`--tx3` is the one failure, and it is not cosmetic.** It fails outright at 2.86:1 on `--s2` in
light mode, and is AA-large-only elsewhere — but AA-large requires ≥18.66px, and `--tx3` is used
almost exclusively for 9.5–11.5px text: micro-labels, notes, units, secondary figures. At those
sizes it is a plain AA failure on every surface.

### 1.2 Required corrections

Two values change. Hue preserved, lightness moved until the worst-case surface passes 4.5:1.

| Token | Reference | Corrected | Worst case after |
|---|---|---|---|
| `--tx3` light | `#888C92` | **`#676A6F`** | 4.60 on `--s2` (5.43 on `--s1`, 4.99 on `--s0`) |
| `--tx3` dark | `#767B82` | **`#898D93`** | 4.62 on `--s2` (5.12 on `--s1`, 5.53 on `--s0`) |

Recorded rather than silently applied, per §10 of the interaction-model spec. Everything else in the
palette ports unchanged.

---

## 2. Typography

**Families.** `"IBM Plex Sans", system-ui, -apple-system, sans-serif` on `body`; `"IBM Plex Mono",
monospace` for every figure, micro-label and code. Those are the only two families in the system.
Self-hosted per §10 — Latin subsets, `font-display: swap`, preloaded, no third-party request.

**Weights.** 600 dominates (245 uses), then 500 (62), 700 (16), 400 (default). This is a
heavy-labelled system: 600 is the working weight for anything that names something, not an emphasis.

**Line heights.** Text 1.3–1.6 (1.35 and 1.5 most common); display 1 / 1.1 / 1.12 / 1.2.

**Letter-spacing.** `.06em` (58 uses) on the uppercase micro-label; `-.02em` (27) tightening on
display sizes; `.12em` on the phone status-bar dots.

**The uppercase micro-label** recurs 89 times and is the system's signature:
IBM Plex Mono · 9–9.5px · weight 600 · `letter-spacing: .06em` · `text-transform: uppercase`.
Used for section eyebrows, group labels and state tags.

### 2.1 The scale as measured

Frequency across all eight files:

| Size | Uses | Role |
|---|---|---|
| 8–8.5px | 8 | phone frame chrome (not ported) |
| 9–9.5px | 128 | uppercase micro-label |
| 10–10.5px | 90 | ordinals, units, dense meta |
| 11–11.5px | **269** | labels, secondary body — the most common size in the system |
| 12–12.5px | 146 | body |
| 13–13.5px | 69 | card titles, emphasis body |
| 14–15.5px | 44 | input values, subheads |
| 16–19px | 30 | verdict headline |
| 21–29px | 33 | page title, primary figures |
| 31–44px | 5 | display figures |

---

## 3. Geometry

**Radii** — the system's second signature, and drastically tighter than stock shadcn's `0.625rem`
(10px):

| Value | Uses | Applied to |
|---|---|---|
| 3px | 169 | cards, panels, buttons, segmented groups |
| 2px | 130 | inputs, inner cells, chips, focus ring |
| 1px | 49 | bars, fills, gauge tracks, slider thumb |
| 50% | 23 | status dots |
| 4px | 8 | rare |
| 26px / 44px | 16 | phone device frame — canvas chrome, not ported |

**Borders.** 1px solid almost everywhere (377 uses); 3px for the impact callout's left accent (26);
1.5px for the check-state icon box (6).

**Shadows.** Effectively none — one token, on one screen. This system separates surfaces with
borders and background steps, not elevation. Stock shadcn card shadows should be removed, not
retained alongside.

**Focus.** `outline: 2px solid var(--ac2); outline-offset: 2px; border-radius: 2px` — a global
`:focus-visible` rule. Ports directly and is better than shadcn's default ring for this system.

---

## 4. Interactive element specs

**Range slider** (used for price and the haircut) — needs explicit cross-browser CSS, as Radix's
Slider is not used here:
track 3px `--brs`; thumb 18×8px, `border-radius: 1px`, `background: var(--ac)`, no border,
`margin-top: -8px` on WebKit. Full-width, 22px tall desktop.

**Animation.** One keyframe: `abPulse` — `background: var(--acbg)` → `transparent` over `.7s
ease-out`, keyed to a jurisdiction change so the answer visibly re-computes. Ported as the
city-change acknowledgement.

**Reduced motion.** The reference already ships
`@media (prefers-reduced-motion:reduce){*{animation-duration:0s!important;transition-duration:0s!important}}`.
Port it as-is.

## 5. Phone

The reference enforces touch targets with `[data-screen-label$="phone"]` selectors:
`button`, `input` → `min-height: 44px`; `a` → 44×44 inline-flex centred; `input[type=range]` →
44px tall. In the app these become the `size="touch"` variant and base styles under the mobile
breakpoint, since there is no screen-label attribute.

---

## 6. Open question — type density

**The reference's body text is 11.5–12.5px, and its most common size is 11.5px.** That reads well
on a canvas at a fixed 1700px preview width. In a shipped responsive app it is small: below
comfortable reading size, and **any input under 16px triggers zoom-on-focus in iOS Safari** — which
would fire on every field of a form-heavy financial tool.

The instruction was to use the reference's sizes, so **the scale above is ported as measured** and
that is the default. But the trade is worth naming explicitly:

- **Port as-is** — maximum fidelity to the design; 11.5px body; iOS zooms on every input focus.
- **Port the system, rescale type one step** (~+1.5px on body and label sizes, inputs to 16px) —
  keeps the palette, geometry, weights, mono numerals and micro-label intact, which is where this
  system's character actually lives; loses some density.
- **Port as-is except inputs** — inputs at 16px, everything else unchanged. Smallest possible
  deviation that removes the iOS zoom problem.

I would take the third. The density is genuinely part of the design's character, and the inputs are
the one place where keeping it has a concrete, user-visible cost that has nothing to do with taste.

This needs a decision before the restyle lands; it does not block writing the implementation plan.

---

## 7. Mapping to `src/app/globals.css`

The app uses Tailwind v4 with `@theme inline { --color-*: var(--*) }` plus `:root` / `.dark`
blocks. **The app switches themes with a `.dark` class via next-themes, not the reference's
`data-theme` attribute** — the values port, the selector does not.

Existing shadcn tokens whose stock values are **replaced**:

| shadcn token | Source | Light | Dark |
|---|---|---|---|
| `--background` | `--s0` | `#F7F5F1` | `#121417` |
| `--card`, `--popover` | `--s1` | `#FFFFFF` | `#191C20` |
| `--secondary`, `--muted`, `--accent` | `--s2` | `#EFECE5` | `#21252A` |
| `--foreground`, `--card-foreground` | `--tx` | `#17191C` | `#EBE9E4` |
| `--muted-foreground` | `--tx2` | `#565A5F` | `#A3A8AE` |
| `--border` | `--br` | `#DCD7CC` | `#2F343B` |
| `--input` | `--brs` | `#C6BFB1` | `#3D434B` |
| `--primary` | `--ac` | `#22375C` | `#93B3E0` |
| `--ring` | `--ac2` | `#3B5C92` | `#AEC7EC` |
| `--destructive` | `--blk` | `#8D2A2A` | `#EA8D8D` |
| `--radius` | 3px | `0.1875rem` | — |

New tokens with no shadcn equivalent: `--surface-sunken` (`--s3`), `--border-hairline` (`--brh`),
`--text-faint` (`--tx3`, corrected), `--accent-surface` / `--accent-border` (`--acbg` / `--acbr`),
and the four semantic triples `pass` / `caution` / `blocked` / `band`.

Values convert to `oklch()` to match the file's existing convention. Three worked examples for
checking:

- `#F7F5F1` → `oklch(0.9694 0.0058 84.57)`
- `#22375C` → `oklch(0.3216 0.0684 258.36)`
- `#1A6B45` → `oklch(0.4523 0.0967 156.94)`

Conversions are generated and verified round-trip at implementation time rather than hand-copied.

---

## 8. Fidelity risks

- **Radix internals.** shadcn's Select, Switch and Slider carry their own sizing and radii. The
  restyle drives them through tokens; where a component resists, it is restyled via its own class
  surface — never by overriding Radix internals or forking the component.
- **`--radius: 0.1875rem` cascades.** `globals.css` derives `--radius-sm` … `--radius-4xl` from
  `--radius` by multiplication, so dropping it from 10px to 3px shrinks every derived radius. That
  is intended, but it changes every existing component at once — which is exactly why §10.1 lands the
  restyle as its own step.
- **Shadow removal.** Stock shadcn cards carry shadows this system does not use. They come off.
- **Fonts are a real payload.** Two families × weights 400/500/600/700 × two themes' worth of use.
  Latin subset only, and only the weights actually used, or first paint regresses on the very pages
  this work is meant to make faster.
- **`--tx3` corrections must not be reverted** by anyone later "restoring fidelity" against the
  reference. Noted here and in the token comments.
