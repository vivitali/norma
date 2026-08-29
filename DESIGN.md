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
| `--acbg` / `--acbr` | accent surface / border | `#EEEEFD` / `#D3D2FA` | `#1B1B33` / `#2E2E52` |
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
| Micro (limit notes, stat labels, legends) | 11.5–12.5px | 400 | `.micro` |
| Fine print (footnotes, unit suffixes, chart legends) | 10.5px | 400 | — |
| Body base | 13.5px | 400 | — |

The fine-print tier is documented rather than corrected: it is in use at twelve call sites
across six files, which makes it a real tier the spec had simply never recorded. Ten carry
`--ink3`, which clears 4.5:1 on every surface in both themes; two carry `--caution`, and
one inherits its colour from the row it sits in. If the tier should not exist, the fix is to
raise those call sites to 11.5px — not to leave the spec and the code disagreeing.

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
| `SegmentedGroup` | Radiogroup with roving tabindex for down payment, amortization, property type and the Rent vs Buy assumptions. A Select would hide four short options behind a popover — true while the options stay short, which is a translation constraint and not a given. Each button carries `min-w-0` and `text-center`: options sit in one row, so the control's minimum width is the sum of the longest single WORD in each label, and a flex item defaults to `min-width: auto`. Ukrainian exceeded the 256px budget at 320px on two of these controls before their labels were shortened. An option the purchase cannot have is **struck through at 55% opacity and marked `aria-disabled`**, never with the `disabled` attribute: the checked option is this radiogroup's only tab stop, and the engine gates rather than clamping, so the unavailable option can be the checked one. `line-through` is what says "not on offer" in that state, where a lower-opacity selected style is indistinguishable from the unselected style beside it. The component renders no reason — the caller does, as a `NoteLine`, and a struck option with nothing saying why is a dead end. |
| `GapBand` | Two ceilings on one scale. Three markers at three heights; the lender ceiling is pinned right, not positioned by value. |
| `Gauges` | GDS and TDS on a shared 60% axis with the limit ticked. `role="img"` with a full label. |
| `MathColumns` | Both derivations. A row whose input is zero is **absent**, not a zero row. |
| `Provenance` | The `rule` / `estimate` mark. Describes derivation, never verification. |
| `ConfidenceMark` | The other half: how well a figure is *sourced*, on `/sources` only. The same 7px dot as `SectionRow`, plus a word — `Confirmed` · `Probable` · `Weak` · `Assumption` · `Not published`. Two states share `caution` and two share `pass`, because the dot ranks and the word names; a fifth colour would be a fourth state colour §8 does not have. `Not published` is `blocked` on purpose — a quantity nobody publishes is the one status a reader must not skim past, and it must never read like `Assumption`, which is a default *we* chose. |
| `CrossLink` | One sentence pointing at the page that derives a figure this panel already shows. `placement="row"` is a note under its figure, in the `ex_` treatment; `placement="foot"` is the panel's last line. Not a widget and not a related-links block — see §5.2. |
| `TraceLabel` | The other shape: a `PanelRow`'s own label made navigable, so the words that NAME the figure carry the reader to the page deriving it. No new copy — `id` is the row's existing label key. Inline, exempt from the 44px floor per WCAG 2.5.8. See §5.2. |
| `LocaleSwitcher` | A Select, not the segmented pair it was. The exception that proves the row above: with two locales both options were visible in one tap, but four cannot share the phone settings row — §7's 44px floor makes them 176px of buttons before gaps, beside the jurisdiction picker and the theme toggle on a 320px line. The picker is what would have been squeezed, and a jurisdiction the reader cannot read is a figure they cannot trust. So it matches `JurisdictionPicker` deliberately: the two settings that change what the page *says* now look alike. |
| `AppNav` | One disclosure at **every** width — a `Tools` trigger and a panel of the four journey groups. Not a desktop row plus a mobile drawer, and **not** because §8 forbids it (a row of links discloses nothing): because arrival is search-first onto a single tool, and because a flat bar cannot render Rent vs Buy's two groups honestly. Groups are a nested `ul` with `aria-labelledby` and explicit `role="list"`, **not** headings — the nav precedes page content, so `h2` group labels would open every page's outline before its own `h1`, and preflight's `list-style: none` makes VoiceOver drop an unroled list. |
| `ImpactRow` | What debt costs in purchase price. Four states, gated on the input. |
| `NoteLine` | One quiet line under the thing it is about — the `ex_` treatment, extracted from the eight hand-written copies of it. Two tones and no third: `quiet` is `--ink3` commentary, `caution` is `--caut` and means the app applied or withheld something the reader did not ask for. It is **not** a second `ImpactRow`: §5 reserves the 3px accent for one singular signal, and this is the version that spends none of it. 11.5px, which is §3's Micro — raising the 10.5–11px call sites is the whole reason it exists. |
| `InlineAsk` | The field the page asks for **in place**, boxed in the accent, where the sentence above it cannot finish without the answer. §5.3's endorsed placement made a component. `prompt` is optional: with it, a question and a field; without it, a sentence that *is* the ask. |
| `PendingFigures` | The one answer to "the stored inputs have not landed yet". Wraps `AnswerHead` and hides the figure, the stat values and the "whose figures" badge together, with `visibility: hidden` rather than a substituted string. Both halves are load-bearing: the box is kept, so nothing moves when the value arrives, and the TEXT is kept, so the prerendered document still carries the answer — which is the point of prerendering these routes. `figure={undefined}` is the wrong tool here and means something else entirely (§5.3). |

