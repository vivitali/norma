---
name: add-state
description: Use when onboarding a new US state or metro into AffordMath's (norma's) domain data — adding state-level income-tax/transfer/homestead/title rules to rules/us.ts, or a new jurisdiction record (a metro) under src/domain/jurisdictions/. Triggers on "add Dallas", "add a Texas metro", "add California", "add Los Angeles", "add a new state", "onboard <state/metro>". Runs the repeatable research -> implement -> gate loop the US-market spec calls for, one state or metro at a time.
---

# /add-state — onboard a US state or metro

Adds one US state or metro to norma's domain layer, the way `docs/superpowers/specs/2026-08-29-us-market-design.md`
("implementation order," step 5) asked this skill to be written: **from what building Houston
actually required**, including three review findings on PR #46 that shipped anyway and are the
traps this skill exists to forbid — a fraction fed where a percentage was expected (PMI's
auto-termination month understated by half), a $100 fee graded `high` when the dossier only
supported `assumption`, and a provenance note quoting the wrong dollar figure. Every trap below
is a real defect this codebase already shipped once.

`src/domain/jurisdictions/houston.ts` is the template. `src/domain/rules/us.ts` is the state-level
rules record (currently Texas-only: `marginal.TX` is the complete federal bracket table, since
Texas has no state income tax). Read both before starting, and read
`docs/superpowers/research/2026-09-03-us-texas-houston-figures.md` for the dossier shape and its
own confidence grading — that dossier is the closest thing to a worked example of Phase 1 below.

**Never paste Houston's numbers as a default for a new record.** Every figure here is
jurisdiction-specific; a Texas number in a California record is not a placeholder, it is a wrong
answer with a citation attached.

## Phase 0 — scope: new state or new metro?

Ask which this is before touching anything.

**New metro in an existing state** (e.g. Dallas, given Texas already ships): only a new
`src/domain/jurisdictions/<id>.ts` record. State-level facts already on `rules/us.ts` —
`marginal.<STATE>`, and whatever of transfer tax / title-insurance regime / homestead structure
you hardcoded into Houston's record rather than shared — do not change. But do not assume every
state-level fact Houston encodes is actually state-level: `houston.transfer = []` is a TEXAS fact
(no state real-estate transfer tax) that a second Texas metro correctly inherits, but Houston's
combined property-tax rate, its specific homestead-exemption confirmation (only the HISD portion
is confirmed), and its recording fee are **Harris-County-specific** and must be re-researched for
the new metro's own county. Read every field in the template metro's record and ask "is this a
Texas fact or a Houston/Harris-County fact?" before copying it.

**New state**: everything above, plus:
1. `marginal.<STATE>` in `rules/us.ts` — that state's own income-tax brackets, or a note that it
   has none (Texas, Florida, etc. — verify, don't assume every new state is a no-income-tax state).
2. `StateCode` in `src/domain/types.ts` — widen the union (`"TX" | "CA"`).
3. `VALID_STATES` in `src/domain/jurisdictions/index.test.ts` — widen the set, or the new
   record's region-code test fails.
4. The state's own transfer-tax, recording-tax, homestead/assessment-cap and title-insurance
   regime — these might not fit the shapes Texas exercises. Texas is transfer-tax-free with a
   homestead assessment cap; a state that levies BOTH a transfer tax and has no assessment cap
   exercises different corners of `TransferLine`/`PropertyTax` than Houston did. Check
   `src/domain/types.ts`'s `TransferLine`/`Rebate`/`PropertyTax` shapes actually express the new
   state's law before writing the record — if they don't, that is a domain-type change, which is
   bigger than this skill and needs its own design pass, not a record shoehorned into the wrong
   shape.
5. If mortgage-insurance or DTI conventions differ meaningfully by state (they generally don't —
   PMI, conventional/FHA minimums and DTI guidelines are federal), confirm rather than assume.

Either way, the first metro in a new state is still a new jurisdiction record — Phases 1-3 below
apply to it regardless of which case you're in.

## Phase 1 — research

Read `references/research-checklist.md` in full before fetching anything: it has the preferred
publisher for every figure category (state comptroller, county appraisal district, the metro's
REALTOR® association, HUD's FMR system, the state title-insurance regulator, the state insurance
department), the record shape to capture per figure, and the `conf` grading rules.

**The dossier is committed before any code.** `docs/superpowers/research/<date>-us-<state>-<metro>-figures.md`,
same format as the Houston dossier — a summary table, then one section per figure with its
publisher, document, URL, `asOf` date, `conf`, and a caveat where the fetch was indirect. This is
not optional ceremony: `houston.ts`'s three review findings all trace to a dossier entry that was
either misread (`$1,320` copied where the dossier's own corrected figure was `$1,573`) or
overstated (`fees.titleIns` shipped `high` when the dossier's own B6 row graded "who pays it" only
`medium` and named no dollar figure at all for the rate itself) — the dossier existed, it just
wasn't the last word consulted before the number went in the record.

Boards and regulators routinely block bots (HAR returned HTTP 403 to a direct fetch; the fix was a
text-extraction proxy on the SAME URL — record the proxy method in the dossier note, not just the
URL, since a plain fetch of that URL will fail for the next person). HUD's FMR Documentation
System returns an empty response without a browser-like `Referer` header; with one, it resolves to
`https://www.huduser.gov/portal/datasets/fmr/fmrs/FY<year>_code/<year>summary.odn?cbsasub=METRO<cbsa>M<cbsa>&selection_type=hmfa&year=<year>&fmrtype=Final`
— substitute the new metro's own CBSA code (findable via HUD's area-name search) and fiscal year.

## Phase 2 — implement

In this order:

1. **`src/domain/jurisdictions/<id>.ts`** — copy `houston.ts`'s structure (see
   `references/record-template.md` for an annotated, number-free skeleton). Every field's
   provenance entry cites the new dossier's own item numbers, the way Houston's cites the Houston
   dossier's A/B/C items. Register it in `src/domain/jurisdictions/index.ts`'s `jurisdictions`
   array.
