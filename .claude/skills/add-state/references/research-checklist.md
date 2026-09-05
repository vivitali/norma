# Research checklist — publishers, record shape, confidence

Modelled on `docs/superpowers/research/2026-09-03-us-texas-houston-figures.md`. Produce the same
shape of document for the new state/metro: a summary table, then one numbered section per figure
citing publisher, document, URL, `asOf`, `conf`, and a caveat wherever the read was indirect.
Commit it to `docs/superpowers/research/<date>-us-<state>-<metro>-figures.md` before writing any
`src/domain` code.

## Preferred publisher, by figure category

| Category | Preferred publisher | Fallback | Notes |
|---|---|---|---|
| State income-tax brackets (new state only) | State Department of Revenue / Comptroller / Franchise Tax Board's own published bracket table for the current tax year | A state's own constitution/statute text if it has no income tax (quote the article, don't just assert it) | Some states (Texas, Florida, Washington) have none — confirm this from the state's own constitutional or statutory text, not a listicle. |
| Real-estate transfer tax / mortgage recording tax | State Department of Revenue or the specific statute (state legislature's own codified-statutes site) | Secondary tax-law summary, graded `medium`, with a note recommending a follow-up primary-text check | Texas prohibits both by constitutional amendment (Art. VIII §24-a); a new state's regime may differ in mechanism (percentage, per-thousand, tiered) — do not assume Texas's shape. |
| County/city/school-district property-tax rates | The taxing entity's OWN adopted-rate notice or tax-rate page (county tax office, city clerk, independent school district, community-college district — fetched directly, one page per entity) | A county appraisal district's summary page, if it reproduces the adopted rates verbatim | Combine entities the way Houston's dossier does (C3): sum each entity's own adopted rate, cite each entity's own page separately, and total transparently. |
| Homestead exemption / assessment-growth cap | State legislature's own statute text, or the county appraisal district's official exemption notice | Ballotpedia or a Lt. Governor's office statement, for a RECENTLY changed exemption amount, corroborated against a second independent source | Confirm which TAXING ENTITIES have adopted any local-option exemption — a state-level exemption amount does not automatically apply to every overlapping entity (see the school-district-only trap in SKILL.md). |
| Metro sale-price benchmark (`bench`) | The metro's own REALTOR® association's monthly market report (published, dated, with a clear metric — median vs average) | Zillow ZHVI or a comparable index, ONLY where the local board publishes nothing, with `metric` disclosing the substitution | Boards commonly block bots (PerimeterX, Cloudflare challenge). A text-extraction proxy of the SAME URL still counts as reading the publisher's own page — record the access method in the dossier note so the next person doesn't retry a doomed plain fetch. |
| Rent benchmark | HUD Fair Market Rent, 2-bedroom, for the metro's FMR area — the metro-WIDE figure, not a Small Area (ZIP-level) figure, unless the metro genuinely has no metro-wide figure published | — | URL pattern: `https://www.huduser.gov/portal/datasets/fmr/fmrs/FY<year>_code/<year>summary.odn?cbsasub=METRO<cbsa>M<cbsa>&selection_type=hmfa&year=<year>&fmrtype=Final`. Needs a browser-like `Referer` header or it returns an empty response — a plain fetch without one will falsely suggest "no metro-wide figure exists." Find the metro's CBSA code via HUD's own area search first. |
| Title insurance regime | State insurance regulator's own promulgated-rate page or rate manual (a formula, ideally, not just a headline number) | — | Confirm whether the STATE has a promulgated/regulated rate (Texas: TDI sets one schedule for everyone) or a competitive market (most states) — this changes whether "the rate" is one number or a range you must disclose as such. |
| Homeowners insurance average | State insurance department's own market-overview or rate-filing summary page | A national rate-comparison aggregator, graded `assumption`, with a note naming it as such | A statewide average is not county-specific; say so, the way Houston's dossier flags Harris County's hurricane/flood exposure as plausibly above the state figure. |
| Conventional/FHA loan terms, PMI mechanics, DTI guidelines | These are FEDERAL, not state — do not re-research them per state. Confirm they still match `rules/us.ts`'s existing `programs`/`gds`/`tds` fields rather than re-deriving. | — | Only re-research if the new state has a state-specific first-time-buyer program (many states run their own down-payment-assistance programs) worth modelling — treat that as a separate, explicitly scoped addition, not a silent scope creep into this skill's run. |

## Per-figure record shape

Capture every figure as:

```
- Value: <number, with explicit unit — fraction or percentage, dollars or dollars-per-$100, etc.>
- Publisher: <organization>
- Document: <title of the specific page or PDF>
- URL: <the exact URL fetched or proxied>
- asOf: <the date the SOURCE says it's effective/adopted, not today's date>
- conf: <high | medium | low | assumption | none>
- Caveat: <how it was accessed if not a direct fetch (proxy, mirror, secondary synthesis);
  what's unconfirmed; what a follow-up pass should re-check>
```

## The `conf` rules (same scale as `src/domain/types.ts`'s `Confidence`)

- **`high`** — read directly off the publisher's own page or document, the exact number appearing
  verbatim where you looked. A text-extraction proxy of the SAME URL still counts as the
  publisher's own page. A secondary site that "reports" or "summarizes" the number does NOT count,
  even if it names the primary source correctly — go to the primary URL yourself.
- **`medium`** — corroborated by secondary sources, or the primary source was fetched but the
  document itself is ambiguous, stale, or doesn't specify something material (Houston's homeowners
  insurance: TDI's own page, fetched directly, but it doesn't say which policy form the average
  blends — that gap is what keeps it `medium` despite being a direct fetch).
- **`low`** — derived or inferred from something published, not itself published as a finished
  number (an assessment ratio computed as one published figure divided by another).
- **`assumption`** — nobody publishes this at all; a modelling default, chosen deliberately and
  disclosed. MUST carry a `note` explaining what it rests on (a cited range's midpoint, a
  commonly-repeated rule of thumb, an existing Canadian-record convention carried over for lack of
  a US-specific benchmark). "No citation" is not the same as "unsupported" — say what the default
  is based on.
- **`none`** — nobody publishes it and none will be invented. The field must be `null` or absent,
  never populated with an invented number. If the calculator cannot run without a value here,
  that's a sign the field should be `assumption` with a disclosed default instead, not `none`.

**Never let a figure ship at a grade higher than the dossier itself supports.** If the dossier's
own summary table already grades an item `medium`, the record's provenance entry for that field
must also say `medium` — copying only the publisher's NAME into `src` while silently upgrading the
`conf` field is exactly how Houston's `fees.titleIns` shipped `high` on a figure the dossier never
actually confirmed at that grade.
