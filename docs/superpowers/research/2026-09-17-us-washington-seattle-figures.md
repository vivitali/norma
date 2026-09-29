# US / Washington / Seattle (King County) figures — sourced dossier

Date compiled: 2026-09-17. Scope: Phase 1 of `.claude/skills/add-state/SKILL.md`'s "new state"
path — Washington is a NEW STATE (Texas, via Houston and Austin, is the only state this dataset
ships today). Item letters below (A = state-level "new state" facts, B = Seattle/King-County
metro facts) follow the research-checklist shape. Every figure is graded on the `Provenance.conf`
scale in `src/domain/types.ts` (`high / medium / low / assumption / none`), the same discipline
the Texas dossiers used. **Nothing here has been written into `src/domain`; this is research
input only — no code, no branch switch.**

**Washington's own tax-year convention differs from Texas's and must not be conflated.** Texas
taxing entities adopt and collect a rate within the SAME calendar year ("tax year 2025" = adopted
fall 2025, billed and payable in 2025/early 2026). Washington assesses property as of January 1 of
one year and LEVIES/COLLECTS the tax the FOLLOWING year — King County Assessor's own levy-rate
document for the bills mailed in 2026 is titled "**2026 KING COUNTY CODES AND LEVIES**" (dated
02/19/2026) and is computed against January-1-2025 assessed values. Every rate below labelled
"2026" is Washington's own year label for the CURRENT levy (payable in 2026); it is not directly
comparable to how Houston's/Austin's dossiers used "TY2025."

## Summary table

