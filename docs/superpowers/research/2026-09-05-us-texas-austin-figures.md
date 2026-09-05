# US / Texas / Austin (Travis County) figures — sourced dossier

Date compiled: 2026-09-05. Scope: METRO- and COUNTY-specific figures only, for Austin
(Travis County), the second Texas metro per `.claude/skills/add-state/SKILL.md`'s Phase 0. Houston
(Harris County) already ships; the state-level facts it encodes — no Texas real-estate transfer tax
or mortgage recording tax (`transfer: []`), the TDI promulgated title-insurance schedule, the
federal-only `marginal.TX`, the Texas homeowners-insurance statewide average, the 10% homestead
appraisal cap (Tax Code §23.23), and the $140,000 school-district homestead exemption amount
(statute) — are **Texas facts, not Houston facts**, and are carried forward here unchanged, per the
Phase 0 verdict already decided for this run. This dossier does not re-research them.

Every figure is graded on the `Provenance.conf` scale in `src/domain/types.ts` (`high / medium /
low / assumption / none`), the same discipline
`docs/superpowers/research/2026-09-03-us-texas-houston-figures.md` used. **Nothing here has been
written into `src/domain`; this is research input only.**

Tax-year framing matches Houston's dossier: Texas taxing entities adopt a calendar-tax-year rate in
the fall of that same year, so "tax year 2025" is the newest adopted rate as of 2026-09-05 for every
entity below.

## Summary table

| # | Item | Value | Conf | As of |
|---|------|-------|------|-------|
| C1 | ABOR/Unlock MLS July 2026 report — City of Austin median | **$577,000** (−1.4% YoY) | high | 2026-08-11 report, July 2026 data |
| C1 | ABOR/Unlock MLS July 2026 report — MSA median | **$435,000** (+1.0% YoY) | high | same |
| C1 | ABOR/Unlock MLS July 2026 report — Travis County median | $520,000 | high | same |
| C1 | City of Austin condo/townhome median, July 2026 | $343,000 (−6.5% YoY) | medium | secondary blog aggregation of ABoR MLS data |
| C2 | HUD FY2026 FMR, Austin-Round Rock-San Marcos, TX MSA | 0BR $1,474 · 1BR $1,562 · **2BR $1,852** · 3BR $2,347 · 4BR $2,760; NOT a mandatory-SAFMR area | high | effective 2025-10-01 |
| C3 | Travis County TY2025 rate | 0.375845 / $100 | high | adopted ~2025-09-16 |
| C3 | Central Health (Travis Co. Healthcare District) TY2025 rate | 0.118023 / $100 | high | adopted ~2025-09-16/17 |
| C3 | Austin Community College District TY2025 rate | 0.1034 / $100 (0.0900 M&O + 0.0134 debt) | high | adopted 2025-09-08 |
| C3 | City of Austin TY2025 rate | 0.524017 / $100 | high | adopted mid/late Nov 2025, post-Prop Q |
| C3 | Austin ISD TY2025 rate | 0.9252 / $100 (0.8022 M&O + 0.1230 I&S) | high | adopted ~2025-09-25/30 |
| C3 | **Combined nominal rate** | **2.046485 / $100** (≈2.046%) | high (sum of 5 directly-fetched rates) | TY2025 |
| C4 | Effective rate at $577,000 benchmark, after confirmed exemptions | **≈1.617%** ($9,332.34 on $577,000; nominal would be $11,808.22) | low (illustrative combination) | TY2025 |
| C5 | MUDs/PIDs around Austin | Note only — not modeled | — | — |
| C6 | Travis County Clerk recording fee | $25 first page, $4/additional page, $0.25/name over 5 | high | fee-information page, current |
| C7 | Austin Energy residential tariff | Customer charge $16.50/mo + tiered energy charge (4.640¢–10.884¢/kWh) + PSA 4.118¢ + charges | high (tariff) / assumption (typical bill ≈$116/mo) | eff. 2025-12-01 |
| C7 | Austin Water residential tariff | 5-tier fixed minimum ($1.36–$35.54) + 5-tier volumetric ($3.27–$20.40/kgal) | high (tariff) / medium (~$52.78/mo average, secondary) | eff. 2025-11-01 |
| C8 | Austin condo/HOA typical monthly fee | ~$400/mo median cited; $200–$1,500+ range | assumption | secondary aggregators |
| C9 | Survey / appraisal / escrow fee | Appraisal $500–$1,000; survey $400–$700; escrow/closing $400–$600 | assumption | secondary realtor/mortgage blogs, no primary publisher |
| C10 | Proposition Q (Nov 2025) | City's proposed $0.574017 rate rejected by voters 63.48%–37%; council then adopted $0.524017 without another election | high | election 2025-11-04 |
| C10 | Travis County disaster-declaration tax hike + lawsuit | 9.12% increase adopted under a flood disaster exception; challenged in court, in effect pending litigation as of 2026-07 | high (fact of suit) | ongoing |
| C10 | Local-option homestead % by entity, TCAD 2026 exemption listing | AISD 0% (flat $140k only) · City of Austin 20% · Travis County 20% · Central Health 20% · **ACC 1%** (min $5,000) | high | TCAD official exemption listing, generated 2026-07-19 |
| C10 | Over-65/disabled additional exemption | City of Austin $204,000 · Central Health $197,000 · Travis County $145,269 · ACC $75,000 | high | same TCAD listing |
| C10 | Over-65/disabled tax-ceiling freeze (FrzC) | AISD: Yes (mandatory) · ACC: Yes (elected) · City of Austin / Travis County / Central Health: No | high | same TCAD listing |

