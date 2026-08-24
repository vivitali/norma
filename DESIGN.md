# Design

<!-- impeccable:design-schema 1 -->

The visual system as built, not as intended. Ported from
`design-reference/Affordability v2.dc.html`, which is the design authority; where this
document and that file disagree, the file wins and this document is wrong.

**Platform:** web. **Primary mode:** Operate — the visitor is completing a task, so
scanability and consistency outrank expression, and brand lives in precise details.

---

## 1. The thesis

**One disclosure gesture, not four.**

The previous system carried four separate ways to go deeper: a three-level depth
switcher, a jump rail, per-check expanders, and a hidden advanced-inputs panel. This
one carries one. Every section of the screen is a single line — status dot, name,
plain-language read, live figure — and opening it reveals that section's whole
derivation in place. The three checks, the gap band and the line-by-line math are all
entries in the same list, so learning the gesture once covers the product including
its arithmetic.

Consequences that are load-bearing, not stylistic:

- **There is no jump rail.** One *Expand all* control in the section header reaches
  everything the rail used to, and a rail beside a depth control was two navigations
  competing to mean "more".
- **There is no depth axis.** No `minDepth`, no persisted `depth` key, no nested
  disclosure type. A section *is* the disclosure.
- **Inputs hide nothing behind a second gesture.** The advanced fields sit under a
  quiet label in the same column.

## 2. Colour

Warm paper under near-black ink, one electric indigo doing every non-state job.
Semantic colour is reserved for state and appears as a 7px dot and a figure colour —
never a filled panel with its own border, which is why there are three state colours
and no background/border triples.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--paper` | page ground | `#FAF9F6` | `#0E0F11` |
| `--panel` | raised surface | `#FFFFFF` | `#16181C` |
| `--sunk` | tracks, bar grounds | `#F1EFEA` | `#1C1F24` |
| `--line` | section rules, borders | `#E4E1DA` | `#292D33` |
| `--line2` | row hairlines | `#EFEDE8` | `#22252A` |
| `--ink` | primary text | `#14151A` | `#ECEAE6` |
| `--ink2` | secondary text | `#5B5F66` | `#A2A7AE` |
| `--ink3` | tertiary text ⚠ corrected | `#6A6D73` | `#82878D` |
| `--ac` | the one accent | `#3D3BD6` | `#8886FF` |
| `--ac2` | accent, lighter | `#6462E6` | `#A5A3FF` |
| `--acbg` / `--acbr` | accent surface / border | `#ECECFD` / `#D3D2FA` | `#1B1B33` / `#2E2E52` |
| `--pass` | state: pass | `#176B4B` | `#55C293` |
| `--caut` | state: caution | `#8A5A12` | `#D9A94E` |
| `--blk` | state: blocked | `#A32B2B` | `#E88A8A` |

Values are stored as `oklch()` in `src/app/globals.css`, generated and round-trip
verified against the hex above. `src/app/globals.test.ts` asserts every token converts
back to its reference hex, so a bad conversion fails the build naming the token.

### 2.1 The one correction — do not revert

`--ink3` does **not** match the reference. The reference values (`#8B9097` light,
`#6F757C` dark) measure **3.05:1** and **3.82:1** against the surfaces they are used
on, and this system uses `--ink3` for 11.5–12.5px text — stat labels, limit notes, the
heat-allowance note — where AA-large does not apply. Corrected to `#6A6D73` / `#82878D`,
worst case 4.51:1 and 4.56:1.

`globals.test.ts` computes WCAG contrast for **every** foreground against **every**
surface in **both** themes. Restoring the reference values fails it, naming the ratio.

## 3. Typography

**Archivo** for everything, **Martian Mono** only where a true monospace is meant.

Archivo's tabular lining numerals are set on `body`, so hero and table row share one
numeral treatment. This is deliberate and it is the reason the mono face is *not* the
numeral face: a wide mono splits `$398,398` into two numbers at display size, which is
the last thing a headline figure can afford to do.