2. **`messages/{en,fr,uk,es}.json`** — `Jurisdictions.<id>` and `Jurisdictions.at.<id>` in **all
   four** catalogues, and the per-language rule that applies to THIS name, not a rule borrowed
   from another language:
   - **en** — byte-identical to the bare name.
   - **fr** — decide whether this name takes an article (every CA province/territory does, no
     city does — a US state or metro needs its own judgement call, not an assumed "no article"
     default).
   - **es** — decide per name; not predictable from the form (see CLAUDE.md's own examples).
   - **uk** — the hard one. «для» governs the genitive, the NAME inflects, and cities are NOT
     exempt: Houston's `at.houston` is «Х'юстона», the settlement genitive (`-а`), not the bare
     «Х'юстон». A STATE or region takes the `-у` territory genitive instead (parallel to
     Нунавуту). Get this from a native-Ukrainian-grammar check, not by pattern-matching Houston's
     ending onto a different name — spelling does not predict which suffix applies (CLAUDE.md
     says this explicitly). `messages/parity.test.ts` only checks that every id exists in both
     tables, not that the grammar is right, so a wrong-but-present entry passes silently.
3. **`rules/us.ts`** — only if Phase 0 said "new state": add `marginal.<STATE>`, and provenance
   for it, following the existing `marginal.TX` entry's shape and comment.
4. **`<id>.test.ts`** (modelled on `houston.test.ts`) — an INDEPENDENT hand-computed literal for:
   - property tax after every exemption you modelled, computed by hand from the nominal rate and
     exemption amount, not by re-deriving `propertyTaxAnnual()`'s own formula and asserting
     agreement with itself. `houston.test.ts` shipped exactly that self-referential test, and a
     reviewer had to replace it with `expect(propertyTaxAnnual(houston, 340000)).toBeCloseTo(5979.81, 2)`
     — a number computed on paper, independent of the implementation, before that test could catch
     anything. Do the arithmetic by hand (or in a scratch calculation you show your work for) and
     hardcode the result.
   - any transfer or title-insurance formula, the same way `houston.test.ts` reproduces the
     dossier's own $2,015 worked example on a $350,000 policy.
5. **A golden-test entry** in `src/domain/golden.test.ts`'s "golden: US" section — `closingTotal`,
   `affordability`, `amortization`, `rentVsBuy`, `scenario` on the new jurisdiction, `toMatchSnapshot()`.
6. **Nothing else to touch for `line-keys.test.ts` or `provenance.test.ts`/`index.test.ts`** —
   both iterate `jurisdictions`/`RULES` automatically. What fails, and why, if a step above is
   skipped:
   - A line-item or credit key with no catalogue entry in all four locales fails
     `jurisdictions/line-keys.test.ts` ("resolves every key for `<id>`") — this is the ONLY net
     for keys the Closing Costs page resolves dynamically (`t(item.key)`), which no typecheck sees.
   - A provenance entry keyed to a field that doesn't exist on the record, or a `conf: "none"`
     entry with a non-null value, or a `conf: "assumption"` entry with no `note`, fails
     `jurisdictions/index.test.ts`'s provenance block.
   - A new top-level field name on the record (anything beyond what Houston already introduced —
     `insurance`, `propTax.exemptions`) that `src/lib/provenance-view.ts`'s `GROUP_OF_PREFIX` table
     doesn't know about returns `null` from `groupOf()` and fails `provenance-view.test.ts` — add
     the prefix there before it ships, or the figure cannot render on `/sources` at all.
   - A `StateCode` you forgot to add to `VALID_STATES` in `jurisdictions/index.test.ts` fails
     "has a valid region code on every jurisdiction."