---

## C1. Benchmark prices

**Which figure the record should use, and why**: the `austin` jurisdiction record should carry
`bench.house` from the **City of Austin** figure, not the Austin-Round Rock-San Marcos MSA figure.
Two reasons: (1) the property-tax stack this record models (Travis County + Central Health + ACC +
City of Austin + Austin ISD, §C3 below) applies specifically to a home inside the City of Austin
and inside AISD — the MSA spans five counties (Bastrop, Caldwell, Hays, Travis, Williamson) most of
which are in different cities, different school districts, and different county tax stacks
entirely, so an MSA-wide price paired with an Austin-city tax stack would be internally
inconsistent; (2) unlike Houston's dossier, where HAR published only one board-wide figure and no
city-proper cut, the Austin Board of REALTORS®/Unlock MLS explicitly publishes a **"within the city
limits"** cut as a separate line in the same monthly release, so no proxy or estimate is needed.

- Publisher: Austin Board of REALTORS® / Unlock MLS. Document: "July 2026 Central Texas Housing
  Report."
- URL: https://www.unlockmls.com/news/july-2026-central-texas-housing-report
- asOf: published 2026-08-11, covering July 2026 sales.
- conf: **high** — fetched directly; the page loaded without the bot-blocking Houston's dossier hit
  on har.com (no proxy needed).
- Figures (median sale price, `metric: "median"` throughout — Unlock MLS does not publish an
  average sale price on this page, only median and average-close-to-list-price-ratio):
  - **Austin-Round Rock-San Marcos MSA**: $435,000 (+1.0% YoY); 2,700+ sales (+4.4% YoY); avg.
    close-to-list ratio 93.7%.
  - **City of Austin** (within city limits): **$577,000** (−1.4% YoY); avg. close-to-list ratio
    93.9%.
  - Travis County (county-wide, broader than just the city): $520,000, ~flat YoY; 1,290+ sales
    (+11.4% YoY).
- Corroboration: CultureMap Austin (2026-08-xx) and The Real Deal (2026-08-12) both independently
  quote the same $435,000 MSA / $577,000 city-of-Austin figures, consistent with a single
  underlying ABOR release rather than a fabricated number.