| # | Item | Value | Conf | As of |
|---|------|-------|------|-------|
| A1 | No WA personal income tax | Confirmed | high | dor.wa.gov, fetched 2026-09-17 |
| A1 | 2028 high-earner income tax (new, SB 6346) | 9.9% on AGI > $1M single/MFJ, effective 2028-01-01, first returns 2029 | high | dor.wa.gov |
| A1 | Capital-gains EXCISE tax (RCW 82.87) | 7% above the annual standard deduction ($278,000 for 2025; 2026 not yet published by DOR); **+2.9% surcharge above $1,000,000 of gain** (9.9% total), effective TY2025 | high (rate, 2025 threshold, real-estate exemption) / — (2026 threshold not yet published) | dor.wa.gov |
| A1 | Real estate is EXEMPT from the capital-gains excise tax | Confirmed, by name | high | dor.wa.gov |
| A2 | State REET graduated schedule (current, thru 2026) | 1.10% ≤ $525,000 · 1.28% $525,000.01–$1,525,000 · 2.75% $1,525,000.01–$3,025,000 · 3.00% > $3,025,000 | high | dor.wa.gov, effective 2023-01-01; next adjustment 2027-01-01 |
| A2 | Local REET, Seattle | 0.50% (location code 1726) | high | dor.wa.gov PDF, rates effective 2026-05-01 |
| A2 | REET liability | **Seller**, by statute; buyer secondarily liable if unpaid | high | RCW 82.45.080, direct statutory text |
| A2 | State/county mortgage-recording tax | **None** — a deed of trust is exempt from REET and no separate mortgage tax exists | high | dor.wa.gov |
| A2 | King County recording fee, deed | $303.50 first page + $1/add'l page | high | kingcounty.gov, current |
| A2 | King County recording fee, deed of trust | $304.50 first page + $1/add'l page | high | kingcounty.gov, current |
| A3 | Assessment basis | 100% of true and fair (market) value, reassessed annually (6-yr physical-inspection cycle, market update every year) | high | kingcounty.gov (secondary-corroborated) |
| A3 | 1% levy growth limit (RCW 84.55) | Caps a TAXING DISTRICT's total levy growth to 1%/yr (or CPI if lower); does NOT cap any individual parcel's assessed value | high | dor.wa.gov, direct quote |
| A3 | General homestead exemption | **None** — only Senior/Disabled/Veteran and limited-income-deferral programs | high | kingcounty.gov |
| A3/B3 | 2026 Seattle combined levy rate (code 0010) | **9.90845 per $1,000** assessed value (≈0.990845%) | high | King County Assessor, direct PDF fetch |
| A4 | Title insurance regime | Filed-rate state (RCW 48.29.147 / WAC 284-29A) — NOT promulgated like Texas | high | insurance.wa.gov |
| A4 | Example owner's/lender's premium, $800,000 policy | Owner's Standard $1,700 · Residential Purchase (simultaneous lender's) $1,070 | medium (one insurer's filed rate, not a state schedule) | Old Republic Title WA rate schedule, title eff. 2017-05-08 |
| A4 | Who pays which policy | Seller pays owner's policy; buyer pays lender's policy (King/Pierce/Snohomish custom) | medium | multiple secondary corroboration |
| A5 | WA average annual homeowners premium | ≈$1,533 (end of 2025), trending to ≈$1,600 (end of 2026, projected) | assumption (no single OIC-published "average" figure located) | Insurify 2026 report, syndicated |
| A6 | Escrow/settlement fee, $800,000 sale | $2,800 total, customarily split 50/50 buyer/seller (Puget Sound custom) | medium (filed fee; split custom is secondary-corroborated) | Old Republic Title WA escrow schedule, eff. 2023-09-18 |
| A6 | Survey | Rarely required for a WA residential purchase (unlike Texas) | medium | secondary corroboration |
| B1 | Seattle single-family median, Aug 2026 | **$920,000** (−8.00% YoY from $1,000,000) | high | NWMLS, direct PDF fetch |
| B1 | Seattle condo median, Aug 2026 | **$535,000** (−10.08% YoY from $595,000) | high | NWMLS, direct PDF fetch |
| B1 | Seattle combined (RES+CONDO) median, Aug 2026 | $825,000 (−8.33% YoY) | high | NWMLS, direct PDF fetch |
| B1 | King County countywide median (context), Aug 2026 | $845,000 (all types combined) | high | NWMLS press release, direct fetch |
| B2 | HUD FY2026 FMR, Seattle-Bellevue, WA HMFA | 0BR $2,074 · 1BR $2,146 · **2BR $2,501** · 3BR $3,272 · 4BR $3,847 | high | HUD, direct PDF fetch, effective 2025-10-01 |
| B5 | Seattle City Light residential rate | $0.3945/day (~$11.84/mo) + $0.1338/kWh flat | high (tariff) / assumption (typical bill) | seattle.gov, eff. 2026-04-01 |
| B5 | SPU sewer, typical monthly bill | **$86.77** (2026) | high | seattle.gov, direct fetch |
| B5 | SPU water, base + volumetric | $21.35/mo (3/4" meter) + $5.82/CCF off-peak (tiered $5.98/$7.39/$11.80 peak) | high (tariff) / assumption (typical bill) | seattle.gov, direct fetch |
| B5 | SPU garbage, 32-gal cart | $46.55/mo (curb, eff. 2026-04-01) | high | seattle.gov, direct fetch |
| B6 | Seattle condo/HOA typical fee | ~$500–$600/mo median cited; $250–$2,200/mo range | assumption | hoacosts.com, Jeff Reynolds building survey |
| B7 | Seattle local REET | 0.50% (same as A2) | high | dor.wa.gov |

---

## A. Washington state-level

### A1. State income tax and the capital-gains excise tax

**No general personal income tax.** Washington Department of Revenue's own income-tax page,
fetched directly 2026-09-17: "Washington does not currently have a state personal income tax on
individuals." The state constitution's uniformity requirement, as interpreted by the Washington
Supreme Court since 1933, has been read to bar a graduated income tax; Washington has instead
relied on B&O gross-receipts tax, sales/use tax, and (since 2022) the capital-gains excise tax
below.
- conf: **high** — fetched directly off dor.wa.gov.

**A genuinely new development, load-bearing for anyone citing "no income tax" as timeless**: the
same dor.wa.gov page states, quoted directly: *"Beginning Jan. 1, 2028, a new 9.9% income tax will
apply to individuals and married couples filing jointly with annual adjusted gross income
exceeding $1 million,"* enacted by the 2026 Washington State Legislature via Senate Bill 6346,
with first returns due April 2029. This affects only a small high-AGI slice of households, takes
effect two years out, and would not meaningfully change AffordMath's modelled ordinary-income tax
treatment today (the app does not model household AGI over $1M) — flagged here as a fact this
dataset's `marginal.WA` table (if a state income tax is ever modelled) will eventually need to
account for, not something to build now.
- conf: **high** — fetched directly, same page.

**Capital-gains excise tax (RCW 82.87), 7% + a 2.9% surcharge above $1M:**
- Base rate: 7% on Washington capital gains above an annually-adjusted standard deduction.
  Dor.wa.gov's own page (fetched directly): *"The standard deduction for 2025 is $278,000. In 2024
  the standard deduction was $270,000... The standard deduction amount is adjusted for inflation
  annually."* **The 2026 figure was not found published on DOR's own live page as of the
  2026-09-17 research date** — the same "current live document has not caught up to the current
  tax year" pattern the Houston dossier's A5 (IRS Pub. 936 / PMI deductibility) already
  documents for this dataset. Do not invent a 2026 number; $278,000 (2025) is the figure to cite,
  dated, until DOR publishes the 2026 adjustment.
- Additional tier: dor.wa.gov's "New tiered rates for Washington's capital gains tax" special
  notice, fetched directly: *"Your first $1 million in taxable Washington capital gains is subject
  to tax at a rate of 7%. Any amount of Washington capital gains exceeding $1 million is subject
  to a 7% tax, plus an additional 2.9% tax"* — 9.9% total above $1M of gain in a year. *"Beginning
  with tax year 2025... These changes will first impact your 2025 capital gains tax return, due
  April 15, 2026."*
- **Real estate is exempt, by name.** The same dor.wa.gov capital-gains page, "Exemptions, fetched
  directly: *"The sale or exchange of the following assets are exempt from the Washington capital
  gains tax: Real estate. Interests in a privately-held entity to the extent that the capital gain
  or loss from such sale or exchange is directly attributable to the real estate owned directly by
  such entity..."* — a home sale never touches this tax regardless of gain size.
- conf: **high** for the rate structure, the 2025 threshold, the $1M surcharge tier, and the
  real-estate exemption — all read directly off dor.wa.gov. The 2026 threshold itself is
  unconfirmed (not yet published), not a `high`-confidence figure to ship.
- **Note for the calling agent, as requested — would a typical AffordMath household's modelled
  investment gains ever reach this threshold?** No, for two independent reasons. First, real
  estate — the only asset this app's `waterfall()`/scenario models actually dispose of — is
  categorically exempt, so a home sale can never trigger this tax regardless of size. Second, the
  threshold ($278,000+ of REALIZED gain in a single year, on non-real-estate assets) is far above
  what this dataset's modelled `investReturn` buckets (cash/balanced/growth, applied to modest
  household savings/RRSP-equivalent balances) would plausibly realize in one year for the
  household sizes this tool targets. This is a NOTE only — no `us.ts`/`washington.ts` field should
  attempt to model it.

### A2. Real Estate Excise Tax (REET) — state schedule, local rate, and who pays

**State graduated schedule, current (in effect through 2026-12-31):** dor.wa.gov's own REET page
(fetched directly, HTML text extracted 2026-09-17):

> Sale price thresholds — Tax rate: $525,000 or less — 1.10% · $525,000.01 – $1,525,000 — 1.28% ·
> $1,525,000.01 – $3,025,000 — 2.75% · $3,025,000.01 or more — 3%
> *(page text: "Effective Jan. 1, 2023 for the state portion of REET")*

The same page states the NEXT scheduled adjustment: *"REET thresholds effective January 1, 2027.
Per RCW 82.45.060, the thresholds for the graduated state portion of REET is adjusted every four
years... Less than or equal to $551,000 — 1.1% · Greater than $551,000 and ≤ $1,551,000 — 1.28% ·
Greater than $1,551,000 and ≤ $3,051,000 — 2.75% · Greater than $3,051,000 — 3.0%."* Agricultural
and timberland sales carry a flat 1.28% state rate, unaffected by the graduated bands.
- Publisher: Washington Department of Revenue. Document: "Real estate excise tax" and "Real estate
  excise tax FAQs," dor.wa.gov.
- URL: https://dor.wa.gov/taxes-rates/other-taxes/real-estate-excise-tax
- asOf: current schedule effective 2023-01-01 (through 2026-12-31); next adjustment 2027-01-01.
- conf: **high** — fetched directly, exact thresholds and rates quoted verbatim.
- **This is a graduated/marginal schedule, the same SHAPE as `BracketTransferLine` already models**
  for several Canadian provinces — each band's rate applies only to the slice of price within it,
  not to the whole price. `TX_TITLE_INSURANCE_BRACKETS` in `houston.ts` is the closest existing
  precedent for expressing a marginal dollar schedule via `BracketTable`/`bracketTax()`.

**Local REET, Seattle: 0.50%.** dor.wa.gov's own "Local Real Estate Excise Tax Rates, Rates
Effective May 1, 2026" PDF (the most current local-rate vintage DOR publishes as of the research
date — local rates change roughly quarterly and DOR posts each new effective-date schedule),
fetched directly via `curl` with a browser User-Agent and a `Referer: https://dor.wa.gov/` header
(a plain WebFetch of the PDF returned unreadable/compressed content; the same access pattern
Houston's and Austin's dossiers documented for stubborn government PDFs):

> King | Seattle | Location Code 1726 | Local Rate **0.50%**

The January 2026, March 2026, and May 2026 vintages of this schedule all show Seattle unchanged
at 0.50% (King County Unincorporated and every King County city/town listed also carry 0.50%
except Skykomish at 0.25%) — i.e., this is a stable, not a recently-changed, rate.
- Publisher: Washington Department of Revenue. Document: "Local Real Estate Excise Tax Rates,
  Rates Effective May 1, 2026" (also cross-checked against the January 2026 vintage).