| Element | Size | Weight | Tracking |
|---|---|---|---|
| Hero figure | 52px → 72px at `sm` | 700 | −0.045em |
| Verdict sentence | 17px → 19px | 500 | −0.01em |
| Verdict sub | 14.5px | 400 | — |
| Eyebrow (`.eyebrow`) | 11px, uppercase | 600 | 0.1em |
| Section name | 16.5px | 600 | −0.015em |
| Section line | 13.5px | 400 | — |
| Section figure | 17px | 600 | −0.02em |
| Hero stat value / gauge value | 22px / 17px | 600 | −0.02em |
| Panel row | 13.5px | 400 / 600 strong | — |
| Math row | 13px | 400 / 600 strong | — |
| Micro (limit notes, stat labels) | 11.5–12.5px | 400 | — |
| Body base | 13.5px | 400 | — |

**Form controls have a 16px floor** (`--control-font-size`), applied through `.control`.
Below 16px iOS Safari zooms the viewport on focus, and this page has twelve fields. The
floor covers the control itself — never its label, unit suffix or helper text, which
keep the sizes above.

## 4. Geometry and surface

- **Radii:** 3px small, 4px chips and inputs, 6px cards and panels, **100px pills** for
  every button, badge and bar. The pill is the system's signature shape.
- **Borders:** 1px throughout. One 3px left accent, on the key-lever callout.
- **Elevation: none.** No shadows, no rings. Surfaces separate with hairlines, a
  background step, and air. Stock shadcn card chrome is neutralised at the token layer
  (`[data-slot="card"]` gets `border-0 bg-transparent ring-0 shadow-none`).
- **Focus:** `2px solid var(--ac)`, `outline-offset: 3px`, `border-radius: 3px`,
  globally on `:focus-visible`.

## 5. Components

| Component | Role |
|---|---|
| `SectionRow` | **The** gesture. Dot · name · line · figure · caret, with the panel below. |
| `PanelRow` | A derivation row: hairline-separated, never boxed. |
| `NumberField` | The one number input. `type="text"`, `inputMode="decimal"`, derived defaults as **placeholder**, empty commits `null`. |
| `SegmentedGroup` | Radiogroup with roving tabindex for down payment and amortization. A Select would hide four short options behind a popover. |
| `GapBand` | Two ceilings on one scale. Three markers at three heights; the lender ceiling is pinned right, not positioned by value. |
| `Gauges` | GDS and TDS on a shared 60% axis with the limit ticked. `role="img"` with a full label. |
| `MathColumns` | Both derivations. A row whose input is zero is **absent**, not a zero row. |
| `Provenance` | The `rule` / `estimate` mark. Describes derivation, never verification. |
| `ImpactRow` | What debt costs in purchase price. Four states, gated on the input. |

### 5.1 Why the gap band's markers sit at three heights

Comfort, ceiling and target routinely land within a few percent of one another. The
previous version positioned all three labels by value in one band of pixels and they
overlapped into unreadable text. Here comfort sits above the bar, target below it, and
the ceiling is pinned to the right edge — the top of the scale by definition, so it can
never collide with the two markers that move.

## 6. Motion

One keyframe: `v2-pulse`, 0.5s ease-out, keyed to a jurisdiction change so the answer
visibly re-computes. Nothing else animates.

`prefers-reduced-motion: reduce` zeroes every animation and transition globally.

## 7. Accessibility

WCAG 2.1 AA where practical — a working convention, not a claim anyone may make
externally (see PRODUCT.md).

- Contrast is enforced by test across every foreground × surface × theme.
- 44px minimum touch targets below `sm`; 16px control floor everywhere.
- Radiogroups with roving tabindex rather than sets of toggle buttons.
- `aria-expanded` / `aria-controls` on every disclosure; panels use `hidden`, so a
  closed panel leaves the accessibility tree while `aria-controls` still resolves.
- Bars and gauges are `role="img"` with labels carrying the value and the limit.
- A hash arrival moves focus to the section it names, not only the scroll position.

## 8. What this system will not do

- **No filled semantic panels.** State is a dot and a figure colour.
- **No second accent.** Indigo carries every non-state emphasis.
- **No elevation.** If two things need separating, use a hairline or space.
- **No mono numerals.** Archivo tabular, hero to table row.
- **No second disclosure mechanism.** If something needs to be reachable, it becomes a
  section or it lives inside one.