**Condo/townhome median** — City of Austin, all condos/townhomes, July 2026: **$343,000** (−6.5%
YoY from $367,000 in July 2025; −17.3% from June 2026's $414,990).
- Publisher (as cited by the page fetched): "Realtors Property Resource (RPR) and the Austin Board
  of REALTORS® MLS," via a secondary aggregator (austinrealestatehomesblog.com), not ABOR's own
  press page — no equivalent "Austin Condo Price Report" was located directly on unlockmls.com or
  abor.com this pass.
- URL: https://www.austinrealestatehomesblog.com/real-estate-price-reports/condo/07-2026/
- asOf: published 2026-08-07, covering July 2026.
- conf: **medium** — the publisher names ABOR's own MLS as the underlying data source but the page
  itself is a third party's compilation, not ABOR's own release; per the checklist, a secondary
  aggregation caps at `medium` even when it correctly names the primary source.

---

## C2. Rent — HUD FY2026 Fair Market Rent

- Publisher: HUD (HUD USER). Document: "FY 2026 Schedule of Metropolitan & Non-Metropolitan Fair
  Market Rents," the same national schedule PDF Houston's dossier addendum recommends over the
  dynamic query tool.
- URL: https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY2026_FMR_Schedule.pdf
- Access method: a plain `WebFetch` of this URL returned nothing (the "empty response without a
  browser-like Referer" problem Houston's dossier addendum documents). It was fetched instead with
  `curl -A "<desktop Chrome UA>" -e "https://www.huduser.gov/"` — a Referer header, not a full
  browser — which returned the real 56-page PDF; `pdftotext -layout` then extracted the table.
  **Record this access method for the next person**: a plain fetch of this exact URL will look like
  the document does not exist.
- Row (Texas → Metropolitan FMR Areas):
  `Austin-Round Rock-San Marcos, TX MSA.............. 1474  1562  1852  2347  2760   Bastrop, Caldwell, Hays, Travis, Williamson`
  — columns are 0 BR / 1 BR / 2 BR / 3 BR / 4 BR, per the schedule's own header row.
- **0BR $1,474 · 1BR $1,562 · 2BR $1,852 · 3BR $2,347 · 4BR $2,760.**
- **Is this an SAFMR area? No — and this is a genuine structural difference from Houston.** The
  schedule's own legend (Note 2, page with the national notes): *"Areas where Small Area FMRs
  (SAFMRs) are required for the HCV program are indicated by a `+` before the FMR Area Name."*
  Houston's row in this same document reads `+Houston-The Woodlands-Sugar Land, TX HMFA` (with the
  `+`, matching its FY2026 figures $1,280/$1,323/$1,573/$2,116/$2,639 exactly, cross-checking clean
  against Houston's own shipped record). **Austin-Round Rock-San Marcos, TX MSA carries no `+`** —
  it is not a mandatory-SAFMR area, so the metro-wide row above is the figure to use directly, with
  none of Houston's "which ZIP counts as Houston" ambiguity.
- asOf: **2025-10-01** — the standard FY2026 FMR effective date (start of federal fiscal year 2026),
  matching Houston's corrected record. This specific PDF does not print an explicit effective-date
  line of its own; the date is carried from HUD's standard FMR effective-date convention and from
  Houston's own already-verified `asOf`.
- conf: **high** — read directly off HUD's own national schedule PDF, cross-checked against
  Houston's already-shipped figures appearing correctly in the same document.

---

## C3. Property tax stack, tax year 2025

All five entities' TY2025 rates were fetched directly off that entity's OWN adopted-rate page —
none relied on a county-wide aggregator, unlike Harris County's page (which needed a
`hctax.net`+`communityimpact.com` cross-check in Houston's dossier).

| Entity | Rate ($/$100) | Breakdown | Source | Adopted |
|---|---|---|---|---|
| Travis County | 0.375845 | not broken out on the page | traviscountytx.gov, "Fiscal Year 2026 - Tax Year 2025" taxpayer statement (fetched directly) | ~2025-09-16 (public hearing date; commissioners court vote not separately pinned this pass) |
| Travis County Healthcare District (Central Health) | 0.118023 (11.8023¢) | not broken out | centralhealth.net, "Travis County Commissioners Approve Central Health's FY 2026 'Year of Access' Budget" (fetched directly) | ~2025-09-16/17 (Travis County Commissioners Court) |
| Austin Community College District | 0.1034 | M&O 0.0900 + Debt 0.0134 | sites.austincc.edu newsroom, "ACC Approves New Property Tax Rate For FY25-26" (fetched directly) | 2025-09-08 |
| City of Austin | 0.524017 | not broken out on the tax-rates page; see C10 for why this is lower than the initially-proposed rate | austintexas.gov/budget-excellence/tax-rates, official FY2025-26 rate table (fetched directly) | mid/late November 2025, after the Prop Q election (see C10) |
| Austin ISD | 0.9252 | M&O 0.8022 + I&S 0.1230 | austinisd.org/budget/taxes-debt (fetched directly), corroborated by Community Impact, "Austin ISD adopts lower tax rate for 2025-26" (2025-09-30) | ~2025-09-25/30 |
| **Combined nominal (5 entities)** | **2.046485** (≈2.046%) | sum of the rows above | — | TY2025 |

- conf: **high** for every individual rate — each was fetched directly from the taxing entity's own
  page, none via a secondary aggregator (an improvement on Houston's dossier, where the Harris
  County four-entity figure needed a cross-check because it wasn't broken out on a single county
  page the way Travis's figures are).
- **Caveat on the Travis County figure specifically**: see C10 — it was adopted under a
  disaster-declaration exception and is under active litigation. The number itself is confirmed at
  `high`; its legal durability for future tax years is not settled.
- **Caveat on the City of Austin figure**: $0.524017 is the FINAL adopted rate, reached only after
  a failed tax-ratification election (C10). Several secondary sources (real-estate blogs) still
  quote the earlier PROPOSED rate ($0.604017) or the BALLOT rate ($0.574017) as if it were final —
  do not use those figures; $0.524017, read directly off the city's own official tax-rates page,
  is the rate actually in effect for TY2025.

---

## C4. Effective rate at the benchmark, after confirmed exemptions

Using the City of Austin median from C1 (**$577,000**) and the exemptions independently confirmed
in C10's TCAD exemption-listing table (all five entities confirmed at `high` — a materially better
outcome than Houston's dossier, which could confirm only 2 of 6 Harris-area entities):

| Entity | Rate | Exemption | Taxable value | Tax |
|---|---|---|---|---|
| Austin ISD | 0.9252% | $140,000 flat (state HS) | $437,000 | **$4,043.12** |
| Travis County | 0.375845% | 20% (min $5,000) | $461,600 | **$1,734.90** |
| City of Austin | 0.524017% | 20% (min $5,000) | $461,600 | **$2,418.87** |
| Central Health | 0.118023% | 20% (min $5,000) | $461,600 | **$544.80** |
| ACC | 0.1034% | 1% (min $5,000) | $571,230 | **$590.65** |
| **Total effective tax** | | | | **$9,332.34** |

Nominal tax with no exemptions: $577,000 × 2.046485% = **$11,808.22**. Effective rate on the
benchmark: $9,332.34 / $577,000 = **≈1.617%**, i.e. exemptions reduce the bill by about 21% versus
the nominal combined rate.

- conf: **low** for this combination as a whole — same category Houston's dossier used for its own
  worked illustration, for the same reasons: it does not model the 10% homestead appraisal cap
  (which only binds in later reassessment years, not the purchase year), and it assumes the
  purchase price equals the year-one appraised value.
- **A caveat this dossier can raise that Houston's could not, because Houston's record does not
  distinguish it either**: a secondary source (Community Impact, on the AISD rate change) states
  the $140,000 school-district exemption applies **only to the M&O portion** of a district's rate
  (here, $0.8022 of AISD's $0.9252), not to the I&S/debt-service portion ($0.1230). Houston's
  shipped record applies its own school district's exemption ($140,000, HISD) against the district's
  **whole** combined rate (0.878300), not an M&O-only sub-portion. This dossier did not
  independently verify Tax Code §11.13's text to settle which is correct, and applied the same
  whole-rate convention Houston already uses, for consistency and because the underlying rule is a
  **Texas statute, not an Austin-specific fact** — it applies equally to Houston's already-shipped
  record. **Recommend**: before implementing either the Austin record or revising Houston's, fetch
  §11.13's text directly (`statutes.capitol.texas.gov`) to settle whether the M&O/I&S split is real;
  if it is, both records currently overstate the school-district relief on a few hundred dollars of
  the I&S line.

---

## C5. MUDs / PIDs around Austin (note only)

Not modeled in this dossier's core Travis-County stack, matching how Houston's dossier treated
Harris County's MUDs (C4 there) as a disclosure, not a computed line.

- Travis County itself carries roughly 54 active Municipal Utility Districts (mostly in
  unincorporated areas and newer subdivisions); the Williamson County suburbs immediately north and
  northwest of Austin (Cedar Park, Leander, Pflugerville, Georgetown) and Hays County suburbs (Kyle,
  Buda) carry a further concentration, plus Public Improvement Districts (PIDs) in some newer
  master-planned communities, funding amenities (parks, trails, landscaping) rather than utilities.
- MUD rates commonly cited in the $0.25–$1.50 per $100 range, additive to whatever county/city/
  school stack already applies — i.e. can add well over $1,000/yr on a mid-size Austin-area home,
  concentrated outside the City of Austin's own limits.
- conf: **medium** for the rate range (consistent secondary corroboration; Tex. Water Code Ch. 49
  itself, which requires written MUD disclosure before a purchase contract is signed, was not
  independently fetched this pass — same gap Houston's dossier left open).
- **Recommend, as Houston's dossier did**: note as a caveat on any Austin-area property-tax figure
  that assumes only the C3 five-entity stack — a MUD- or PID-serviced address (common in Austin's
  suburbs, less common inside the City of Austin's own limits, where the C3 stack is what actually
  applies) would carry a materially higher effective rate.

---

## C6. Recording fees, Travis County Clerk

- Publisher: Travis County Clerk. Document: "Recording Fee Information" page.
- URL: https://countyclerk.traviscountytx.gov/departments/recording/fee-information/
- asOf: page content current as of fetch (2026-09-05); the linked detailed fee-schedule PDF is
  dated "updated 3-18-25" per the page's own text.
- Figures, real-property documents (deeds, deeds of trust included): **$25.00 first page, $4.00
  each additional page**, plus **$0.25 per indexed name in excess of 5**.
- conf: **high** — fetched directly, and (unlike Harris County's page, which Houston's dossier
  flagged as returning an internally inconsistent $5-vs-$25 extraction) this page returned a clean,
  internally consistent figure with a worked table (1 page $25.00 → 5 pages $40.00).
- **Typical total for a purchase with a mortgage** (two instruments recorded — a deed and a deed of
  trust): a warranty deed typically runs 2–3 pages ($25 + up to 2×$4 = **$29–$33**); a standard
  Fannie Mae/Freddie Mac uniform deed of trust plus riders typically runs 15–20 pages ($25 +
  14–19×$4 = **$81–$101**). **Combined typical total: roughly $110–$135.** conf: **assumption** for
  the page-count estimate specifically (the per-page fee itself is `high`; no publisher states a
  "typical total" figure, so the combination is this dossier's own modelled estimate, same
  treatment Houston's dossier gave its own $35 "typical 3-4 page deed" figure).

---

## C7. Utilities

### Austin Energy (electricity)
- Publisher: Austin Energy (City of Austin municipal utility). Document: "City of Austin Utility
  Rates and Fees Schedule."
- URL: https://austinenergy.com/-/media/project/websites/shared/pdfs/rates/coa-utilities-rates-and-fees.pdf
  (a downloadable PDF; also mirrored on https://austinenergy.com/rates/residential-rates, which was
  the page actually readable by the fetch tool — the PDF itself returned only binary/font-stream
  content, unreadable as text this pass).
- asOf: rate page states "last reviewed/modified 12/01/2025."
- Residential tariff, fetched directly: customer charge $16.50/month; tiered energy charge —
  4.640¢/kWh (0–300 kWh), 5.138¢/kWh (301–900), 7.525¢/kWh (901–2,000), 10.884¢/kWh (>2,000); power
  supply adjustment 4.118¢/kWh; PSA administrative adjustment −0.206¢/kWh; community benefit
  charges (customer assistance 0.564¢, service-area lighting 0.254¢, energy efficiency 0.457¢);
  regulatory charge 1.338¢/kWh.
- conf: **high** for the tariff structure itself (read directly off Austin Energy's own page).
- **Typical monthly bill**: at 860 kWh/month — a "typical residential user" figure that is itself a
  rate-comparison-site convention, **not** a figure Austin Energy publishes as "our average
  customer's usage" — the tariff above computes to roughly **$116/month** including the 1% city
  sales tax. conf: **assumption** for this bill total specifically — Austin Energy does not publish
  a single "average residential bill" statistic; this is a worked example on a commonly-assumed
  usage level, the same category as Houston's C5 electricity assumption, but built on an actually-
  fetched official tariff rather than an aggregator's bill estimate.

### Austin Water (water)
- Publisher: City of Austin, Austin Water Utility. Document: "FY 2025–2026 Proposed Water Rate
  Changes" (Council Meeting Backup, File ID 25-1450).
- URL: https://services.austintexas.gov/edims/document.cfm?id=456500 (fetched as a binary PDF via
  `curl`, then converted to text with `pdftotext -layout` — the WebFetch tool alone could not
  extract this document's text).
- asOf: rates effective **2025-11-01**.
- Residential (non-CAP) tariff: a five-tier fixed monthly minimum charge ($1.36 / $3.91 / $10.43 /
  $23.54 / $35.54 across the five usage bands) plus a five-tier volumetric charge ($3.27 / $5.57 /
  $10.26 / $16.52 / $20.40 per 1,000 gallons). This document covers water only, not wastewater/
  sewer, which this dossier did not separately price.
- conf: **high** for the tariff structure (direct fetch of the City's own council backup document).
- **Typical monthly bill**: a secondary figure (Austin American-Statesman / FOX 7 Austin, via
  WebSearch synthesis, not independently fetched) cites **~$52.78/month** as Austin Water's own
  reported average water-only charge for a typical single-family home in FY2025. conf: **medium** —
  attributed to Austin Water's own reporting, but not read directly off an Austin Water page this
  pass; a rough independent check (6,000 gal/month, a commonly-cited typical single-family use)
  against the FY2025-26 proposed tariff above computes to roughly $33/month, suggesting either a
  higher typical usage level, the FY2025 (pre-increase) rates, or a wastewater component folded into
  the $52.78 figure — **flagged as unreconciled, not resolved this pass.**

---

## C8. Condo/HOA typical monthly fee

No authoritative publisher exists for this figure in Austin, the same conclusion Houston's dossier
reached for Harris County.

- Cited ranges across multiple secondary sources (Neuhaus Realty Group, Spyglass Realty, Grewal RE
  Group, hoacosts.com self-reported data, Steadily): **$200–$400/month** for suburban buildings,
  **$400–$800/month** for mid-range urban buildings, **$800–$1,500+/month** for luxury downtown
  high-rises; hoacosts.com's aggregation of 44 self-reported Austin figures gives a **$400/month**
  median.
- Axios Austin ("Austin's HOAs outpace national average," 2025-04-22) was located but returned
  HTTP 403 on a direct fetch and was not independently read this pass.
- Publisher: none authoritative.
- conf: **assumption** — matches Houston's own C6 category exactly. **Recommend** a mid-range
  figure (e.g. $350–$450/month) disclosed as a range, consistent with Houston's own recommendation
  for its condo-fee assumption.

---

## C9. Survey, appraisal, escrow fee

No Austin-specific primary-source figure was located for any of these three fees, the same gap
Houston's dossier (§B6) reported for Harris County — these appear to be genuinely Texas-wide
closing-cost conventions rather than county-specific figures, so the absence of an Austin-specific
number is expected, not a research gap unique to this metro.

| Item | Cited range | conf | Source |
|---|---|---|---|
| Appraisal fee | $500–$1,000 | assumption | multiple realtor/mortgage-broker blogs (Neuhaus Realty, LRG Realty, Grewal RE Group) |
| Survey fee | $400–$700 | assumption | same category of sources; several note a current survey from the seller's own purchase may be accepted in lieu of a new one |
| Escrow/closing fee (title company) | $400–$600 | assumption | same category; explicitly described as the one shoppable/negotiable fee, matching Houston's B6 framing |

No primary publisher (TDI, a title-industry association, or a Travis County government page) was
found to price any of these three fees this pass. **Recommend**, as Houston's dossier did: these
should ship at `assumption` grade only, with the same disclosed-default treatment Houston's record
already uses for `fees.lawyer`/`fees.survey`.

---

## C10. Austin-specific items Houston does not have

### 1. Proposition Q — a failed tax-ratification election shaped the City of Austin's TY2025 rate
The City Council's initially-adopted FY2025-26 budget set a rate of **$0.574017** per $100 (up from
$0.4776 the prior year, a 26.5% jump) — a "5-cent" increase exceeding the state's voter-approval
threshold by state law, which required an election. Voters rejected **Proposition Q** on 2025-11-04
by **63.48%–37%** (roughly two-thirds against, in both the Travis County and Williamson County
portions of the city). Because the election failed, the Council could not keep the ballot rate;
instead it adopted **$0.524017** — the maximum 3.5% increase allowed without triggering a second
election — and cut **$95 million** from the proposed budget (parks, homelessness services, and
other general-fund items) to balance it. This is why C3's City of Austin figure ($0.524017) differs
from the higher figures ($0.574017 ballot rate; $0.604017 an even earlier proposed rate) that
several secondary real-estate blogs still repeat as if final.
- Publisher/sources: KUT ("Austin voters reject Proposition Q," 2025-11-04/05), the Texan, Austin
  American-Statesman, KXAN, and austintexas.gov's own "NOTICE OF PUBLIC HEARING ON TAX INCREASE"
  and tax-rates page (the $0.524017 figure itself, per C3, is `high`, fetched directly).
- conf: **high** for the sequence of events and the final adopted rate.

### 2. Travis County's 2025 tax hike used a disaster-declaration exception and is under active litigation
Travis County's 9.12% TY2025 increase (C3, $0.375845) was adopted under a Tax Code provision that
lets a taxing unit exceed the normal 3.5% voter-approval cap — by up to a further 8 points — for one
year following a state or federal disaster declaration; the county cited the **July 5, 2025 Central
Texas floods** that damaged northwest Travis County. Two taxpayers (Lago Vista Mayor Shane Saum and
Jeffery Bowen) sued in November 2025, arguing the disaster exception covers only direct
flood-response costs, not the county's broader ~$42 million in new revenue. As of the most recent
reporting found (Hoodline, 2026-07-01), a judge ruled the case can proceed to discovery, with no
trial date set; **the rate remains in effect pending litigation**, and a refund is possible if the
plaintiffs prevail.
- Publisher/sources: KUT ("Travis County leaders sued over 9% property tax rate increase," 2025-
  11-18), KXAN, Austin American-Statesman, Hoodline (2026-07-01, the most recent status found).
- conf: **high** for the fact and status of the litigation; the eventual OUTCOME is of course
  unknown and should be re-checked before this figure is treated as permanently settled.

### 3. Local-option homestead percentages diverge sharply by entity — now confirmed for ALL FIVE, not 2 of 6
Travis Central Appraisal District's own official 2026 Exemption Listing Report (see method below)
names, per entity, both the local-option homestead PERCENTAGE and the additional over-65/disabled
DOLLAR exemption — for every entity this dossier needed, at `high` confidence. This is a materially
better outcome than Houston's dossier, which could confirm only Harris County (20%) and HISD's flat
amount, leaving the City of Houston, Flood Control District, Hospital District, Port of Houston, and
HCC's exemption status unconfirmed or stale-sourced.

- **Access method, recorded for the next person**: TCAD's own page
  (https://traviscad.org/homesteadexemptions) does not print the figures inline — it links a PDF
  named `<year>_ExemptionListingTravis-<date>.pdf`. A `WebFetch` of that PDF URL returns only
  "cannot parse binary content." The fix, as Houston's own dossier addendum recommends for stubborn
  PDFs: `curl` the URL directly with a browser-like User-Agent, then run `pdftotext -layout` on the
  result and `grep` for the entity name. The **2025** dated filename
  (`2025_ExemptionListingTravis_07252025.pdf`, found via search) 404s; the live document at fetch
  time was the **2026** vintage, `2026_ExemptionListingTravis-07192026.pdf`, generated 2026-07-19 —
  i.e. this dossier's exemption percentages are confirmed current as of mid-2026, not pinned to a
  TY2025-dated snapshot. Local-option percentages are standing entity ordinances that change rarely
  (unlike the rate itself, re-adopted every year), so this is treated as `high` for TY2025 too, with
  this vintage gap disclosed rather than silently assumed away.
- Publisher: Travis Central Appraisal District. Document: "Exemption Listing Report," Travis
  Central Appraisal District, Year 2026.
- URL: https://traviscad.org/wp-content/uploads/2026_ExemptionListingTravis-07192026.pdf
- asOf: generated 2026-07-19.
- conf: **high**.

| Entity | General HS local-option % | Local opt. minimum | Over-65/disabled additional exemption | Freeze (FrzC) |
|---|---|---|---|---|
| Austin ISD | 0% (state $140,000 flat only) | — | $60,000 (state, OV65/OV65S) | **Yes** (mandatory, all TX school districts, Tax Code §11.26) |
| City of Austin | **20%** | $5,000 | $204,000 | No |
| Travis County | **20%** | $5,000 | $145,269 | No |
| Central Health (Travis Co. Healthcare District) | **20%** | $5,000 | $197,000 | No |
| Austin Community College District | **1%** | $5,000 | $75,000 | **Yes** (elected) |

ACC's 1% figure is not a rounding artifact — it is the state-law FLOOR a taxing unit may choose if
it adopts any local-option percentage exemption at all (Tax Code §11.13(n): a unit that adopts a
percentage exemption must set it at not less than $5,000 in value, however small the percentage);
four of the five Austin-area entities chose the 20% ceiling, ACC chose the floor. This is a
genuinely different pattern from anything Houston's dossier surfaced (Harris County's own entities
were mostly unconfirmed, not confirmed-and-divergent).

### 4. Over-65/disabled tax-ceiling freeze differs by entity
Confirmed in the same TCAD listing (the "FrzC" column): Austin ISD's freeze is **mandatory** under
state law (every Texas school district must freeze the school portion of an over-65 or disabled
homeowner's tax at whatever it was in the qualifying year); Austin Community College has separately
**elected** to offer the same freeze; the City of Austin, Travis County, and Central Health have
**not**. Practically: an Austin senior's AISD and ACC tax lines stop rising once frozen, but the
City, County, and Central Health lines keep rising with future rate increases (like the ones in
items 1 and 2 above). Note only — not modeled in either Houston's or (per this dossier) Austin's
proposed record; flagged because it is a real, confirmed, and Austin-relevant fact a future
"senior/retiree" feature would need.

---

## Could not verify

- **An average (not median) sale price** for the City of Austin or the Austin-Round Rock-San Marcos
  MSA from ABOR/Unlock MLS's own report — the July 2026 release publishes median and
  average-close-to-list-price-ratio only. Houston's dossier had HAR's own average ($440,816); no
  equivalent figure was located for Austin's board this pass.
- **Whether the $140,000 school-district homestead exemption applies to a district's whole combined
  rate or only its M&O portion** — a secondary source claims M&O-only for AISD; this dossier did not
  independently confirm against Tax Code §11.13's text, and this affects Houston's already-shipped
  record too, not just Austin's (see C4).
- **Exact ordinance/vote dates** for the Travis County Commissioners Court's TY2025 rate adoption
  and the City of Austin Council's final post-Prop-Q rate adoption — both are pinned to a
  public-hearing date or a news-report month, not a specific council/commissioners-court minute.
- **Reconciliation of the two Austin Water "typical bill" figures** — the $52.78/month secondary
  figure and this dossier's own ~$33/month tariff-based estimate at 6,000 gal/month do not agree;
  neither a higher stated "typical usage," the wastewater component, nor the FY2025-vs-FY2025-26
  rate vintage was confirmed as the explanation.
- **A primary (non-blog) source for Austin appraisal, survey, or escrow-fee figures** — same gap
  Houston's dossier left open for Harris County; likely because these are genuinely
  Texas-market-wide conventions with no county-specific publisher, not an Austin-specific research
  gap.
- **Axios Austin's own HOA-cost figure** ("Austin's HOAs outpace national average," 2025-04-22) —
  returned HTTP 403 on a direct fetch; not independently read.
- **A primary Austin Energy or Austin Water statement of "the average residential customer's bill
  is $X"** — only tariff schedules were found; every "typical bill" figure in this dossier is either
  this dossier's own worked example against the published tariff, or an unreconciled secondary
  citation.

---

## Summary for the calling agent

Of the ten items requested:

- **High confidence, fetched directly from the primary publisher**: City of Austin / MSA / Travis
  County median sale prices (C1); the HUD FY2026 FMR row and its non-SAFMR structural finding (C2);
  all five property-tax-stack rates and the combined nominal rate (C3); the Travis County Clerk
  recording-fee schedule (C6); the Austin Energy and Austin Water tariff structures (C7, structure
  only); all five entities' local-option homestead percentages and over-65/disabled amounts, and
  the freeze-eligibility table (C10, from TCAD's own exemption listing); the Proposition Q sequence
  and the Travis County disaster-tax-hike litigation (C10).
- **Medium confidence**: the condo/townhome median (C1, secondary aggregation of ABOR MLS data);
  the MUD rate range (C5); the Austin Water "average bill" figure (C7).
- **Assumption-grade**: the Austin Energy "typical bill" total (C7, a worked example on an assumed
  usage level, not a published statistic); condo/HOA typical fee (C8); appraisal, survey, and
  escrow fees (C9).
- **Low confidence, illustrative only**: the combined effective-rate-after-exemptions computation
  (C4) — correctly applies every confirmed exemption, but does not model the 10% appraisal cap and
  carries the open AISD M&O/I&S question.
- **Could not verify at all** (listed above): ABOR's own average sale price; the M&O-vs-whole-rate
  question for the school-district exemption (affecting Houston's record too); exact adoption
  dates for two of the five tax rates; the Austin Water bill reconciliation; a primary source for
  three closing-cost fees; Axios Austin's HOA article.

**Net comparison to Houston's dossier**: property-tax-exemption confirmation is substantially
stronger here — all five Travis-area entities are confirmed at `high` via one authoritative TCAD
document, versus Houston's 2-of-6 — but the City of Austin's own headline tax rate carries more
political/legal contingency (a failed ratification election, an active disaster-tax lawsuit) than
anything in Harris County's dossier. Both should be disclosed if this record ships: the NUMBER
($0.524017) is `high`-confidence today, but its recent history is unusually eventful for a figure
meant to describe "the current rate."
