# Ontario home-buying cost data verification — Toronto & Ottawa

**Date of research:** 2026-08-17
**Scope:** `src/domain/jurisdictions/toronto.ts`, `src/domain/jurisdictions/ottawa.ts`
**Status:** COMPLETE (web-search budget exhausted before the market-fee items could be sourced; see "Unverifiable / needs a human")

**Tally:** 16 confirmed · 8 corrected · 13 unverifiable or needing a human

Every current placeholder value below is an unverified figure carried over from the
`design-reference/` prototype. This document records verification against primary sources.

---

## Toronto

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| `transfer[0]` Ontario provincial LTT brackets | `[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [null, 0.025]` | **CONFIRMED — unchanged.** First $55,000 → 0.5%; $55,000–$250,000 → 1.0%; $250,000–$400,000 → 1.5%; $400,000–$2,000,000 → 2.0%; over $2,000,000 → 2.5% (2.5% tier applies to land with 1–2 single family residences; otherwise 2.0% above $400k) | https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax · https://www.ratehub.ca/land-transfer-tax-ontario | 2026 | High |
| `transfer[1]` Toronto MLTT brackets | `[55000,0.005],[250000,0.01],[400000,0.015],[2000000,0.02],[3000000,0.025],[4000000,0.035],[5000000,0.045],[10000000,0.055],[20000000,0.065],[null,0.075]` | **CORRECTED — luxury tiers changed effective 2026-04-01.** Lower tiers unchanged: `[55000,0.005],[250000,0.01],[400000,0.015],[2000000,0.02]`. New luxury tiers: `[3000000,0.044],[4000000,0.0545],[5000000,0.065],[10000000,0.0755],[null,0.086]` — i.e. $2M–$3M 2.5%*, $3–4M 4.4%, $4–5M 5.45%, $5–10M 6.5%, $10–20M 7.55%, >$20M 8.6%. *The $2M–$3M step stays at 2.5%: three independent sources agree the new luxury structure starts at $3M and bands below $3M are unchanged. Tax is **marginal** (each rate applies only to the portion within its band), matching the engine's `kind: "brackets"` semantics. The luxury tiers apply to land containing one or two single-family residences. | https://www.cbc.ca/news/canada/toronto/toronto-luxury-homes-land-transfer-tax-increase-approved-city-council-9.7020160 · https://www.ritchiesmyth.com/blog/toronto-luxury-home-tax-2026 · https://kevinsharpe.ca/blog/torontos-new-luxury-home-tax-2026-what-buyers-need-to-know-before-april-1 · https://nowtoronto.com/news/toronto-approves-higher-land-transfer-taxes-for-luxury-homebuyers/ | Effective 2026-04-01 | **Medium-High** — four concurring secondary sources incl. CBC; toronto.ca's own MLTT rates page 404'd / was not directly readable |
| `rebates[0]` Ontario FTB LTT refund cap | `4000` | **CONFIRMED $4,000** (unchanged since 2017). Full refund on homes ≤ $368,333; partial above. Buyer ≥18, Canadian citizen/PR, occupy as principal residence within 9 months, never owned anywhere in the world, spouse must not have owned while spouses. | https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers | 2026 | High |
| `rebates[1]` Toronto FTB MLTT rebate cap | `4475` | **CONFIRMED $4,475** (unchanged). Same eligibility test as provincial. Full rebate to ~$400,000 purchase price. | https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rebate-opportunities/ | 2026 | High |
| `premiumTax.rate` ON RST on CMHC premium | `0.08` | **CONFIRMED 8%.** Insurance premiums were carved out of HST in 2010 and remain under the Ontario Retail Sales Tax at 8%. Payable in cash at closing; cannot be rolled into the mortgage. Label "Ontario retail sales tax, 8%" is accurate. | https://www.ontario.ca/document/retail-sales-tax | 2026 | High |
| `propTax` total residential rate | `0.00752` | **CORRECTED → `0.00767311`** (0.767311%). Components: City 0.605295% + Education 0.153000% + City Building Fund 0.009016%. Note MPAC assessments are still frozen at Jan 1 2016 values, so this rate applies to a stale CVA, not market price — see "needs a human". | https://www.toronto.ca/services-payments/property-taxes-utilities/property-tax/property-tax-rates-and-fees/ | 2026 tax year | High |
| `fees.lawyer` | `2200` | UNVERIFIED — no primary source; legal fees are unregulated in Ontario. Market commentary puts Toronto residential purchase legal fees at roughly **$1,200–$2,500 + HST + disbursements**, so `2200` sits at the top of the typical band and may be over-stated for a straightforward purchase. Needs a cited survey. | — | — | Low |
| `fees.titleIns` | `400` | UNVERIFIED — FCT/Stewart/Chicago Title residential policies commonly quoted **$250–$500** for a typical purchase, scaling with price. `400` is plausible mid-band but uncited. | — | — | Low |
| `fees.inspect` | `650` | UNVERIFIED — typical GTA home inspection quoted **$400–$700**; `650` is plausible high-band. Uncited. | — | — | Low |
| `fees.appraisal` | `400` | UNVERIFIED — typical **$300–$500**; `400` plausible. Uncited. | — | — | Low |
| `fees.statusCert` (ON statutory max) | `110` | **CORRECTED → `100`.** Ontario *Condominium Act, 1998*, s. 76 / O. Reg. 48/01 caps the status certificate fee at **$100 including all applicable taxes**. `110` (which looks like $100 + HST) is *above the statutory maximum* — a condo corporation may not legally charge it. | https://www.condoauthorityontario.ca/status-certificates/ | 2026 | High |
| `fees.moving` | `1500` | UNVERIFIED — highly variable (local vs long-distance, size). Uncited market estimate. | — | — | Low |
| `fees.setup` | `650` | UNVERIFIED — utility hook-up/deposits vary by provider (Toronto Hydro, Enbridge). Uncited. | — | — | Low |
| `orgs.transfer` | `Ontario Ministry of Finance` | **CONFIRMED.** The LTT page is published by, and the Act administered by, the Ministry of Finance. | https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax | 2026 | High |
| `orgs.muni` | `City of Toronto, MLTT by-law` | **CONFIRMED in substance.** The MLTT is levied under City of Toronto Municipal Code Chapter 760, authorized by the *City of Toronto Act, 2006*, s. 267. A more precise string would be "City of Toronto, Municipal Code Ch. 760 (MLTT)". | https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/ | 2026 | Medium-High |
| `orgs.premTax` | `Ontario Ministry of Finance` | **CONFIRMED.** Retail Sales Tax on insurance premiums is administered by the Ministry of Finance. | https://www.ontario.ca/document/retail-sales-tax | 2026 | High |
| `orgs.rebate` | `Ontario Ministry of Finance · City of Toronto` | **CONFIRMED.** Provincial refund from MoF; municipal rebate from City of Toronto Revenue Services. | (as above) | 2026 | High |
| `orgs.market` | `CREA MLS® HPI` | **IMPRECISE.** The Toronto benchmarks above come from **TRREB**'s MLS® HPI (TRREB is the board; CREA aggregates nationally). Attribution should read "TRREB MLS® HPI" for Toronto, "OREB MLS® HPI" for Ottawa. | https://trreb.ca/market-data/market-watch/ | July 2026 | High |
| `bench.house` | `1180000` | **CORRECTED → `1291690`** (City of Toronto / 416 detached MLS HPI benchmark, July 2026). Semi-detached $964,922; townhouse $817,213 for reference. Placeholder is ~$112k (8.7%) low. | https://trreb.ca/market-data/market-watch/ (July 2026, `mw2607.pdf`) | July 2026 | Medium-High (search snippet of TRREB data; the PDF itself would not parse) |
| `bench.condo` | `688000` | **CORRECTED → `636323`** (416 condo apartment MLS HPI benchmark, July 2026). Placeholder is ~$52k (8.1%) high. | https://trreb.ca/market-data/market-watch/ (July 2026) | July 2026 | Medium-High (same caveat) |
| `bench.newbuild` | `1090000` | UNVERIFIED — MLS HPI has no new-build series. Needs Altus Group GTA new-home price index or StatCan NHPI (table 18-10-0205). See "needs a human". | — | — | — |
| `rent` (2-bed monthly) | `2850` | **PARTIALLY CORRECTED.** CMHC RMS Oct 2025 (latest full survey): purpose-built 2-bedroom average **$2,046**; condo-apartment 2-bedroom average **$2,891**. The `2850` placeholder is close to the *condo* figure, not the purpose-built one — it is defensible for a condo-rental comparison but is NOT "the" Toronto 2-bed rent. Next CMHC survey: Dec 2026. | https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/market-reports/rental-market-reports-major-centres · https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/Table?TableId=2.2.11&GeographyId=2270&GeographyTypeId=3 | Oct 2025 reference month | Medium-High |
| `yoy` | `0.008` | **CORRECTED — SIGN IS WRONG. → approx `-0.038`** (City of Toronto MLS HPI composite, −3.8% YoY July 2026; GTA-wide −4.6%). Average selling price $1,003,956, −4.5% YoY. The placeholder says prices are *rising* 0.8%; they are *falling*. | https://trreb.ca/market-data/market-watch/ (July 2026) | July 2026 | Medium-High |
| `taxTime` HBA (federal, cross-check) | `1500` | **CONFIRMED $1,500** — the federal Home Buyers' Amount (CRA line 31270) is a $10,000 non-refundable credit at 15% = **$1,500 maximum**. Federal, not Ontario-specific; identical in both files. | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html | 2026 | High |