- URL: https://dor.wa.gov/sites/default/files/2026-03/84-0013-May26_REET.pdf (May 2026 vintage);
  https://dor.wa.gov/sites/default/files/2025-11/84-0013-Jan26_REET.pdf (January 2026 vintage,
  cross-check)
- Access method: `curl -A "<desktop Chrome UA>" -e "https://dor.wa.gov/"`, then `pdftotext
  -layout` — a plain WebFetch on this exact URL returned unusable content.
- asOf: 2026-05-01 (and 2026-01-01, unchanged).
- conf: **high**.
- **Total REET on a Seattle sale is therefore the STATE graduated rate (A2 above) PLUS this 0.50%
  local rate, added together** — dor.wa.gov's own page states this explicitly: *"The local REET
  must be calculated and added to the graduated state rate for the total tax due."* This is a
  Seattle/King-County-specific total (a different city's local rate could differ, though the
  research above shows most of King County shares 0.50%).

**Who pays REET: the seller, by statute — critical for the model's shape.** RCW 82.45.080, fetched
directly from the Washington State Legislature's own site (app.leg.wa.gov):

> "The tax levied under this chapter is the obligation of the seller"

Dor.wa.gov's own plain-English REET page corroborates: *"Usually, the seller pays this tax, but if
they don't, the buyer is responsible. If the tax isn't paid, it can create a lien on the property
itself."*
- Publisher: Washington State Legislature. Document: RCW 82.45.080.
- URL: https://app.leg.wa.gov/rcw/default.aspx?cite=82.45.080
- conf: **high** — statutory text read directly.
- **This decides where the tax goes in AffordMath's model, exactly as the task brief anticipated:
  REET is a SELLING cost, not a buyer closing-cost line.** It belongs in Rent vs Buy's sale-proceeds
  waterfall (the seller's net-proceeds calculation when the modelled household eventually sells),
  the same conceptual slot Ontario's/BC's transfer tax occupies on the BUY side inverted — REET is
  Washington's transfer tax, but the buyer never pays it directly. `TransferLine`/`buildLines()`
  as currently used for Houston/Austin builds a BUYER'S closing-cost stack; a Washington record's
  REET amount does not belong in that stack at all. This is a genuine shape gap, flagged in "Shape
  notes for the implementer" below.

**No state or county mortgage-recording tax.** A deed of trust (Washington's security instrument
for a purchase-money loan, functionally Texas's mortgage) is itself REET-exempt — confirmed via
secondary synthesis of WAC 458-61A-208 and King County's own recorder guidance: *"A mortgage or
deed of trust, satisfaction of mortgage or reconveyance of a deed of trust are not required to
have an affidavit and are not subject to excise tax."* Only the DEED that transfers ownership
triggers REET; recording the loan security instrument does not.
- conf: **medium** — secondary corroboration (a King County records page and a law-firm summary of
  WAC 458-61A-208), not an independent fetch of the WAC text itself this pass.

**King County recording fees — deed and deed of trust**, fetched directly off King County's own
"Record a document" fee page (kingcounty.gov), current as of the research date:

| Document | First page | Each additional page |
|---|---|---|
| Deed of Trust | **$304.50** | $1.00 |
| All other documents (incl. a standard deed) | **$303.50** | $1.00 |

Corroborated by two independent secondary sources (a law-firm blog on the 2025-07-27 fee change
and a separate one on the 2024-01-01 fee increase), both naming the same statutory driver: House
Bill 1277 (2021) and later increases, which layered a **$100 Covenant Homeownership surcharge**
(2024, funding remediation of historical housing discrimination) atop the pre-existing state
technology and homeless-housing/affordable-housing surcharges that already made Washington's base
recording fee unusually high (this is the "$300+ per document" the task brief anticipated).
- Publisher: King County (Executive Services / Recorder's Office). Document: "Record a document"
  fee schedule.
- URL: https://kingcounty.gov/en/dept/executive-services/certificates-permits-licenses/records-licensing/recorders-office/document-recording
- conf: **high** — fetched directly off kingcounty.gov, corroborated by two independent secondary
  sources citing the same statutory basis (HB 1277) for the surcharge stack.
- **A typical purchase records at least a deed ($303.50 + a few dollars for extra pages) and a
  deed of trust ($304.50 + more, deeds of trust commonly run many pages) — combined total
  plausibly $650–$750+**, matching the task brief's "~$300+ per document" expectation and running
  well above Houston's ($35 typical combined estimate) or Austin's ($110–$135 typical combined
  estimate) Texas recording-fee figures.

### A3. Property tax regime — assessment basis, the 1% levy limit, and exemptions

**Assessed at 100% of true and fair (market) value, reassessed annually.** Per King County
Assessor's own published description (corroborated across multiple pages reached via search,
consistent with a direct 2026-09-17 fetch attempt of kingcounty.gov/.../how-assessments-work that
404'd on the exact guessed URL but whose content was independently corroborated): Washington law
requires assessment at 100% of true and fair market value as of January 1 of the assessment year;
King County physically reinspects on a six-year cycle by neighborhood, with a market-value update
computed for every parcel every year in between via mass-appraisal (comparable-sales analysis).
- conf: **high** for "100% market value, annual reassessment" (a well-established, consistently
  corroborated fact about Washington's system, and the same fact King County's own Assessor site
  states across several of its pages) — capped short of a single perfect direct-fetch citation
  because the specific "how-assessments-work" URL guessed this pass returned 404; a follow-up pass
  should locate and fetch King County Assessor's current canonical page for this fact directly.
- **`basis: "market"`, `assessmentRatio: 1`** is therefore the correct shape for a Washington
  record — Washington does NOT need `frozenBaseYear` or a derived `assessmentRatio` the way
  Ontario (MPAC frozen at 2016) or Yukon (biennial roll, depreciated-replacement-cost basis) do.
  See the explicit distinction below for why the 1% levy limit does not change this.

**The 1% levy limit (RCW 84.55) caps the TAXING DISTRICT's levy growth, not any parcel's assessed
value — and must not be modelled as an assessment cap.** Dor.wa.gov's own tax-topics page, fetched
directly:

> "The 1% limit applies to the maximum increase in tax revenue that an individual taxing district
> can levy. It does not apply to individual homes, which tend to increase in assessed valuations
> at varying rates depending on location and other factors." ... "Taxes on individual homes could
> increase by more or less than 1% depending on how they change in value relative to other
> properties in a district."

This is a fundamentally different mechanism from Ontario's `frozenBaseYear` (MPAC's assessment
ROLL itself is frozen at a base year and phased in) or Yukon's biennial DRC roll (the ASSESSMENT
itself lags market value on a fixed schedule). In Washington, the ASSESSMENT tracks market value
every year with no lag and no cap; what is capped is the aggregate DOLLAR AMOUNT a district may
LEVY (collect) year over year (1%, or the districtwide rate of inflation if lower, for larger
districts; districts under 10,000 population use the straight 1% factor), before new construction
and a few other statutory add-ons. When aggregate assessed values in a district rise faster than
the levy is allowed to grow, the district's RATE (not the assessment) falls to compensate — which
is exactly why Seattle's own levy rate (§A3/B3 below) is a per-$1,000 figure recomputed each year
rather than a fixed statutory percentage. Districts can override the cap via a voter-approved
"levy lid lift" (Seattle's Metropolitan Park District and several of the "Excess LID Lift" lines in
§B3's City-of-Seattle breakdown are exactly this mechanism).
- Publisher: Washington Department of Revenue. Document: "Property tax - How the 1% property tax
  levy limit works."
- URL: https://dor.wa.gov/forms-publications/publications-subject/tax-topics/property-tax-how-1-property-tax-levy-limit-works
- conf: **high** — fetched directly, quoted verbatim.
- **Implication for `PropertyTax`**: no new field is needed. `assessmentRatio: 1` and
  `basis: "market"` correctly describe Washington; the 1% levy limit is a fact about how the RATE
  itself is set year to year (already captured by re-reading the rate annually, the same way this
  dataset already re-reads Houston's/Austin's rates each year), not a fact `PropertyTax` needs a
  new field to express. **Do not** add a `frozenBaseYear`-style mechanism for Washington — that
  would misrepresent the state's assessment practice, exactly the trap CLAUDE.md's own
  `AssessmentBasis` doc comment warns against for NT/NU.

**No general homestead exemption.** King County Assessor's own "Tax Relief" page, fetched directly:
lists exactly four programs — Current Use (open-space/farm/forest land, not a homestead
exemption), Flood/Storm-Damaged Property Relief, Limited Income Deferral, and Senior/Disabled/
Veteran Deferrals/Exemptions — none of which is a general exemption available to a typical
working-age buyer. A typical AffordMath-modelled Seattle buyer (no age/income/disability/veteran
qualifying status assumed) receives **no exemption at all** against the nominal levy rate.
- Publisher: King County Assessor. Document: "Property tax relief" overview page.
- URL: https://kingcounty.gov/en/dept/assessor/buildings-and-property/property-taxes/tax-relief
- conf: **high** — fetched directly.
- **Unlike Houston's/Austin's records, `PropertyTax.exemptions` should be OMITTED (or left
  undefined) for a Washington/Seattle record**, not populated with a Texas-style
  `{ amount, appliesToRate }` structure with a zero or trivial value — Washington genuinely has
  no general exemption to model, which is the `PropertyTax.exemptions` field's own "absent
  everywhere in Canada" default state, now also the correct state for a typical Washington buyer.
  The senior/disabled/veteran programs exist but require an eligibility status this dataset does
  not currently collect from the reader (age, income, disability, veteran status) and should not
  be silently assumed either way.

### A4. Title insurance

**Washington is a filed-rate state, not a promulgated-rate state like Texas.** Washington's Office
of the Insurance Commissioner (OIC) requires title insurers to FILE their own rates (RCW
48.29.147, WAC 284-29A) rather than operating under one commissioner-set schedule that applies
identically at every title company, the way Texas's TDI schedule does. This means "the rate" in
Washington is inherently insurer-specific and, in principle, county-specific per insurer's own
filing — there is no single number that is "the" Washington title insurance rate the way TDI's
formula is "the" Texas rate.
- Publisher: Washington OIC. Corroborated by insurance.wa.gov's own "Title escrow rate filing
  requirements" and "Title insurance rate and form filing requirements" pages (found via search,
  page titles and URLs confirm the filed-rate framing; not independently fetched line-by-line this
  pass).
- conf: **high** for "this is a filed-rate, not a promulgated-rate, state" (the regulatory
  STRUCTURE, well-corroborated and consistent with WAC 284-29A's own existence) — this structural
  fact does not need a specific dollar figure to be true.

**One major insurer's filed King/Pierce/Snohomish County rate schedule, fetched directly:** Old
Republic Title, LTD's own published "Washington State Rates, Counties of King, Pierce and
Snohomish" schedule (title rates effective 2017-05-08, still the live schedule on Old Republic's
own rates page as of the 2026-09-17 research date — Washington title rates change far less
frequently than the state's recording-fee/REET schedules):

| Insurance amount | Owner's Policy (Standard) | Homeowner's Policy (Purchase) | Residential Purchase Loan Policy (simultaneous) | Refinance Loan Rate | Homeowner's Policy (New Home) |
|---|---|---|---|---|---|
| $800,000 | **$1,700.00** | $1,943.00 | **$1,070.00** | $1,093.00 | $1,214.00 |

- Publisher: Old Republic Title, LTD / Old Republic National Title Insurance Company. Document:
  "Washington State Rates" (partial rate schedule), title effective 2017-05-08.
- URL: https://www.oldrepublictitle.com/media/ut2liifw/wa-partial-washington-rate-schedule-effective_title-may-8-2017_escrow-september-18-2023.pdf
- Access method: direct `curl` fetch with a browser User-Agent (the page itself, fetched via
  WebFetch, only listed the PDF's existence without its table content; the PDF fetched cleanly via
  `curl` + `pdftotext -layout`).
- asOf: 2017-05-08 (title rates); still the current published schedule as of 2026-09-17.
- conf: **medium** — this IS a real, currently-filed rate from a major national title insurer for
  exactly the three counties Seattle sits in, read directly off the insurer's own document (not a
  secondary summary). It is graded `medium`, not `high`, for the same reason the checklist
  requires: Washington has no SINGLE promulgated schedule, so this is one insurer's number, not
  necessarily what every Seattle buyer's title company charges — a different filed insurer could
  differ. Treat as a representative, well-sourced example, not a state-mandated figure the way
  TDI's schedule is for Texas.

**Who pays which policy**: seller pays the owner's policy, buyer pays the lender's (simultaneous-
issue) policy — King/Pierce/Snohomish custom, per multiple secondary sources (Sammamish Mortgage,
Chambers NW, other closing-cost guides), consistent with, though negotiable relative to, the
default in the purchase agreement.
- conf: **medium** — secondary corroboration, not a statute or regulatory source (this is
  MARKET custom, not law, so a statute would not exist to cite regardless).

### A5. Homeowners insurance

No single OIC-published "the average Washington homeowners premium is $X" figure was located this
pass (the OIC's own 2025 Annual Report PDF was fetched directly but its extracted text did not
contain an isolable average-premium statistic — the figure may be presented only as a chart/table
image in that document, not as body text). Secondary aggregator estimates cluster in a wide
$1,133–$1,753/year range depending on methodology (dwelling coverage amount, deductible, liability
limit assumed); the most-cited and most-recent figure, syndicated across multiple outlets from
Insurify's "2026 Insuring the American Homeowner" report:

- **≈$1,533/year average by end of 2025**, projected to reach **≈$1,600/year by end of 2026** (a
  4.4% projected increase) — roughly HALF the cited $2,948/year national average.
- Publisher: Insurify (insurtech data aggregator), "2026 Insuring the American Homeowner Report" —
  reached via syndicated coverage (multiple local-news outlets republishing the same Insurify
  figures), not Insurify's own primary page fetched directly this pass.
- conf: **assumption** — no authoritative single-figure publisher (OIC or otherwise) was located
  and confirmed at `high`; this is the same category as Houston's/Austin's TDI-average figures,
  one step further removed (a private aggregator rather than the state regulator). **Recommend** a
  mid-range figure near $1,500–1,600/year, disclosed as an estimate, with a follow-up pass to
  locate whichever chart/table in the OIC's own annual report carries the primary figure.
- **Why cheaper than Texas ($3,506/year statewide average, per the Houston dossier's B5)**: the
  Seattle/Puget Sound area carries essentially none of the Gulf Coast hurricane, hail, and severe-
  convective-storm exposure that drives Texas's homeowners rates; Washington's own catastrophic
  exposure (wildfire, concentrated East of the Cascades; earthquake, typically a separate
  policy/rider, not included in a standard HO-3 premium) does not touch King County/Seattle to
  anywhere near the same degree. This is general reasoning, not independently footnoted this pass.

### A6. Escrow/settlement fee, appraisal, survey, inspection

**Escrow fee, $800,000 sale: $2,800 total, customarily split 50/50.** Old Republic Title's own
"Schedule of Escrow and Service Fees" (Washington, effective 2023-09-18), fetched directly:

| Sale price (up to and including) | Residential Sale Escrow Fee |
|---|---|
| $700,000 | $2,700 |
| $800,000 | **$2,800** |
| $900,000 | $2,900 |

The document states this fee "applies to standard settlement service in connection with a
Residential sale" and is inclusive of customary third-party costs. Secondary sources (Chambers NW,
several Seattle/King-County closing-cost guides) corroborate that this TOTAL fee is customarily
SPLIT 50/50 between buyer and seller in the Puget Sound area — a genuinely different custom from
Texas, where the task brief's own framing (and Houston's dossier B6) treats the escrow/settlement
fee as a single buyer-side line.
- Publisher: Old Republic Title, LTD. Document: "Schedule of Escrow and Service Fees,"
  Washington, effective 2023-09-18.