### 5.2 Cross-page links, and the rules that keep them from becoming ads

Three panels print another page's answer — Affordability's cash check shows
`closingTotal()`'s figure, Rent vs Buy shows the same bill as `upFront`, Down
Payment reprints it entire — each with a provenance mark that explains what
"estimate" means and nothing about where the number came from. Principle 3 says
every figure traces; these did not. The link is that figure's missing provenance,
and discovery is the side effect rather than the purpose.

A link ships only if it passes one of two tests:

- **Trace** — this panel shows a figure that *is* another page's answer.
- **Verdict** — this page's current state creates a question another page answers.

And then:

1. **At most two SENTENCES per page**, counted on the rendered page in each
   state, not in the source: two verdict links can be mutually exclusive and a
   static count reads them both. Trace labels are capped separately — see below.
2. **Verdict links render only in their state.** A session with no problem sees
   no invitations, because it has no question.
3. **Last line of a panel, a note under the row it traces, or the row's own
   label.** Never in the answer head, never in a closed row's line, never a
   section of its own — those belong to this page's own computation.
4. **A figure travels only when its inputs were answered**, and only out of a
   `src/domain` function. Down Payment's "$0 available" must never travel: it
   would assert an empty bank account.
5. **The sentence has to be worth reading unclicked.** No "learn more", no
   "explore", no benefit claims — name what the other page computes. A test bans
   the vocabulary in both locales.

This is **not** a second disclosure mechanism: §8 forbids a second way to
*reveal*, and a link reveals nothing. `Provenance` has been an inline `Link`
inside a `PanelRow` since v2, so this is the established pattern.

**The second shape: the row's own label (`TraceLabel`).** On a row whose figure
literally IS another page's answer, the sentence is the wrong instrument — it
adds a line of prose to say what the label already says, and rule 1 then spends
one of a page's two sentences on a restatement. So on those rows the *words that
name the figure* become the link: Down Payment's `Closing costs` is
`closingTotal().total`; Affordability's `Principal and interest` is
`amortization().firstPayment` — the same loan through the same `payFactor`, not
"related to" but identical to the dollar, and it links to
`/amortization#payment` so the reader lands on the section deriving it. The
label is the *existing* message key, so this shape writes no copy at all, in
either locale, and the accessible name is by construction the name the row
shows.

It is **trace only, never verdict**: a verdict is a claim about the reader's
situation and needs a sentence to make it; a label cannot make a claim, which is
exactly why it cannot editorialise. Rules 3–5 hold unchanged; rule 5 comes free.

Rule 1 does not: trace labels are capped **at most one per panel**, counted
separately from sentences. The two-per-page cap exists to stop sentences piling
up into a related-links block, and a linked label cannot pile up into anything —
it occupies no space that was not already spent and adds no prose. Counting them
together would mean a page could buy a link on the words naming its figure only
by giving up a sentence saying something the reader cannot otherwise learn. Both
caps are enforced on the rendered page in `src/app/page-contracts.test.tsx`,
which also fails on any tool-route link declaring neither shape, so the split
cannot be used to smuggle one in.