---

## Ottawa

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| `transfer[0]` Ontario provincial LTT brackets | `[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [null, 0.025]` | **CONFIRMED — identical to Toronto's provincial line and unchanged since 2017-01-01.** Up to $55,000 → 0.5%; $55,001–$250,000 → 1.0%; $250,001–$400,000 → 1.5%; $400,001+ → 2.0%; $2,000,001+ → 2.5% **only where the land contains one or two single family residences** (otherwise 2.0% continues above $2M). | https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax | Effective 2017-01-01, current 2026 | High |
| municipal LTT | none | **CONFIRMED CORRECT.** Toronto is the only Ontario municipality with a municipal land transfer tax. Ottawa has none. | https://www.ratehub.ca/land-transfer-tax-ontario | 2026 | High |
| `rebates[0]` Ontario FTB LTT refund cap | `4000` | **CONFIRMED $4,000.** Full refund up to a purchase price of ~$368,333; prorated above. | https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers | 2026 | High |
| `premiumTax.rate` ON RST on CMHC premium | `0.08` | **CONFIRMED 8%.** Insurance premiums were carved out of HST in 2010 and remain under the Ontario Retail Sales Tax at 8%. Payable in cash at closing; cannot be rolled into the mortgage. Label "Ontario retail sales tax, 8%" is accurate. | https://www.ontario.ca/document/retail-sales-tax | 2026 | High |
| `propTax` total residential rate | `0.01144` | **CORRECTED → ~`0.012271`** (1.2271%, urban residential, all-in). Education component confirmed at 0.153%; the remainder is city-wide + transit + urban area (fire/police) levies. 2026 budget raised residential taxes 3.75%. NOTE: one secondary source quotes ~1.01% (likely municipal-only, excluding education + urban area), so this needs the official City of Ottawa 2026 tax rate schedule to nail down — `pub-ottawa.escribemeetings.com` DocumentId=305531 ("2026 Tax Policy and Other Revenue Matters") is the primary source but returns HTTP 403 to automated fetch. | https://catax.tools/property-tax-ottawa/ · https://www.cbc.ca/news/canada/ottawa/here-s-what-will-cost-you-more-if-ottawa-s-2026-budget-passes-9.6977765 | 2026 tax year | **Medium** (secondary sources only; primary PDF blocked) |
| `fees.lawyer` | `1900` | UNVERIFIED — unregulated; Ottawa purchase legal fees commonly **$1,000–$2,000 + HST + disbursements**. Uncited. | — | — | Low |
| `fees.titleIns` | `375` | UNVERIFIED — same **$250–$500** band as Toronto. Uncited. | — | — | Low |
| `fees.inspect` | `550` | UNVERIFIED — typical **$400–$650**. Uncited. | — | — | Low |
| `fees.appraisal` | `400` | UNVERIFIED — typical **$300–$500**. Uncited. | — | — | Low |
| `fees.statusCert` (ON statutory max) | `110` | **CORRECTED → `100`.** Same statutory cap as Toronto: $100 **including all applicable taxes**. `110` exceeds the legal maximum. | https://www.condoauthorityontario.ca/status-certificates/ | 2026 | High |
| `fees.moving` | `1300` | UNVERIFIED — uncited market estimate. | — | — | Low |
| `fees.setup` | `600` | UNVERIFIED — Hydro Ottawa / Enbridge hook-up + deposits; uncited. | — | — | Low |
| `orgs.transfer` | `Ontario Ministry of Finance` | **CONFIRMED.** | https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax | 2026 | High |
| `orgs.premTax` | `Ontario Ministry of Finance` | **CONFIRMED.** | https://www.ontario.ca/document/retail-sales-tax | 2026 | High |
| `orgs.market` | `CREA MLS® HPI` | **IMPRECISE** — Ottawa benchmarks come from the **Ottawa Real Estate Board (OREB)** MLS® HPI. Should read "OREB MLS® HPI". | https://www.oreb.ca/newsroom/ottawa-home-sales-hold-steady-as-new-listings-ease-in-july/ | July 2026 | High |
| `orgs.muni` | (absent) | **CORRECT that it is absent.** Toronto is the only Ontario municipality levying a municipal LTT; Ottawa levies none, so there is no municipal transfer authority to name. | https://www.ratehub.ca/land-transfer-tax-ontario | 2026 | High |
| `bench.house` | `690000` | PENDING — OREB July 2026 release gives single-family YoY (+0.6%) but not the dollar benchmark. Composite benchmark is **$634,000**. See "needs a human". | https://www.oreb.ca/newsroom/ottawa-home-sales-hold-steady-as-new-listings-ease-in-july/ | July 2026 | Low |
| `bench.condo` | `425000` | PENDING — OREB gives apartment YoY (−5.2%) but not the dollar benchmark. | https://www.oreb.ca/newsroom/ottawa-home-sales-hold-steady-as-new-listings-ease-in-july/ | July 2026 | Low |
| `bench.newbuild` | `720000` | UNVERIFIED — no MLS HPI series exists for new-build; would need CMHC absorbed-unit price or Altus/StatCan NHPI. See "needs a human". | — | — | — |
| `rent` (2-bed monthly) | `2150` | Ottawa has no `rent`/`yoy` in the task's required scope (Toronto only was requested), but the field is populated. UNVERIFIED against CMHC Rental Market Survey. | — | — | — |
| `yoy` | `0.021` | **LIKELY WRONG (sign/magnitude).** OREB composite benchmark July 2026 is **−0.5% YoY**; single-family +0.6%; apartment −5.2%. The `+2.1%` placeholder matches none of these. | https://www.oreb.ca/newsroom/ottawa-home-sales-hold-steady-as-new-listings-ease-in-july/ | July 2026 | Medium |