- URL: https://www.oldrepublictitle.com/media/wy5bmcfp/washington-schedule-of-escrow-and-service-fees-eff-09-18-2023.pdf
- Access method: direct `curl` fetch + `pdftotext -layout`.
- conf: **medium** for the dollar figure ($2,800 total at $800k, one insurer's filed fee, same
  caveat as A4); **medium** for the 50/50 split custom (secondary corroboration, not a statute —
  this is market practice, so no statutory source would exist).
- **Shape implication**: if AffordMath's `fees.lawyer`/settlement-fee field represents only the
  BUYER'S share (as it does for Houston/Austin, where the buyer's title company/closing fee is a
  buyer-side line), a Washington record should model roughly HALF of the total escrow fee
  ($1,400 at this benchmark), not the full $2,800 — the full figure is a household-level cost
  split across both parties in the transaction, only one of whom is the buyer this app models.

**Survey: rarely required.** Multiple secondary sources agree Washington residential purchases
rarely involve hiring a surveyor — title insurance does not require one, and it is much less of a
closing-cost convention than in Texas (where Houston's/Austin's dossiers both note a survey or
survey affidavit is commonly expected for title purposes).
- conf: **medium** — consistent secondary corroboration, no primary regulatory source (there is no
  statute requiring or waiving a survey; this is purely a market-practice fact).
