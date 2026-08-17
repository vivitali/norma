# Prairies data verification — Winnipeg (MB), Saskatoon (SK), Calgary (AB)

**Date:** 2026-08-17
**Scope:** verify every figure in `src/domain/jurisdictions/{winnipeg,saskatoon,calgary}.ts` against primary sources.
**Status legend:** `UNVERIFIED` = could not confirm from an authoritative source within this pass's budget — never a guess.

> No files under `src/` were edited by this research pass. This document is findings only.

---

## Winnipeg / Manitoba

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| LTT bracket table | `[[30000,0],[90000,0.005],[150000,0.01],[200000,0.015],[null,0.02]]` | **CONFIRMED — exact match.** First $30,000: 0% · $30,001–$90,000: 0.5% · $90,001–$150,000: 1.0% · $150,001–$200,000: 1.5% · over $200,000: 2.0%. Marginal/sliding-scale, on fair market value of land transferred. | https://www.gov.mb.ca/finance/other/print,landtransfertax.html | current as fetched 2026-08-17 | high |
| Land title registration fee | `$130` fixed | **CORRECTED → `$137.00`** (electronic registration; `$144.00` paper). Teranet Manitoba "Land Titles Fees, Effective January 4, 2026", item `TR1 Transfer >30,000 Fee` = $137.00 e-reg / $144.00 paper (`TR2 Transfer <30,000` same amount). | https://teranetmanitoba.ca/wp-content/uploads/2025/09/2026-LTR-Fee-Schedule-Bareme-des-droits-LTR-2026-1.pdf | effective 2026-01-04 | high |
| **Mortgage registration fee — MISSING from winnipeg.ts** | *(no `li_mortReg` line)* | **`$137.00`** e-reg / `$144.00` paper — item `MTGE Mortgage`. Saskatoon and Calgary both carry a mortgage-registration line; Winnipeg does not. | https://teranetmanitoba.ca/wp-content/uploads/2025/09/2026-LTR-Fee-Schedule-Bareme-des-droits-LTR-2026-1.pdf | effective 2026-01-04 | high |
| First-time-buyer LTT rebate | none (`kind: "none"`) | **CONFIRMED — Manitoba has no first-time-buyer LTT rebate or exemption.** Neither the Manitoba Finance LTT page nor Teranet's land-transfer-tax help article mentions any FTHB relief. | https://www.gov.mb.ca/finance/other/print,landtransfertax.html · https://landtitlesmb.zendesk.com/hc/en-ca/articles/27634257641115-Land-transfer-tax | 2026-08-17 | high |
| PST on CMHC premiums | `premiumTax: null` (removed 2020) | **CONFIRMED — `null` is correct.** Manitoba eliminated its 7% RST on mortgage-default-insurance premiums effective 2020 and has not reinstated it. Only ON, QC and SK still tax these premiums. | https://www.ratehub.ca/pst-on-cmhc-insurance · https://www.ratehub.ca/cmhc-insurance-manitoba | 2026 | medium — corroborated across industry sources; not confirmed on a gov.mb.ca RST bulletin |
| City of Winnipeg total residential property tax rate | `propTax: 0.0132` | **CONFIRMED as a reasonable central value — 0.013215 for the Winnipeg School Division.** Derivation below. Range across the 8 divisions: **0.011350 – 0.013289**. | https://assessment.winnipeg.ca/Asmttax/pdfs/rates/HistoricalCombinedMillRates.pdf · https://assessment.winnipeg.ca/AsmtTax/English/Property/TaxRates.stm | 2026 mill rate table | high |
| Combined marginal table (MB) | `[[47000,0.258],[57375,0.2355],[100000,0.3325],[114750,0.379],[158519,0.434],[220000,0.464],[null,0.504]]` | **WRONG — stale thresholds and non-monotonic.** Correct 2026 table below. | https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf | rates reflect budget/news to 2026-01-15 | high |
| Benchmark house | `454264` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Benchmark condo | `290522` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Benchmark newbuild | `480000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Rent (monthly) | `1600` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| YoY price growth | `0.024` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — lawyer | `1800` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — title insurance | `350` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — inspection | `600` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — appraisal | `400` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — status/estoppel cert | `100` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — moving | `1500` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — utility setup | `3000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Tax-time credit — HBA | `1500` | **LIKELY WRONG → `$1,400` for 2026.** The federal Home Buyers' Amount is a $10,000 claim at the *lowest federal personal rate*. EY's 2026 credit table gives that rate as **14.00%** (down from 15%), so `$10,000 × 14% = $1,400`. `$1,500` is the pre-rate-cut figure. Affects all three jurisdictions and `federal.hba`. | https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf | to 2026-01-15 | medium — the 14% rate is confirmed; the $10,000 claim base and the arithmetic are inferred, CRA's line 31270 page returned 403 |
| Orgs | Manitoba Finance / WinnipegREALTORS via WOWA | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |

### Manitoba combined federal + provincial marginal rates, 2026 (ordinary income)

EY, *Combined federal and provincial personal income tax rates — 2026, Manitoba*
(rates reflect budget proposals and news releases to 2026-01-15):

| Lower limit | Upper limit | Marginal rate on excess |
|---|---|---|
| $0 | $15,780 | 0.00% |
| $15,781 | $16,452 | 10.80% |
| $16,453 | $47,000 | 24.80% |
| $47,001 | $58,523 | 26.75% |
| $58,524 | $100,000 | 33.25% |
| $100,001 | $117,045 | 37.90% |
| $117,046 | $181,440 | 43.40% |
| $181,441 | $200,000 | 46.69% |
| $200,001 | $258,482 | 47.55% |
| $258,483 | $400,000 | 51.25% |
| $400,001 | and up | 50.40% |

(The dip at $400,001 is real: the MB basic-personal-amount clawback ends there, so the 0.85%
surcharge that applies from $200,001–$400,000 drops off.)

**Two defects in the current placeholder:**
1. **Non-monotonic.** `[[47000,0.258],[57375,0.2355],…]` has the second bracket at a *lower* rate
   than the first. Under any reading of the `[upper, rate]` convention that is impossible for a
   progressive schedule — it is a data-entry bug, not merely a stale figure.
2. **Stale thresholds.** `57375`, `114750`, `158519`, `220000` are the *2024* federal bracket
   thresholds. The 2026 MB break-points are `47000 / 58523 / 100000 / 117045 / 181440 / 200000 /
   258482 / 400000`.

Note this table is only reachable through `Jurisdiction.marginal`, which `types.ts` documents as
"not consumed until a later phase ports `marginalRate()`" — so today the bug is latent, but it must
be fixed before that port.

### Winnipeg's portioned assessment — how the effective rate is derived

Winnipeg does not tax the full assessed value. Manitoba's *Municipal Assessment Act* assigns each
property class a **portion percentage**; the taxable base is `assessed value × portion`. Mill rates
are then applied to that **portioned** assessment, in mills (dollars per $1,000).