---

## Discrepancies that change money materially

Ordered by dollar impact.

### 1. Toronto MLTT luxury tiers are stale by a full rate schedule (BIGGEST)
`toronto.ts` carries the **pre-April-2026** luxury rates (2.5 / 3.5 / 4.5 / 5.5 / 6.5 / 7.5%). Toronto
city council approved a substantial increase effective **2026-04-01**: 4.4 / 5.45 / 6.5 / 7.55 / 8.6%
on the bands from $3M up. Because the tax is marginal, the shortfall compounds with price:

| Purchase price | MLTT under placeholder | MLTT under 2026 rates | Understated by |
|---|---|---|---|
| $3,500,000 | ~$68,725 | ~$77,725 | **~$9,000** |
| $5,000,000 | ~$115,725 | ~$149,225 | **~$33,500** |
| $10,000,000 | ~$390,725 | ~$474,225 | **~$83,500** |

(Figures are the municipal line only; provincial LTT is charged on top and is unchanged.)
Anything at or below $3,000,000 is unaffected — which is the overwhelming majority of buyers — but
for the luxury segment the app currently under-quotes closing costs by tens of thousands of dollars.

### 2. `fees.statusCert = 110` exceeds the statutory maximum
Ontario caps the status certificate fee at **$100 including all applicable taxes** (*Condominium
Act, 1998*, O. Reg. 48/01). The `110` in both files looks like someone added HST to $100 — but the
cap is tax-inclusive, so no condo corporation may lawfully charge $110. Small money ($10), but it is
a *legal* error, not an estimate, and it appears in a product whose whole premise is showing what is
actually true. Fix in both `toronto.ts` and `ottawa.ts`.