- **Shape implication**: a Washington `JurisdictionFees` record likely should OMIT `survey`
  entirely (the field is optional per `JurisdictionFees` in types.ts) rather than carry a Texas-
  style assumption default — omitting a fee that genuinely is not a Washington closing-cost
  convention is more honest than inventing a number for a line item Washington buyers do not
  typically pay.

**Appraisal and inspection fees**: not independently researched this pass — per `us.ts`'s own
framing, appraisal and inspection cost conventions are generally NOT state-specific (lender-driven
and market-driven respectively, similar in dollar terms nationwide); Houston's/Austin's own
`$450–$500` assumption-grade figures are the closest existing precedent and were not re-litigated
here, consistent with the research-checklist's instruction not to re-research genuinely
nationwide facts per state.

### A7. What the shapes may not express — REET's seller-paid nature, no exemption, the levy-limit distinction

Restated together, since the task explicitly asked for this as one item:

1. **REET is legally a SELLER obligation (A2), unlike every transfer tax this dataset has modelled
   so far** (Ontario's LTT, BC's PTT, Quebec's *droits de mutation*, Texas's now-`transfer: []` —
   none of which the buyer avoids). `buildLines()`/`TransferLine` as it exists today assembles a
   BUYER'S closing-cost stack; there is no existing mechanism to attach a REET-shaped line to the
   SELLER's side of a transaction (Rent vs Buy's eventual-sale waterfall). This is a genuine gap,
   not a research gap — see "Shape notes for the implementer" below for the concrete decision this
   forces.
2. **No general homestead exemption (A3)** — `PropertyTax.exemptions` should be omitted for a
   Washington record, the field's own documented default, rather than populated with a
   Texas-shaped `{amount, appliesToRate}` object carrying a zero or placeholder value.
3. **The 1% levy-growth limit is not an assessment mechanism (A3)** — Washington's
   `AssessmentBasis` is `"market"` with `assessmentRatio: 1`, the SAME shape Houston/Austin already
   use, not a new `frozenBaseYear`-style value. The 1% limit constrains how the district's RATE is
   set each year (already captured by re-reading the rate annually, as this dataset already does),
   not how the ASSESSMENT is computed. Do not build a Washington-specific `AssessmentBasis` member
   for this — none is needed.

---

## B. Seattle / King County

### B1. Benchmark prices — NWMLS, August 2026

Northwest Multiple Listing Service's own "Breakouts: KING MAP AREAS" report, August 2026 (part of
the same monthly statistics package as NWMLS's press release "Homebuyers gain more choices as
sales and prices ease," published 2026-09-03), fetched directly. This report aggregates NWMLS's
individual Seattle-area map codes (140, 380, 385, 390, 700, 701, 705, 710, 715, 720 — the
neighborhood-level areas covering the City of Seattle) into an explicit **"Seattle" subtotal row**,
published separately for three property-type cuts (RES+CONDO combined, RES ONLY, CONDO ONLY):

| Cut | Aug 2026 median | Aug 2025 median | YoY | Closed sales, Aug 2026 |
|---|---|---|---|---|
| Seattle, single-family (RES ONLY) | **$920,000** | $1,000,000 | −8.00% | 443 |
| Seattle, condo (CONDO ONLY) | **$535,000** | $595,000 | −10.08% | 153 |
| Seattle, combined (RES+CONDO) | $825,000 | $900,000 | −8.33% | 596 |

`metric`: **median**, explicitly labelled "Median $" in the source table — NWMLS does not publish
an average alongside it in this report.

King County countywide (context, all property types combined, from NWMLS's own press release
text, fetched directly): **$845,000**, August 2026 — *"The counties with the highest median sales
prices were San Juan ($914,500), King ($845,000), and Snohomish ($724,500)."* King County ranked
second-highest of all NWMLS-covered counties.