**The traps, restated as a checklist — verify each one explicitly, don't just intend to:**

- **State every rate field's unit in the provenance note or a code comment: fraction (`0.0666`)
  or percentage (`6.66`).** `rentVsBuyToMaturity()` fed `financing()` a fraction where
  `FinancingInput.contractRate` expects a percentage — 0.0666 read as 0.0666%, not 6.66% — and
  understated PMI's auto-termination month by roughly half. This is the SECOND time this codebase
  has shipped exactly this confusion. If your new record or any engine change touches a rate that
  crosses a function boundary, write a test that asserts the unit, the way
  `rules/us.test.ts`'s "contractRate unit" test now does.
- **The school-district-only homestead exemption pattern.** A homestead exemption confirmed
  against ONE taxing entity's portion of a combined rate (Houston: HISD's $140,000, confirmed
  `high`) must not be applied to the WHOLE combined rate just because the whole rate is what the
  reader sees. `PropertyTax.exemptions.appliesToRate` exists to name the slice; if your new
  metro's exemption is confirmed against a different subset of entities, say which ones in the
  `note`, the same way Houston's does, and do not silently widen the exemption to entities whose
  adoption you could not confirm.
- **`transfer: []` is a claim, not a default.** Only use it where the dossier confirms the state
  genuinely levies no transfer or mortgage-recording tax (Texas, per its own constitutional
  provision). If the new state DOES levy one, model it as a real `TransferLine`.
- **Never promote a figure past the dossier's own grade.** If the dossier read something via a
  WebSearch synthesis rather than a direct fetch of the publisher's page, it is `medium` at best —
  copying the publisher's name into `src` does not upgrade a secondary read to `high`. Houston's
  `fees.titleIns` shipped `high` on exactly this mistake: the publisher (TDI) was real, but the
  specific $100 rate wasn't printed anywhere in the fetched page.
- **The provenance `note` must quote the SAME number as the field.** Houston's `rent` field held
  `1573` while its own note said "`$1,320`" — a different bedroom count's figure, transcribed into
  the wrong note. This renders VERBATIM on `/sources`; a reader-visible number and its own
  citation disagreeing is exactly the class of error this product exists to prevent. Re-read every
  note against its field's actual value before committing.
- **An interpretive claim in a `note` needs a real citation, exactly like a dollar figure.** A
  note that says "the statute applies the exemption to the whole school levy" is a claim about
  law, and it renders verbatim on `/sources`. Austin's first draft wrote "resolved by reading the
  statute's text directly" without having fetched it; the reviewer caught it, and the fix was to
  fetch Tax Code §11.13(b), quote it, and record it at its own provenance path
  (`propTax.exemptions.0`, graded on its own). If you did not read it, do not say you did — grade
  it `medium` and say what you read instead.
- **`metric` disclosure for `bench`.** Say explicitly whether a benchmark is a median, an average,
  or an index (HAR publishes a median; some boards publish averages) — CLAUDE.md's own "raised"
  item on this dataset already flags that mixing metrics without disclosure is a standing
  liability, not a hypothetical one.
- **A new `RentBasis` only if the quantity genuinely differs**, not for a new publisher of the
  same quantity. `fmr2br` exists because HUD's FMR is a 40th-percentile-of-all-dwellings figure,
  a different statistic from CMHC's apartment average — not because it's American. If the new
  metro's rent figure is also an FMR, reuse `fmr2br`; don't mint a third value for the same shape
  of number.

## Phase 3 — gates and PR

1. `scripts/check` — must be green (lint + typecheck + full unit suite).
2. `scripts/verify-prerender` — no route changes are expected from this skill (a jurisdiction is
   data, not a page); this gate should pass unchanged. If it doesn't, something touched routing by
   accident.
3. **Hand-compute three figures before calling this done**, independent of the code:
   - Principal & interest on a representative purchase at the record's own rate and term.
   - Property tax after every exemption you modelled, at the record's own benchmark price.
   - Title insurance (or whatever the state's closing-cost centerpiece is) on the same purchase.
   Compare each by hand against what the engine returns. This is the same discipline
   `houston.test.ts`'s corrected test now encodes — do it before review, not only in the test file.
4. Invoke the `reviewer` subagent on the diff. Every review-worthy defect in Houston's own PR
   (#46) was exactly the class this Phase 2 checklist now names explicitly — expect the reviewer
   to check for recurrences of the same three, and address every finding before proceeding.
5. `scripts/test`, then `gh pr create`.
6. **PR body lists every `assumption`- and `medium`-confidence figure the record ships, and why**
   — the format Houston's own PR #46 description used ("Assumption/medium figures shipped, and
   why," one bullet per figure, naming the dossier item and the reason it couldn't be sourced
   higher). A figure that is `none` should not appear in the record with a value at all; if one
   does, that's a bug, not a disclosure.