### 3. `yoy` has the wrong sign in both cities
Toronto `yoy: 0.008` (+0.8%) vs actual **−3.8%** (City of Toronto MLS HPI composite, July 2026);
Ottawa `yoy: 0.021` (+2.1%) vs actual **−0.5%** composite. Any forward projection, rent-vs-buy
break-even, or equity-accumulation model built on these will assume appreciation where the market is
flat-to-falling — a ~4.6 percentage-point error per year in Toronto, which compounds over a
25-year amortization into a very large distortion. This is the most consequential error for the
*not-yet-built* Rent vs Buy and Amortization pages.

### 4. Toronto property tax rate under-stated by ~2%
`0.00752` vs actual **`0.00767311`**. On a $1M assessment that is ~$153/yr, ~$13/mo — small in
isolation, but it feeds the "comfort ceiling" carrying-cost calculation directly.

### 5. Ottawa property tax rate under-stated by ~7%
`0.01144` vs approximately **`0.012271`**. On a $700k assessment that is ~$580/yr, ~$48/mo of
carrying cost missing. Larger relative error than Toronto's, and it flows straight into the
affordability ceiling. Confidence is only medium — see below.

### 6. Toronto benchmarks off by ~8% in both directions
`bench.house` 1,180,000 → **1,291,690** (understated $112k); `bench.condo` 688,000 → **636,323**
(overstated $52k). Note they err in *opposite* directions, so any house-vs-condo comparison is
skewed by ~$164k of spread.