- Residential (single-family, multi-family, condo) portion: **45%**
- 2026 municipal mill rate: **13.372** (up 3.5% from 2025's 12.920)
- 2026 provincial Education Support Levy on residential: **0.000** — the ESL no longer applies to
  residential property (it remains 7.511 on farm/pipeline/institutional/commercial)
- 2026 school-division mill rate: varies by division, **11.851 – 16.158**

So `effective rate on market value = 0.45 × (municipal mill + ESL + school-division mill) / 1000`.

2026 combined residential mill rates and the effective rate they imply:

| School division | Combined mill rate | Effective rate on assessed market value |
|---|---|---|
| Pembina Trails | 25.223 | 0.011350 |
| Interlake | 25.608 | 0.011524 |
| River East Transcona | 26.740 | 0.012033 |
| St. James-Assiniboia | 27.220 | 0.012249 |
| Seine River | 27.528 | 0.012388 |
| Louis Riel | 28.025 | 0.012611 |
| **Winnipeg** | **29.366** | **0.013215** |
| Seven Oaks | 29.530 | 0.013289 |

The placeholder `0.0132` is effectively the Winnipeg School Division figure. Defensible as the
single-rate default for the city core, but it is the **second-highest of eight** divisions — a buyer
in Pembina Trails pays ~14% less property tax than the model shows.

**Not modelled:** Manitoba's Homeowners Affordability Tax Credit reduces the school-tax portion of
the bill for principal residences. `propTax` is a gross rate; whether the app should net this out is
a product question, not a data error.

---

## Saskatoon / Saskatchewan

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| ISC title registration fee — rate | `0.003` (0.3%) | **CORRECTED → `0.004` (0.4%)** of the value of the title/abstract. | https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf | effective 2026-04-15 | high |
| ISC title registration fee — minimum | `$25` | **CONFIRMED — `$25.00`** for titles valued $500.01–$6,300 (and Free at $0–$500). | https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf | effective 2026-04-15 | high |
| ISC title registration fee — value floor | `$8,400` | **CORRECTED → `$6,300`.** The 0.4% rate starts at $6,300.01. `$8,400` is the floor for a *Title **Transmission*** (0.15% above $8,401) — a different transaction, wrong row. | https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf | effective 2026-04-15 | high |
| Mortgage registration fee | `$160` fixed | **WRONG SHAPE — it is a tiered fee on mortgage value, not a flat amount, and every tier exceeds $160.** Table below. | https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf | effective 2026-04-15 | high |
| SK PST rate on CMHC premiums | `0.06` | **CONFIRMED — 6%.** Saskatchewan's general PST rate is 6% and it applies to insurance premiums including mortgage default insurance (taxable since 2017). Only ON (8%), QC (9%) and SK (6%) tax these premiums. | https://www.ratehub.ca/pst-on-cmhc-insurance | 2026 | medium — the 6% general PST rate is well established, but saskatchewan.ca's PST pages returned no content to WebFetch/curl, so this is not confirmed on a Ministry of Finance bulletin |
| City of Saskatoon total residential property tax rate | `propTax: 0.01285` | **CORRECTED → `0.0104668`** on market value. 2026 residential tax rates: City **0.0080291** + Library **0.0007844** + Education **0.0042700** = **0.0130835**, but that applies to the *taxable* assessment, which for 2026 is **80% of assessed value** (Percentage of Value, set provincially). `0.80 × 0.0130835 = 0.0104668`. The placeholder is essentially the un-discounted sum — it **omits the 80% POV**. | https://www.saskatoon.ca/tax-rates-mill-rates | 2026 tax year | high |
| First-time-buyer LTT rebate | none | **CONFIRMED — Saskatchewan has no land transfer tax at all**, hence no rebate. Buyers pay only the ISC registration fees above. | https://www.saskregistries.ca/fees/landtitlesfees | 2026 | high |
| Benchmark house | `402000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Benchmark condo | `232000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Benchmark newbuild | `455000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Rent (monthly) | `1450` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| YoY price growth | `0.039` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — lawyer | `1450` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — title insurance | `300` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — inspection | `500` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — appraisal | `350` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — status/estoppel cert | `200` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — moving | `1200` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — utility setup | `550` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Tax-time credit — HBA | `1500` | **LIKELY WRONG → `$1,400` for 2026.** The federal Home Buyers' Amount is a $10,000 claim at the *lowest federal personal rate*. EY's 2026 credit table gives that rate as **14.00%** (down from 15%), so `$10,000 × 14% = $1,400`. `$1,500` is the pre-rate-cut figure. Affects all three jurisdictions and `federal.hba`. | https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf | to 2026-01-15 | medium — the 14% rate is confirmed; the $10,000 claim base and the arithmetic are inferred, CRA's line 31270 page returned 403 |
| Tax-time credit — SK provincial FTHB | `1155` | **UNVERIFIED.** saskatchewan.ca's First-Time Homebuyers' Tax Credit page returned HTTP 403 to every fetch attempt and the web-search budget was exhausted before an alternative authoritative source could be reached. `$1,155` does not decompose cleanly into the expected `$10,000 × SK lowest rate (10.5%) = $1,050`; it would require an $11,000 claim base. Needs a human to open the page. | (unreachable) https://www.saskatchewan.ca/residents/taxes-and-investments/tax-credits/first-time-homebuyers-tax-credit | — | none |
| Orgs | ISC / SK Ministry of Finance / CREA MLS HPI | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |

### ISC fee schedules, reproduced exactly

**Title or Abstract Transfer** (Registration Services), effective 2026-04-15:

| Titles & abstracts valued at | Fee |
|---|---|
| $0 to $500 | Free |
| $500.01 to $6,300 | $25.00 |
| $6,300.01 and greater | 0.4% of the value of the title or abstract |

So the correct `rateMin` line is `{ rate: 0.004, min: 25, floor: 6300 }`. Note the schedule is a
**cliff**, not a true minimum: at exactly $6,300.01 the fee jumps from $25.00 to $25.20, so
`floor: 6300` with `min: 25` reproduces it correctly.

**Registration of Mortgage** (Interest Registration Services), effective 2026-04-15. "The first four
titles, interests, or shares affected will be charged in accordance with the following ranges. After
the first four titles, each additional title, interest, or share affected will be charged a $55.00
flat fee."

| Interest valued at | Fee |
|---|---|
| $0 to $249,999.99 | $200.00 |
| $250,000 to $500,000 | $275.00 |
| $500,000.01 to $750,000 | $525.00 |
| $750,000.01 to $1,000,000 | $775.00 |
| $1,000,000.01 and greater | $1,000.00 |

(For contrast, the previous schedule — Land Title Fees Table 05-2024 — had $180 / $250 / $500 /
$750 / $1,000. The April 2026 adjustment raised the first four tiers.)

This is a **new `TransferLine` shape**: a step/tier table on the *loan* amount, keyed to bracket
ceilings but flat within each bracket. None of the five existing `TransferLine` kinds in
`src/domain/types.ts` (`brackets`, `flat`, `fixed`, `perValue`, `rateMin`) express it —
`brackets` is marginal, not stepped. Modelling SK correctly needs a sixth kind (e.g. `stepped`).

---

## Calgary / Alberta

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| Land transfer tax | none (AB has no LTT) | **CONFIRMED.** Alberta levies no land transfer tax. What buyers pay is the statutory *transfer levy* and *mortgage levy* under the Land Titles Act, plus the Tariff of Fees Regulation charges. | https://kings-printer.alberta.ca/documents/Acts/l04.pdf | RSA 2000 c L-4, consolidated | high |
| Title (transfer) registration fee formula | `base 50 + 5 per 5000 of price` | **CONFIRMED — exact match.** *Land Titles Act* s. 64.1(2): "an amount equal to **$50 plus $5 for each $5000 or portion thereof** of the value of the land or interest in land to which the instrument relates." Note **"or portion thereof"** = round *up* per $5,000 unit. | https://kings-printer.alberta.ca/documents/Acts/l04.pdf | RSA 2000 c L-4 s.64.1, current consolidation | high |
| Mortgage registration fee formula | `base 50 + 5 per 5000 of loan` | **CONFIRMED — exact match.** *Land Titles Act* s. 102.1(2): "an amount equal to **$50 plus $5 for each $5000 or portion thereof** of … (b) the principal amount secured by the mortgage." | https://kings-printer.alberta.ca/documents/Acts/l04.pdf | RSA 2000 c L-4 s.102.1, current consolidation | high |
| PST/tax on CMHC premiums | `premiumTax: null` | **CONFIRMED — `null` is correct.** Alberta has no PST at all. Only ON, QC and SK tax mortgage-default-insurance premiums. | https://www.ratehub.ca/pst-on-cmhc-insurance | 2026 | high |
| City of Calgary total residential property tax rate | `propTax: 0.00654` | **CORRECTED → `0.0066499`** (2026). Municipal **0.0038906** + provincial education **0.0027593**. City's own worked example: median single detached assessed at $706,000 → $2,746.76 city + $1,948.06 province = **$4,694.82**. Alberta taxes 100% of assessed value — no portioning. | https://www.calgary.ca/property-owners/taxes/bill-rate-calculation.html | 2026 tax year | high |
| Benchmark house | `622000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Benchmark condo | `342000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Benchmark newbuild | `660000` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Rent (monthly) | `1850` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| YoY price growth | `0.028` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — lawyer | `1600` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — title insurance | `325` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — inspection | `550` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — appraisal | `400` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — condo document / estoppel cert | `350` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — moving | `1300` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Fee — utility setup | `600` | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |
| Tax-time credit — HBA | `1500` | **LIKELY WRONG → `$1,400` for 2026.** The federal Home Buyers' Amount is a $10,000 claim at the *lowest federal personal rate*. EY's 2026 credit table gives that rate as **14.00%** (down from 15%), so `$10,000 × 14% = $1,400`. `$1,500` is the pre-rate-cut figure. Affects all three jurisdictions and `federal.hba`. | https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf | to 2026-01-15 | medium — the 14% rate is confirmed; the $10,000 claim base and the arithmetic are inferred, CRA's line 31270 page returned 403 |
| Orgs | Alberta Land Titles / ATB Finance / CREA MLS HPI | **UNVERIFIED** — see "Market data and service-fee ranges" below | — | — | none |

---

### Alberta — where the tariff actually lives, and what the model omits

The per-value amounts are **not** in the *Tariff of Fees Regulation* (AR 120/2000, consolidated to
AR 5/2025, current as of 2025-01-31), which is where you would expect to find them. Searching that
regulation for "value", "$5,000" or "mortgage" returns nothing relevant — it only carries flat fees
(caveat $35, writ $15, plan $30 + $10/parcel, correcting transfer $50, etc.).

The value-based levies are in the ***Land Titles Act* itself**:

- **s. 64.1(2) Transfer levy** — `$50 + $5 for each $5,000 or portion thereof of the value of the
  land or interest in land`
- **s. 102.1(2) Mortgage levy** — `$50 + $5 for each $5,000 or portion thereof of … the principal
  amount secured by the mortgage`

Both match `calgary.ts` exactly (`base: 50, per: 5, unit: 5000`). This is the **post-increase**
tariff: the earlier rate was $50 + $2 per $5,000, raised to $5 per $5,000 by the 2024 amendments
(AR 158/2024 runs through the companion regulation). The current values are correct for 2026.

Two things the model does not capture:

1. **"or portion thereof" means round up.** On a $622,000 purchase the levy is
   `50 + 5 × ceil(622000/5000) = 50 + 5 × 125 = $675`, not `50 + 5 × 124.4`. Whether
   `kind: "perValue"` rounds up is a code question outside this document's scope, but the statute is
   unambiguous.
2. **The 10% assurance-fee split is internal.** Tariff of Fees Regulation s.1(2): "For each fee, 90%
   of the total amount is payable as the fee for the performance of the duty specified and 10% of
   the total amount is payable as assurance fees." This is an *allocation* of the fee already
   charged — it is **not** an add-on. The model is right to charge the levy once.
3. **Seniors' 25% reduction** (Tariff of Fees Regulation s.1.1, added AR 55/2024) applies only to a
   short list of title-copy services in the Schedule, not to the transfer or mortgage levy. No
   modelling impact.

---

## Market data and service-fee ranges — not verified in this pass

Every `bench.*`, `rent`, `yoy`, `fees.*` and `orgs.*` value across all three jurisdictions remains
**UNVERIFIED**. This pass deliberately spent its budget on the statutory figures (tax brackets, fee
tariffs, mill rates), which are the ones with a single authoritative answer. The session's
web-search budget (200 calls) was exhausted before the market data could be reached, and the
remaining fetch-only attempts did not land on a citable source.

What *is* known, and why it matters:

- **CREA's July 2026 release states the non-seasonally-adjusted National Composite MLS® HPI was
  down 3.6% year over year vs. June 2025** (https://stats.crea.ca/en-CA/). All three `yoy` values in
  the model are *positive* (Winnipeg 2.4%, Saskatoon 3.9%, Calgary 2.8%). The Prairie markets have
  outperformed the national composite recently, so a positive local `yoy` is not automatically
  wrong — but these figures were carried over from the prototype and none of them was set against
  2026 data. City-level HPI needs to be pulled per market.
- The `fees.*` numbers (lawyer, title insurance, inspection, appraisal, condo document/estoppel
  certificate, moving, utility setup) are **point estimates with no cited range**, and they are not
  the kind of figure a primary source publishes — law-society fee schedules, home-inspector
  associations and moving companies all quote ranges. Verifying these means gathering quotes and
  recording a range with a stated methodology, not looking up a number.
- **`winnipeg.fees.setup = 3000` is a conspicuous outlier**: Saskatoon carries `550` and Calgary
  `600` for the same field. A 5× gap for utility setup between three Prairie cities is far more
  likely to be a transcription error in the prototype than a real market difference. Flagging it as
  the highest-value item to re-check even though it was not verifiable here.

---

## Discrepancies that change money materially

Ranked by dollar impact on a typical purchase in each city.

1. **Saskatoon mortgage registration fee is modelled as a flat $160; the real fee is a tiered
   $200–$1,000 on the mortgage amount.** On a $402,000 benchmark house with 10% down
   (~$361,800 loan, ignoring the CMHC premium), the correct fee is **$275** — the model understates
   by $115. Above $500,000 of mortgage the understatement is **$365 to $840**. Worse than the dollar
   gap: none of the five `TransferLine` kinds in `types.ts` can express a stepped table, so this is
   a schema change, not a constant edit.

2. **Saskatoon property tax rate omits the 80% Percentage of Value.** Model `0.01285` vs. actual
   `0.0104668` — a **23% overstatement** of annual property tax. On the $402,000 benchmark that is
   `$5,166` modelled vs. `$4,208` actual, **$958/yr, ~$80/month**. Since the comfort ceiling
   subtracts property tax from net income before deriving affordability, an $80/month error
   propagates straight into a materially understated ceiling. This is the biggest recurring-cost
   error found.

3. **Federal Home Buyers' Amount is $1,500 in the model; 2026 value is $1,400.** A $100 one-time
   overstatement, but it hits **all three jurisdictions and `federal.hba`** — it is the same stale
   assumption (15% lowest federal rate) in four places.

4. **Saskatoon title transfer fee rate is 0.3% in the model; actual is 0.4%.** On a $402,000
   purchase: `$1,206` modelled vs. **`$1,608`** actual — the model **understates closing costs by
   $402**. The `floor` is also wrong ($8,400 → $6,300), though that only matters below $8,400 of
   value and so has no practical effect on a home purchase.

5. **Calgary property tax rate: `0.00654` vs. actual `0.0066499`.** Small — on the $622,000
   benchmark, `$4,068` vs. `$4,136`, about **$68/yr**. Worth correcting since the exact rate is
   published, but not decision-changing.

6. **Winnipeg is missing a mortgage registration line entirely** — `$137` of real closing cost that
   the model never charges, where Saskatoon and Calgary both do. Small in dollars, but it is an
   inconsistency between jurisdictions rather than a stale number, so it will keep producing
   cross-city comparisons that are wrong in a systematic direction.

7. **Winnipeg land title registration fee `$130` vs. `$137`** — $7. Trivial, but free to fix.

8. **Winnipeg's `marginal` table is non-monotonic and uses 2024 thresholds.** Zero dollar impact
   *today* because `Jurisdiction.marginal` is not yet consumed (`types.ts`: "not consumed until a
   later phase ports `marginalRate()`"). Listed here because the moment that port lands, a
   rate table where bracket 2 is lower than bracket 1 will produce silently wrong after-tax income
   — and after-tax income is the input the entire comfort ceiling is built on.

**Net direction:** Saskatoon is wrong in *both* directions at once — closing costs understated by
~$517, annual carrying cost overstated by ~$958. Winnipeg and Calgary are close to right; Saskatoon
is the jurisdiction to fix first.

## Unverifiable / needs a human

1. **Saskatchewan First-Time Homebuyers' Tax Credit (`saskatoon.taxTime` `cr_provCredit` = $1,155).**
   saskatchewan.ca returns HTTP 403 to automated fetches. The value does not decompose into the
   expected `$10,000 × 10.5%`. Someone needs to open
   https://www.saskatchewan.ca/residents/taxes-and-investments/tax-credits/first-time-homebuyers-tax-credit
   in a browser.

2. **Federal Home Buyers' Amount, direct confirmation.** CRA's line 31270 page returns HTTP 403.
   The $1,400 figure is derived from EY's confirmed 14.00% lowest federal rate plus the $10,000
   claim base. Confirm the claim base has not also changed.

3. **All `bench`, `rent` and `yoy` values, all three cities.** Needs CREA MLS® HPI at city level for
   single-family and apartment benchmarks, a separate source for new-build, and CMHC's Rental Market
   Survey for rent. WinnipegREALTORS, Saskatoon Region Association of REALTORS® and CREB® publish
   monthly; none was reachable within this pass's budget.

4. **All `fees.*` values, all three cities.** These need quoted ranges with a stated methodology, not
   a lookup. `winnipeg.fees.setup = 3000` should be checked first — it is 5× the Saskatoon and
   Calgary values for the same field.

5. **Manitoba RST on mortgage default insurance — primary confirmation.** The 2020 removal is
   consistent across industry sources but was not confirmed on a gov.mb.ca Retail Sales Tax bulletin.
   The conclusion (`premiumTax: null`) is almost certainly right; the citation is second-hand.

6. **Saskatchewan PST on insurance premiums — primary confirmation.** Same situation: 6% is the
   general PST rate and is well attested, but saskatchewan.ca's PST pages returned nothing to
   automated fetching. Needs a Ministry of Finance information bulletin.

7. **Manitoba Budget 2026 announced changes to land transfer tax legislation taking effect in 2027**
   (MLT Aikins, https://www.mltaikins.com/insights/manitoba-budget-2026-changes-coming-to-land-transfer-tax-legislation-in-2027/).
   The 2026 brackets verified above are current, but the bracket table has a known expiry. Someone
   should read the budget detail and diarise the change.

8. **Whether `propTax` should be gross or net of homeowner credits.** Manitoba's Homeowners
   Affordability Tax Credit reduces the school-tax portion of a Winnipeg bill for principal
   residences. Both `0.0132` (Winnipeg) and the corrected `0.0104668` (Saskatoon) are *gross* rates.
   Whether to net these out is a product decision, not a data question — but it should be decided
   once, consistently, across all 14 jurisdictions.

9. **Which Winnipeg school division `propTax` should represent.** The effective rate ranges
   0.011350–0.013289 across the eight divisions. `0.0132` is the Winnipeg School Division figure,
   the second-highest of eight. Defensible, but it is a choice, and it should be a documented one.