Inline targets are exempt from §7's 44px floor per WCAG 2.5.8, and padding these
into blocks would put a finger-height tap target inside a 13.5px derivation row.
They stay inline.

**Deliberately absent: Affordability → Rent vs Buy.** A "have you considered
renting" line under a declined verdict is the product editorialising about the
reader's life. Renters get a front door — Home's second CTA, and the nav's
`afford` group — not a consolation exit on a buying page.

### 5.1 Why the gap band's markers sit at three heights

Comfort, ceiling and target routinely land within a few percent of one another. The
previous version positioned all three labels by value in one band of pixels and they
overlapped into unreadable text. Here comfort sits above the bar, target below it, and
the ceiling is pinned to the right edge — the top of the scale by definition, so it can
never collide with the two markers that move.

### 5.3 The ask, where there is no answer

Nine jurisdiction × property-type combinations have no published benchmark price —
the three territories at either property type, and PEI, Halifax and Saskatoon
condos — and six records carry no rent, because CMHC suppresses every Yukon cell
and does not survey Nunavut. A screen with no price is not a screen with a small
answer; it is a screen with none.

- **`AnswerHead` renders without a figure.** No "$0" and no em-dash placeholder:
  the first is a claim about a market and the second reads as a rendering fault
  (§5's own note on the Rent vs Buy stat). The sentence takes the hero's slot at
  24/28px, and the sub-line asks for the number.
- **The sections go with it.** Every one of them derives from the price, and a
  derivation of nothing is not a shorter derivation. The INPUTS stay exactly where
  they were, because that is where the ask is answered.
- **The field asks in place, at the size of the benchmark hint it replaces.** Same
  quiet note under the same control — not a banner, not a modal, not a second
  disclosure gesture (§1, §8). And it suggests nothing: a placeholder is a
  suggestion, and "0" suggests a free house.
- **Affordability is the one page that keeps its answer**, because its hero is the
  price the reader's INCOME supports and no benchmark stands behind it. It drops the
  three checks, the two price-derived stats and the verdict sentence.
- **A figure nobody publishes never takes the jurisdiction's name.** "Typical for
  Nunavut" for a rent CMHC never surveyed is the invented figure this product exists
  not to ship; where nothing is published the tag says so instead.

## 6. Motion

One keyframe: `v2-pulse`, 0.5s ease-out, keyed to a jurisdiction change so the answer
visibly re-computes. Nothing else animates.

`prefers-reduced-motion: reduce` zeroes every animation and transition globally, with
**one exception**: `v2-pulse` is exempt and keeps its fade.

Reduced motion means less motion, not less feedback. The pulse is the only signal that the
answer re-computed, and zeroing it left a jurisdiction change completely silent. It is
`opacity: 0.35 → 1` — opacity only, nothing that moves — and a half-second fade is the
canonical *safe substitute* under this query rather than something it exists to suppress.
An earlier pass swapped it for a `step-end` cut, reasoning that this removed position and
scale; there was never any position or scale, and a hard luminance step is a worse stimulus
for a photosensitive reader than the fade. Exempting it is the whole fix.

## 7. Accessibility

WCAG 2.1 AA where practical — a working convention, not a claim anyone may make
externally (see PRODUCT.md).

- Contrast is enforced by test across every foreground × surface × theme, **including
  `--acbg`**. That surface was outside the sweep until the rent-vs-buy table tinted the
  reader's own row with it, at which point `--ink3` on it measured 4.44:1 — under AA, on a
  pairing nothing in the app used yet. `--acbg` moved two points lighter (`#ECECFD` →
  `#EEEEFD`, imperceptible) so the palette is safe to combine freely rather than safe only
  in the combinations that happen to exist today.
- 44px minimum touch targets below `sm`; 16px control floor everywhere. Where a control is
  deliberately smaller than 44px — the *Expand all* pill is 32px by design — the target is
  reached by an invisible `after:` hit area rather than by growing the control, so the
  geometry stays and the reach is still there.
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
  - The ban is on a second way to **reveal**. A plain `<section>` with an `h2` that
    hides nothing — Closing Costs' and Down Payment's inventories of what the page does
    *not* price — is not one: it has no trigger, no state and nothing behind it, and it
    is a standing statement about the computation rather than part of it. That is why it
    is deliberately absent from `src/lib/sections.ts`, which registers the page's own
    computation. If it ever grows a control, it has become a section and belongs there.