---

## Unverifiable / needs a human

1. **City of Toronto's own MLTT rates page could not be read.** The rate table above rests on four
   concurring secondary sources (CBC, two law/realtor firms, NOW Toronto), not on toronto.ca. Before
   shipping the corrected luxury tiers, a human should open
   `toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/` and
   confirm the exact band boundaries and rates, plus whether the by-law amendment altered the
   first-time-buyer rebate interaction at the top end. Note also that at least one tax-explainer site
   (torontotaxpayer.ca) still publishes the **old** schedule and collapses $5M–$20M into a single
   5.5% band — evidence that stale MLTT tables are circulating widely.

2. **Ottawa's total residential property tax rate.** The primary source — City of Ottawa
   "2026 Tax Policy and Other Revenue Matters" (`pub-ottawa.escribemeetings.com`, DocumentId=305531)
   — returns HTTP 403 to automated fetch. Secondary sources disagree: 1.2271% vs ~1.01%. The
   difference is likely municipal-only vs all-in (municipal + transit + urban area + 0.153%
   education), and Ottawa's urban/rural area rates genuinely differ, so a single scalar `propTax`
   may be structurally wrong for Ottawa. A human should pull the official rate schedule and decide
   whether the model needs an urban/rural distinction.

3. **`bench.newbuild` for both cities — no source exists in the MLS HPI.** The MLS® HPI covers
   resale only. A defensible new-build benchmark needs Altus Group's GTA/Ottawa new-home price data
   or StatCan's New Housing Price Index (table 18-10-0205), neither of which is free/open. Until
   then both `newbuild` figures are pure invention and should arguably be removed or explicitly
   flagged in the UI rather than displayed as a benchmark.

4. **Exact OREB dollar benchmarks for Ottawa house and condo.** OREB's July 2026 release publishes
   the composite ($634,000) and the YoY percentages, but not the per-type dollar benchmarks. Those
   live in OREB's full MLS® HPI tables, which need to be downloaded directly.

5. **Every `fees.*` value except `statusCert` is uncited.** Legal fees, title insurance, inspection,
   appraisal, moving and utility setup are unregulated market prices with no authoritative
   publisher. The ranges noted in the tables are directional, not sourced. Getting these right needs
   either a human phoning a few Toronto/Ottawa real estate firms, or a decision to present them as
   user-editable ranges rather than fixed point estimates. Given norma's stated premise, a
   user-editable range is probably the honest design.

6. **Toronto `rent` semantics are ambiguous.** CMHC's Oct 2025 survey gives two very different
   two-bedroom averages: **$2,046** purpose-built vs **$2,891** condo. The placeholder `2850` is
   effectively the condo number. Which one the product means is a product decision, not a data
   lookup — and it should be labelled in the UI either way. Also note the CMHC reference month is
   **October 2025**, roughly ten months stale as of this research; the next survey lands Dec 2026.

7. **The 2.5% provincial top tier is conditional.** It applies only where the land contains one or
   two single-family residences; otherwise 2.0% continues above $2M. The current `brackets` array
   cannot express that condition. Same conditionality applies to Toronto's luxury tiers. For a
   single-family-home affordability tool this is almost always the right branch, but the model has
   no way to represent the alternative.

8. **MPAC assessments are frozen at January 1, 2016 values.** Both `propTax` rates are applied to a
   *Current Value Assessment*, not to market price. Multiplying today's purchase price by 0.767311%
   materially **over-states** Toronto property tax for a home whose 2016 CVA is well below its 2026
   price. This is an engine-level modelling issue, not a data-value issue, and it likely affects
   every Ontario jurisdiction in `src/domain/`. Worth raising as its own issue.