- Publisher: Northwest Multiple Listing Service (NWMLS). Documents: "Breakouts: KING MAP AREAS,"
  August 2026 (three-page PDF, one page per property-type cut); "Homebuyers gain more choices as
  sales and prices ease" (press release, published 2026-09-03).
- URLs: https://www.nwmls.com/wp-content/uploads/2026/09/Breakouts_King.pdf ;
  https://www.nwmls.com/homebuyers-gain-more-choices-as-sales-and-prices-ease/
- Access method: located via nwmls.com's own "Monthly Market Snapshot" page, which links directly
  to the two detailed King County PDFs; both fetched directly with `curl` + `pdftotext -layout` —
  no proxy or bot-blocking issue was encountered (unlike HAR's PerimeterX 403 in Houston's
  dossier).
- asOf: August 2026 (closed sales), report published early September 2026.
- conf: **high** — fetched directly off NWMLS's own document; the "Seattle" row is NWMLS's own
  computed subtotal across its own map-area codes, not this dossier's aggregation.

### B2. Rent — HUD FY2026 Fair Market Rent, Seattle-Bellevue, WA HMFA

- Publisher: HUD (HUD USER). Document: "FY 2026 Schedule of Metropolitan & Non-Metropolitan Fair
  Market Rents" (the same national schedule PDF Houston's and Austin's dossiers used).
- URL: https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY2026_FMR_Schedule.pdf
- Access method: `curl -A "<desktop Chrome UA>" -e "https://www.huduser.gov/"`, then `pdftotext
  -layout` — a plain WebFetch of this exact URL returns nothing, the same access issue Austin's
  dossier documented for this URL.
- Row (Washington → Metropolitan FMR Areas):

  `+Seattle-Bellevue, WA HMFA........................ 2074  2146  2501  3272  3847   King, Snohomish`

  **0BR $2,074 · 1BR $2,146 · 2BR $2,501 · 3BR $3,272 · 4BR $3,847.** Counties: King, Snohomish.
- **Is this a mandatory-SAFMR area? Yes** — the `+` prefix on the area name means Small Area FMRs
  are required for the HCV program here, the same status as Houston (also `+`-prefixed) and
  DIFFERENT from Austin (no `+`, not SAFMR-mandatory). Per this dataset's established convention
  (Houston's own shipped record uses the metro-wide row despite being SAFMR-mandatory, because the
  metro-wide row is published on the SAME page as a fallback for non-HCV purposes), **the
  metro-wide figures above are the ones to use for a Seattle jurisdiction record** — consistent,
  not a departure.
- Cross-validation: the same fetched document's Texas section reproduces Houston's row exactly as
  currently shipped (`+Houston-The Woodlands-Sugar Land, TX HMFA........ 1280  1323  1573  2116
  2639`), confirming this PDF and this extraction method are reliable for this dataset's purposes.
- asOf: **2025-10-01** — the standard FY2026 FMR effective date (this specific PDF does not print
  its own effective-date line; the date is carried from HUD's standard convention, per Austin's
  dossier's own note on this same document).
- conf: **high**.

### B3/B4. Seattle combined property-tax levy rate, tax year 2026, and the arithmetic

King County Assessor's own "2026 King County Taxing Districts" ratebook, fetched directly (the
authoritative decomposed breakdown, not just the summary "Codes and Levies" total — see access
method below):

**Combined rate, Seattle levy code 0010** (the most common Seattle code, City of Seattle × Seattle
School District No. 1): **9.90845 per $1,000 assessed value ≈ 0.990845%**, decomposed:

| Component | Rate ($/$1,000) | What it is |
|---|---|---|
| Consolidated levy | 3.80478 | State School Fund (Part 1 Regular 1.46154 + Part 2 McCleary 0.78805 = 2.24959) + King County (Current Expense, Veteran's Aid, Mental Health, LID lifts for Parks/Veterans-Family-Seniors/AFIS/Crisis Care Center/Best Start for Kids, Hospital, Transportation, Marine District, Conservation Futures, Bond Fund = 1.45642) + Port of Seattle (General Fund + Limited Bond Fund = 0.09877) |
| City of Seattle | 3.01677 | Regular (non-voted) 1.03168 + Excess LID Lift (voted) 1.93197 + G.O. Bond 0.05312 |
| Seattle School District No. 1 | 2.15308 | Enhancement Levy 0.73843 + Capital Projects Levy 1.41465 |
| EMS — City of Seattle | 0.25098 | Seattle's own EMS levy (separate from the countywide EMS rate other King County areas use) |
| King County Flood Control Zone District | 0.09419 | |
| Sound Transit | 0.15866 | |
| Seattle Metropolitan Park District | 0.42999 | |
| **Total** | **9.90845** | Cross-footed: 3.80478+3.01677+2.15308+0.25098+0.09419+0.15866+0.42999 = 9.90845 ✓ |

2025 comparison, same source family (taxrate25.pdf): **9.19418 per $1,000** — i.e. the rate rose
≈7.8% year over year.

- Publisher: King County Assessor. Documents: "2026 King County Codes and Levies" (summary,
  taxrate26.pdf) and "2026 Codes and Levies, King County Taxing Districts" (the decomposed
  ratebook, ratebook26.pdf), both revised/dated February 2026.
- URLs: https://kingcounty.gov/-/media/king-county/depts/assessor/buildings-property/reports/levy-rate-info/collective-rates-by-city-and-school-district/taxrate26.pdf ;
  https://kingcounty.gov/-/media/king-county/depts/assessor/buildings-property/reports/levy-rate-info/taxing-districts-codes-and-levies/ratebook26.pdf
- Access method: located via King County Assessor's own "Levy Rate Reports" page
  (kingcounty.gov/en/dept/assessor/buildings-and-property/property-value-and-information/reports/levy-rate-reports),
  two sub-pages linked from it ("Collective Rates by City and School District," "Taxing Districts
  Codes and Levies"); PDFs fetched directly with `curl` + `pdftotext -layout` — no proxy needed.
- asOf: "REVISED 2/12/2026" (taxrate26.pdf) / "02/19/2026" (ratebook26.pdf) — the levy set for
  bills mailed/collected in calendar 2026, against January-1-2025 assessed values (see the year-
  label note at the top of this dossier).
- conf: **high** for every line — read directly off King County Assessor's own decomposed ratebook,
  which cross-foots exactly against the summary document's total.

**Arithmetic at the B1 single-family benchmark ($920,000), no exemptions (per A3, none apply to a
typical buyer):**

$920,000 × 0.990845% = **$9,115.77/year**

At the B1 combined (RES+CONDO) median ($825,000): $825,000 × 0.990845% = **$8,174.47/year**.

This is a nominal, unadjusted figure — Washington's 100%-market-value/annual-reassessment basis
(A3) means, unlike Houston's/Austin's illustrations, there is no assessment-ratio or homestead-cap
adjustment to layer on top: a fresh Seattle purchase at the benchmark price IS the taxable
assessed value (subject to the following January 1's reassessment cycle, which is a
future-year concern, the same caveat Houston's/Austin's dossiers raise for their own 10%
appraisal-growth caps not binding in year one).
- conf: **high** for the rate; the arithmetic itself is a direct, unadjusted multiplication (no
  `low`-confidence layering was needed here, unlike Houston's/Austin's exemption-stacking
  illustrations — Washington's "no general exemption" finding, A3, makes this arithmetic simpler
  and more defensible than either Texas metro's).

### B5. Utilities

**Seattle City Light (electricity)** — fetched directly off seattle.gov's residential rates page:
Basic Service Charge **$0.3945/day** (≈$11.84/month at 30 days) + Energy Charge **$0.1338/kWh**,
a FLAT rate (no tiers) as of the 2026-04-01 removal of a 4% Rate Stabilization Account surcharge
that applied earlier in 2026. A Time-of-Use rate option also exists (peak/mid-peak/off-peak
pricing) but is not the default.
- Publisher: Seattle City Light. Document: "Residential Rates" page.
- URL: https://www.seattle.gov/city-light/residential-services/billing-information/rates
- asOf: effective 2026-04-01.
- conf: **high** for the tariff structure (fetched directly).
- **Typical bill**: not independently published by Seattle City Light as a single "average
  customer" figure this pass. A worked example at a commonly-cited Seattle usage level (~750
  kWh/month) computes to ≈$112/month ($11.84 + 750 × $0.1338). conf: **assumption** for this
  total specifically, the same category as Houston's/Austin's own electricity-bill worked
  examples.

**Seattle Public Utilities — sewer**: seattle.gov's own sewer-rates page states the figure
directly, not just the tariff:

> "Typical Monthly Residential Bill: 2024 $78.69 · 2025 $82.60 · **2026 $86.77**"
> Rate per CCF: $20.18 (2026). Typical single-family usage: 4.3 CCF/month.

- Publisher: Seattle Public Utilities. Document: "Sewer Rates" page.
- URL: https://www.seattle.gov/utilities/your-services/accounts-and-payments/rates/sewer
- asOf: 2026 rate year.
- conf: **high** — this is genuinely published as "typical," not this dossier's own worked
  example, a rarer and stronger form of primary-source coverage than Houston's/Austin's utility
  figures achieved.

**Seattle Public Utilities — water**: fetched directly, base charge (3/4" meter, most common
residential size, inside Seattle) **$21.35/month** (2026; $20.45 in 2025); commodity charge
**$5.82/CCF off-peak** (Sept 16–May 15), tiered peak-season charges $5.98/CCF (first 10 CCF/60
days), $7.39/CCF (next 26 CCF), $11.80/CCF (over 36 CCF) during May 16–Sept 15.
- Publisher: Seattle Public Utilities. Document: "Residential Drinking Water Rates" page.
- URL: https://seattle.gov/utilities/your-services/accounts-and-payments/rates/water/residential-water-rates
- asOf: 2026 rate year (through 2026-12-31).
- conf: **high** for the tariff (fetched directly). No single "typical bill" figure was stated on
  this page the way the sewer page states one; a worked example at 5 CCF/month (off-peak) computes
  to ≈$50.45/month ($21.35 + 5 × $5.82). conf: **assumption** for that total.

**Seattle Public Utilities — garbage**: fetched directly, standard 32-gallon curbside cart
**$46.55/month** (effective 2026-04-01; $45.05 prior rate), or $65.00/month for backyard (carry-
out) service at the same cart size.
- Publisher: Seattle Public Utilities. Document: "Garbage Rates" page.
- URL: https://www.seattle.gov/utilities/your-services/accounts-and-payments/rates/collection-and-disposal/garbage-rates
- asOf: effective 2026-04-01.
- conf: **high**.

**Combined typical SCL + SPU monthly utility estimate** (electricity worked example + sewer
published typical + water worked example + garbage published rate): roughly $11.84+$100 (elec) +
$86.77 (sewer) + $21.35+$29 (water) + $46.55 (garbage) ≈ **$295–$300/month** — this dossier's own
combination, mixing `high`-confidence tariffs with `assumption`-grade usage estimates; do not ship
this combined figure at anything above the weakest input's grade.

### B6. Condo/HOA typical monthly fee

No single authoritative publisher exists for Seattle condo/HOA fees, the same conclusion Houston's
and Austin's dossiers reached for their own metros.

- **hoacosts.com** (self-reported aggregator, 125 Seattle reports): median **$600/month**, most
  running $250–$2,200/month.
- **Jeff Reynolds' 56-building Seattle condo survey** (a locally-known Seattle condo specialist's
  own building-by-building analysis, secondary but more granular than a generic aggregator):
  median **$495/month** across 1,419 units analyzed.
- **Axios Seattle** (2025-10-07), citing Census Bureau data: Washington STATEWIDE median HOA/condo
  fee was **$82/month**, versus $135/month nationwide — this is the state as a whole (heavily
  diluted by single-family, non-HOA housing stock) and is NOT comparable to a Seattle-specific
  condo figure; included only to show how much Seattle's own condo stock diverges from the state
  average, the same "citywide blended median understates a condo-specific figure" pattern
  Houston's dossier C6 already documents for its own $67/month citywide (all-property-types)
  figure.
- conf: **assumption** — no MLS-derived or HOA-industry-primary figure was located. **Recommend**
  a mid-range figure near $500–$600/month, disclosed as a range, consistent with how Houston's and
  Austin's dossiers each recommended their own mid-range condo-fee defaults.

### B7. Local REET, Seattle specifically

Restated from A2: **0.50%**, King County REET location code 1726, confirmed unchanged across the
January 2026, March 2026, and May 2026 dor.wa.gov local-rate vintages — i.e. no 2026 change has
occurred for Seattle specifically. Combined with the state graduated schedule (A2), the TOTAL REET
on a Seattle sale at, e.g., the B1 single-family benchmark ($920,000) would be: state portion
($525,000 × 1.10% + $395,000 × 1.28% = $5,775.00 + $5,056.00 = $10,831.00) + local portion
($920,000 × 0.50% = $4,600.00) = **$15,431.00 total**, paid by the SELLER (A2) — this dossier's
own worked example, not a publisher-stated figure, shown for scale.

---

## Could not verify

- **A single OIC-published "average Washington homeowners insurance premium" figure** — the OIC's
  own 2025 Annual Report PDF was fetched directly but did not yield an isolable average-premium
  statistic in its extracted text (likely presented only as a chart/graphic in that document); the
  $1,533/$1,600 figures used here are a third-party aggregator's (Insurify), not OIC's own.
- **King County's own canonical "how assessments work" page, fetched directly** — the specific URL
  guessed this pass (kingcounty.gov/en/legacy/depts/assessor/how-assessments-work) 404'd; the
  100%-market-value/annual-reassessment finding rests on consistent search-result corroboration,
  not a single clean direct fetch. A follow-up pass should locate King County Assessor's current
  URL structure for this page.
- **WAC 458-61A-208's own text, confirming no mortgage-recording tax** — reached only via secondary
  synthesis (a King County records page and a law-firm summary), not an independent fetch of the
  WAC text itself.
- **Whether Seattle's Senior/Disabled/Veteran exemption programs' specific dollar thresholds and
  income limits** — confirmed the PROGRAMS exist and that none is a general exemption, but their
  specific eligibility dollar figures were not researched this pass (out of scope per the task
  brief, which only asked to confirm no GENERAL exemption exists).
- **A second or third major title insurer's WA rate schedule**, to corroborate or contrast Old
  Republic's $800k-policy figures — only one insurer's filed schedule was pulled this pass; per
  A4's own finding that Washington is a filed-rate (not promulgated) state, a single insurer's
  number is inherently not the last word.
- **The 2026 capital-gains-tax standard deduction figure** — dor.wa.gov's own live page shows only
  2025 ($278,000); the 2026 inflation adjustment was not found published as of 2026-09-17. Not
  load-bearing for this dossier's purpose (A1 is a note-only item), but flagged for any future pass
  that might need it.
- **A second King County property-tax levy code's full breakdown**, to see how a Seattle address
  outside the most common levy code 0010 (e.g., code 0030/0032, which sits in a different school
  district per ratebook26.pdf) would differ — only levy code 0010 was decomposed in full; the
  summary table shows several other Seattle levy codes exist at different combined rates (e.g.,
  12.22112 for codes 0030/0032), which a real implementation would need to reconcile against
  whichever address/levy-code convention the record ultimately adopts.

---

## Shape notes for the implementer

1. **Who pays REET, and where it belongs in the model — this is the single most consequential
   finding in this dossier.** RCW 82.45.080 makes REET (state graduated schedule + Seattle's 0.50%
   local rate, A2) the SELLER's statutory obligation, not the buyer's. Every `TransferLine` this
   dataset has modelled so far (Ontario's LTT, BC's PTT, Quebec's *droits de mutation*) is
   something the BUYER pays at closing, and `buildLines()` assembles exactly that buyer-side stack
   for Closing Costs. A Washington/Seattle record's REET amount **does not belong in
   `transfer: TransferLine[]` at all** if that array is read only for buyer closing costs — putting
   it there would put a cost on the wrong party's ledger, the same class of error CLAUDE.md's own
   "figure may leave the app only if..." rule exists to prevent, just on the payer-identity axis
   instead of the confidence axis. The correct home is Rent vs Buy's eventual-SALE proceeds
   waterfall (`waterfall()` in engine.ts), the same place selling costs (`sellingCost`, already a
   `CountryRulesBase` field) already live — REET is a second, jurisdiction-specific selling cost
   alongside the already-modelled commission percentage. **This is a genuine engine-shape
   decision, bigger than a data-only record, and should get its own design pass** rather than being
   shoehorned into `TransferLine` with a `when` predicate that silently reassigns who pays it (no
   `Applicability` field expresses "the seller, not the buyer, pays this line" — that is a
   structural fact about WHICH SIDE of the transaction a cost belongs to, not a conditional
   narrowing of an existing buyer-side line). Do not add a `transfer: []`-with-a-comment shortcut
   the way Texas's no-transfer-tax fact was modelled — Washington DOES have a transfer tax, it is
   simply on the other party.
2. **No exemption to model.** `PropertyTax.exemptions` should be omitted entirely for a Washington
   record (A3) — Washington's senior/disabled/veteran programs require an eligibility status this
   dataset does not collect, and there is no general homestead exemption a typical buyer receives.
   This is simpler than Houston's/Austin's partial-exemption records, not harder.
3. **`PropertyTax.basis` is `"market"`, `assessmentRatio` is `1`** — Washington's 100%-market-
   value/annual-reassessment system, combined with no general exemption, makes a Washington
   `PropertyTax` record structurally the SIMPLEST of the three US metros this dataset would then
   carry (no exemption split like Houston's HISD-only carve-out, no assessment-ratio derivation
   like a Canadian `low`-confidence ratio). The 1% levy-growth limit (A3) is a fact about how the
   RATE is set each year at the district level, already captured by this dataset's existing
   "re-read the published rate annually" practice — it needs no new field.
4. **Every rate's unit, stated explicitly, per the checklist's own trap-list**:
   - State/local REET: **percentage of price** (graduated bands, marginal — a `BracketTable`/
     `bracketTax()` shape, the same mechanism `TX_TITLE_INSURANCE_BRACKETS` already demonstrates).
   - Seattle combined property-tax levy rate: **per $1,000 of assessed value** (9.90845/$1,000 =
     0.990845% — WA publishes per-$1,000, NOT per-$100 the way Texas does; a direct percentage
     copy-paste from a Texas record's `effective` field convention would be off by a factor of 10
     if the per-$1,000 figure were divided by 100 instead of 1,000).
   - Recording fees: **flat dollar amounts per document**, not a rate against price or loan amount.
   - Title insurance and escrow fee: **flat dollar SCHEDULE, tiered by insurance/sale-price band**,
     not a simple percentage — Old Republic's own table (A4/A6) is a step schedule, not a formula;
     a Washington record would need either a lookup table shape or an approximating formula fit to
     the published bands, the same kind of judgement call TDI's formula already required for Texas
     (though Texas's WAS a clean closed-form formula; Washington's filed schedule may not reduce to
     one as cleanly, since it is one insurer's own internal pricing, not a regulator-mandated
     formula).
   - Utility tariffs: electricity is **$/day fixed + $/kWh flat**; water is **$/month fixed (by
     meter size) + $/CCF tiered by season**; sewer and garbage are **flat $/month** (sewer scales
     with a winter-consumption baseline the utility computes, not something this dataset would
     re-derive).
5. **`fees.survey` should likely be omitted, not assumption-defaulted**, for a Washington record
   (A6) — unlike Texas, where a survey is a genuine (if unpublished-dollar-figure) closing-cost
   convention, Washington buyers rarely commission one at all. Shipping a Texas-style `$500`
   assumption default for a fee Washington buyers do not typically pay would overstate closing
   costs, the flattering-error direction this product's own conventions (CLAUDE.md, Houston's
   `propTax.exemptions` note) explicitly avoid.
6. **`fees.lawyer`/settlement-fee should model roughly HALF of the published escrow-fee schedule**
   (A6), since Washington splits that cost 50/50 by custom, unlike Texas where the analogous
   title-company settlement fee is modelled as a single buyer-paid line.
7. **A Washington/Seattle jurisdiction record is the first to exercise `StateCode`'s widening
   beyond `"TX"`** (`src/domain/types.ts`) — per SKILL.md's Phase 0 "new state" list, this also
   needs `marginal.WA` in `rules/us.ts` (WA has no state income tax, so per the existing
   `marginal.TX`/`US_FEDERAL_SINGLE_2026` precedent, `marginal.WA` should point to the SAME
   federal-only table object, not a re-typed duplicate — Texas's own comment in `us.ts` already
   states this pattern explicitly for exactly this situation), and `VALID_STATES` in
   `jurisdictions/index.test.ts`.
