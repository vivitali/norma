# Canada / Manitoba / Winnipeg figures — sourced dossier

Date compiled: 2026-09-28. Scope: verification of every figure in `src/domain/jurisdictions/winnipeg.ts`
plus the new items requested (school-division table, HATC, LTT 2027 change, `fees.setup`).
Every figure is graded on the `Provenance.conf` scale in `src/domain/types.ts`
(`high` = read off the publisher's primary document; `medium` = secondary source, or the primary could
not be reached; `low` = derived from published figures; `assumption` = nobody publishes it, disclosed
default; `none` = nobody publishes it and we will not invent one). **Nothing here has been written into
`src/domain`; this is research input only.**

Access notes for the next person: the City's mill-rate PDF, the Teranet fee PDF, the CMHC HMIP table and
the Manitoba bulletins all fetched cleanly with `curl -A "Mozilla/5.0 Chrome/120"` then `pdftotext -layout`.
`WebFetch` alone fails on PDFs ("binary content"), and `myutility.winnipeg.ca/.../rates` and
`legacy.winnipeg.ca` are JavaScript-only / 403 respectively.

## Summary table

| # | Item | Value | Conf | As of |
|---|------|-------|------|-------|
| 1a | 2026 municipal mill rate | **13.372** (+3.5% on 2025's 12.920) | high | 2026 table |
| 1b | Residential Education Support Levy | **0.000** (ESL applies to non-residential only) | high | 2026 table |
| 1c | Eight school divisions, 2026 combined residential mills | 25.223 (Pembina Trails) … 29.530 (Seven Oaks); Winnipeg SD 29.366 | high | 2026 table |
| 1d | Residential portion | **45%** (Classification of Property and Portioned Values Regulation, M.R. 184/98) | high | current regulation |
| 1e | Frontage levy (not modelled) | $6.95/ft ($1.80 water + $5.15 sewer), last set 2023-04-20 | high | 2026 |
| 2 | HATC 2026 | **lesser of $1,600 and gross school taxes**, principal residence, applied on the tax statement | high | 2026-08 bulletin |
| 3a | LTT 2026 schedule | 0 / 0.5 / 1 / 1.5 / 2% at $30k/$90k/$150k/$200k — **confirmed** | high | current page (undated) |
| 3b | 2027 LTT change | Bill 53: new tax on **beneficial-interest** transfers from 2027-01-01; **no change to rates or brackets found** | high (fact) / medium (assent date) | Royal Assent 2026-06-01 (secondary) |
| 4 | Land Titles fees | TR1 $137 e / $144 paper; MTGE $137 e / $144 paper; flat, no value component | high | eff. 2026-01-04 |
| 5a | WinnipegREALTORS, **August 2026** (newest) | detached avg **$439,216 (−3% YoY)**; condo avg **$283,715 (+2% YoY)** | high | released 2026-09-03 |
| 5a | WinnipegREALTORS, July 2026 (record) | detached $454,264 (+2%); condo $290,522 (+2%) | high | released 2026-08-06 |
| 5b | CMHC Winnipeg 2BR average rent | **$1,570** (reliability a), Oct 2025; no newer dollar level | high | Oct 2025 |
| 6 | `fees.setup` | record $3,000; derived defensible figure **≈ $275** | assumption | 2026-09 |
| 7a | fees.lawyer / titleIns / inspect / appraisal / moving | $1,800 / $350 / $600 / $400 / $1,500 | assumption | secondary ranges only |
| 7b | fees.statusCert $100 | no statutory cap; market $100–$200 | assumption | — |
| 7c | Manitoba combined marginal brackets 2026 | record matches EY table exactly | high | EY, to 2026-01-15 |
| 7d | RST on mortgage insurance | **exempt since 2020-07-01** — gov.mb.ca Bulletin 061 (rev. July 2020) | **high** (upgrade from medium) | 2020-07 |
| 7e | Federal Home Buyers' Amount | $10,000 × 14% = **$1,400** | high | CRA page modified 2026-07-29 |

---

## 1. Winnipeg property tax by school division, 2026

- Publisher: City of Winnipeg Assessment and Taxation. Document: "2026 MILL RATES" and "2026 COMBINED MILL
  RATES BY SCHOOL DIVISION."
- URL: https://assessment.winnipeg.ca/Asmttax/pdfs/rates/HistoricalCombinedMillRates.pdf (fetched, `pdftotext -layout`)
- Document date: the page footer still reads "Last updated: April 7, 2025" beneath the 2025 block; the 2026
  block is on top of the file. The footer is unmaintained — the 2026 municipal rate (13.372, +3.5%) and ESL
  (7.511, +1.5%) are independently confirmed on
  https://assessment.winnipeg.ca/AsmtTax/English/Property/property-tax-bills.stm ("Municipal Mill Rate: 13.372 (3.5% increase from 2025)").
- conf: **high**.

Quoted rows (Residential Single-Family / Multi-Family / Condo columns are identical):

```
Portioned Percentage       45%
Municipal Mill Rate        13.372
Education Support           0.000   (7.511 on commercial/other classes)
School Division  (school portion)      Combined residential
Winnipeg                  15.994        29.366
St. James-Assiniboia      13.848        27.220
Pembina Trails            11.851        25.223
Seven Oaks                16.158        29.530
Seine River               14.156        27.528
Interlake                 12.236        25.608
Louis Riel                14.653        28.025
River East Transcona      13.368        26.740
```

The City states: "Each of Winnipeg's 8 school divisions sets its own budget. The City then sets each
division's mill rate according to the Province's rules governing the 'Special Levy'"
(https://assessment.winnipeg.ca/AsmtTax/English/Property/SchoolTaxes.stm) and "residential and farm properties
do not pay [the ESL]." Combined = municipal 13.372 + school portion (verified arithmetically for all eight).

**Division scolaire franco-manitobaine is NOT in the City's table** and no separate DSFM mill rate exists on
a Winnipeg residential bill; the City lists exactly eight divisions. (DSFM overlaps the geography but is not
a levying line here; conf medium on the "why" — only the absence from the primary table is `high`.)

Suggested ids, official English names (French names where the division has one) and resulting effective
rate on market value (`combined mills ÷ 1000 × 0.45`):

| id | Official name | School mills | Combined mills | effective (× 0.45) |
|----|---------------|-------------:|---------------:|-------------------:|
| `winnipeg-sd` | Winnipeg School Division (Division scolaire de Winnipeg) | 15.994 | 29.366 | 0.0132147 |
| `st-james-assiniboia` | St. James-Assiniboia School Division | 13.848 | 27.220 | 0.0122490 |
| `pembina-trails` | Pembina Trails School Division | 11.851 | 25.223 | 0.0113504 |
| `seven-oaks` | Seven Oaks School Division | 16.158 | 29.530 | 0.0132885 |
| `seine-river` | Seine River School Division | 14.156 | 27.528 | 0.0123876 |
| `interlake` | Interlake School Division | 12.236 | 25.608 | 0.0115236 |
| `louis-riel` | Louis Riel School Division | 14.653 | 28.025 | 0.0126113 |
| `river-east-transcona` | River East Transcona School Division | 13.368 | 26.740 | 0.0120330 |

(Only Winnipeg SD has a formally bilingual name in common use; the others are English-only names in
City documents — do not invent French names. Interlake SD covers only the Winnipeg's far-north edge;
it is a genuine but small share of Winnipeg addresses.)

**Portioning cite.** The 45% is set by the **Classification of Property and Portioned Values Regulation,
M.R. 184/98**, made under The Municipal Assessment Act, C.C.S.M. c. M226. The regulation's PORTIONED VALUES
Part lists "Residential 1 … 45.0%" (fetched:
https://web2.gov.mb.ca/laws/regs/current/_pdf-regs.php?reg=184/98). The City states "all residential dwelling
units pay taxes on 45% of their market value assessment"
(https://assessment.winnipeg.ca/AsmtTax/English/Property/Prop_Classifications.stm). conf **high**. (The
record's current provenance cites only "the Municipal Assessment Act class portions"; add the regulation.)

**Other scaling line on the bill — frontage levy (note only, not modelled).**
"The combined frontage levy rate is $6.95 per foot: Water Main $1.80 + Sewer Main $5.15", "per Section 432(1)
of the City of Winnipeg Charter, last updated April 20, 2023", billed as a separate line on the tax bill by
property frontage (https://assessment.winnipeg.ca/AsmtTax/English/Property/FrontLevies.stm). A 40-ft lot ≈ $278/yr;
a 50-ft lot ≈ $348/yr. Also not in the tax calculator: local improvement taxes and encroachment charges.
conf **high**.

**Sanity check of the record.** `publishedRate 0.029366`, `assessmentRatio 0.45`, `effective 0.0132147` all
match. The record's "eight divisions run 25.223 (Pembina Trails) to 29.530 (Seven Oaks)" and "second-highest
of eight" are correct (Seven Oaks 29.530 > Winnipeg 29.366 > Louis Riel 28.025).

**Recommendation:** keep the three figures and their `high` grade; add `M.R. 184/98` to the assessmentRatio
`src`; add note "frontage levy $6.95/ft ($1.80+$5.15, Charter s.432(1), set 2023-04-20) is a separate bill line, not modelled";
if divisions become selectable, use the eight ids above and the `effective` column (no DSFM entry).

---

## 2. Manitoba Homeowners Affordability Tax Credit (HATC), 2026

- Publisher: Manitoba Finance, Tax Assistance Office. URL: https://www.gov.mb.ca/finance/tao/hatc.html
  (undated page). Quotes: "For the 2026 tax year the maximum HATC amount increased from $1,500 to $1,600";
  "the amount of the HATC is the lesser of [$1,600 for 2026] and the gross school taxes on your principal
  residence"; "The HATC applies to principal residences only. It does not apply to any other properties
  (rental properties, secondary residences/cottages, commercial properties, etc.)."
- Primary bulletin: Manitoba Municipal and Northern Relations, **Bulletin #2026-08, "Homeowners Affordability
  Tax Credit 2026"** (https://www.gov.mb.ca/mr/mfas/pubs/mmo/bulletins_2026/2026-08-mnr-hatc_2026_communication.pdf,
  fetched via curl): "Eligible homeowners will receive up to $1,600 toward the school portion of their property
  taxes. The HATC will be applied directly on municipal property tax statements." "New property owners will
  have to declare their principal residence with their municipality before tax statement production has begun
  in order to have the HATC as an advance applied directly to the property tax statement." "Eligible
  homeowners who do not receive the HATC on their 2026 property tax bill can claim their credit on their 2026
  income tax return." "Current owners would automatically be rolled over."
- City of Winnipeg (https://assessment.winnipeg.ca/AsmtTax/English/Property/credit.stm): "For 2026, the credit is
  calculated as the lesser of the property owner's school taxes for the taxation year and $1600." Eligibility:
  "The taxpayer must own the property and be their principal residence"; "The property must be assessed as a
  single residential dwelling"; "The homeowner cannot be receiving the credit on another home elsewhere in the
  Province." Self-declaration to the Assessment and Taxation Department **by March 15** to be applied to the
  following year's bill. City bill page (2026-05-07): "It increased from $1,500 in 2025 to $1,600 in 2026."
- Stacking: HATC page — "There is no additional seniors' credit as part of the HATC, but the Seniors' School
  Tax Rebate continues to be available" (a separate program; not modelled, buyers are not assumed senior).
- 2027 (note): max rises to $1,700, and for properties assessed over $1,000,000 it is reduced at $3.40 per
  $1,000 above that (nil at $1,500,000). Not relevant to a 2026 record; re-check when year rolls.
- Legal authority: the pages and bulletin cite none. The Act/regulation was **not located** (the credit
  replaced the Education Property Tax Credit; the personal income tax claim route runs through Manitoba's
  income tax legislation). Do not put a statute cite in provenance.
- conf: **high** for amount/mechanics (Manitoba's own bulletin and page); **unverified**: whether a **condo**
  unit qualifies as a "single residential dwelling" — City wording suggests yes (condo is a residential class)
  but no page says so explicitly; treat condo as medium.

**Modelling mechanics for the engine:** credit = `min(1600, gross school tax)`. Winnipeg SD school tax =
`price × 0.45 × 0.015994 = price × 0.0071973`, so the cap binds (credit = $1,600) for any price above
≈ $222,300 (for Pembina Trails, 0.11851 → price × 0.0053330 → cap binds above ≈ $300,000). At the $454,264
benchmark: gross tax $6,003, credit $1,600, net $4,403. Because the credit is against the school portion
only, subtracting it from total property tax is exact whenever school tax ≥ $1,600 (i.e. almost always);
below that threshold the cap is the school tax itself.

**Recommendation:** add a note (not a value change) to `propTax`: "net of HATC for an owner-occupied principal
residence = total − min(1,600, school tax); school portion = price × 0.45 × school mills/1000"; keep the
gross rate, and if the engine subtracts a credit use $1,600 (2026), re-check for 2027 ($1,700, >$1M clawback).

---

## 3. Manitoba land transfer tax — 2026 schedule and the 2027 change

**2026 schedule (confirmed).** Publisher: Manitoba Finance. URL:
https://www.gov.mb.ca/finance/other/print,landtransfertax.html (undated). Quote: "On the first $30,000: 0%; On
the next $60,000 ($30,001 to $90,000): 0.5%; On the next $60,000 ($90,001 to $150,000): 1.0%; On the next $50,000
($150,001 to $200,000): 1.5%; On amounts in excess of $200,000: 2.0%." Exactly matches the record's brackets.
conf **high**. The page contains no first-time-buyer exemption (Manitoba has none in force — the record's
`kind: "none"` rebate is right).

**The 2027 change — it is NOT a rate change.** Manitoba Budget 2026 announced (MLT Aikins, 2026-04-07,
https://www.mltaikins.com/insights/manitoba-budget-2026-changes-coming-to-land-transfer-tax-legislation-in-2027/):
an intention to amend *The Tax Administration and Miscellaneous Taxes Act* "with amendments effective January
1, 2027", aimed at "avoidance arrangements where legal and beneficial ownership are separated." It has since been
legislated: **Bill 53, The Budget Implementation and Tax Statutes Amendment Act, 2026** (3rd Session, 43rd
Legislature; https://web2.gov.mb.ca/bills/43-3/b053e.php). Explanatory note: "providing an equivalent to the land
transfer tax on the transfer of beneficial interests in real property when a bare trust is used to hold the legal
title"; adds new **Part III.1, Tax on Transfer of Beneficial Interest in Land**; "Section 22, clause 23(b) and
sections 24 to 26 come into force on January 1, 2027, and apply to all acquisitions of, or increases in, a
beneficial interest in land in Manitoba on or after that day." The bill's own web page shows "Assented to" blank;
Royal Assent on **June 1, 2026** comes from MLT Aikins (2026-07-27,
https://www.mltaikins.com/insights/manitoba-expands-land-transfer-tax-regime-to-capture-transfers-of-beneficial-interests-in-land/)
— secondary, so grade the assent date medium. The new Part reuses the existing tiered formula starting at $30,000;
**no new thresholds, rates or exemptions for ordinary registered purchases were found**, and the MLT Aikins
article states the current structure is unmodified.
- conf: **high** that legislation passed and takes effect 2027-01-01 (bill text); **medium** for the assent
  date; **high** that the ordinary-purchase schedule is unchanged as far as the published text shows.

**Recommendation:** keep the brackets (`high`). Replace the record's note "KNOWN EXPIRY … legislation changes
taking effect in 2027, so this table has a diarised end date" with: "Bill 53 (Royal Assent 2026-06-01, per MLT
Aikins) adds Part III.1 taxing beneficial-interest transfers from 2027-01-01 using the same $30k-threshold
schedule; it does not change the schedule for a conventional registered purchase. Re-check when the 2027 budget
lands." The 'diarised end date' framing overstated the change.

---

## 4. Land Titles registration fees, 2026

- Publisher: Teranet Manitoba. Document: "2026 Land Titles Fee Schedule / Barème des droits LTR 2026," "Effective
  January 4, 2026." URL: https://teranetmanitoba.ca/wp-content/uploads/2025/09/2026-LTR-Fee-Schedule-Bareme-des-droits-LTR-2026-1.pdf (fetched, `pdftotext -layout`).
- Quoted rows (columns: Electronic Registration / Paper Registration):
  `TR1     Transfer >30,000 Fee    $137.00   $144.00`; `TR2  Transfer <30,000 Fee  $137.00  $144.00`;
  `MTGE    Mortgage    $137.00    $144.00`. Footnote 1: "electronic" = documents submitted via eRegistration.
- Value-based component: **none** — the fees are flat per instrument; the only tiering is the >/<$30,000 label
  on TR1/TR2 and both are $137. (The land *transfer tax*, not the registration fee, is value-based.)
- conf **high**. Matches the record exactly.

**Recommendation:** keep $137 / $137, `high`.

---

## 5. Market figures

### 5a. WinnipegREALTORS (Winnipeg Regional Real Estate Board)
- **August 2026 release exists** (released 2026-09-03):
  https://www.winnipegregionalrealestatenews.com/market-statistics/market-releases/article/628/august-sees-the-highest-year-to-date-residential-detached-and-condominium-average-prices-on-record
  Quotes: residential detached average price **$439,216**, "down 3% from last year"; condominium average price
  **$283,715**, "increased 2% from August 2025". YTD: detached $468,679 (+3%), condo $288,834 (+3%).
- July 2026 release (2026-08-06; the record's current basis):
  https://www.winnipegregionalrealestatenews.com/market-statistics/market-releases/article/626/residential-detached-homes-and-condominiums-set-new-july-average-price-records
  "$454,264 increase 2% from last year"; "$290,522 increased 2% from July 2025." Record matches to the dollar.
- Metric is an **average**, not a benchmark or median (unchanged caveat). Note the volatility: detached average
  swung $454k (July) → $439k (August, −3% YoY), so the single-month YoY sign flipped; the record's `yoy: 0.02`
  from July is now stale in sign for detached. Condo +2% both months.
- conf: **high** for each figure as a fact about the release; YoY stays `medium` (whole percents, averages).

**Recommendation:** re-point to the August 2026 release: `bench.house` 439,216, `bench.condo` 283,715, asOf
2026-08; `yoy`: detached −3% and condo +2% disagree, so either keep a single `yoy` from the YTD figures
(+3% both, YTD Aug) and say so in the note, or use a blend — dataset choice for the maintainer; do not silently
keep +2%. The note "Winnipeg is one of the two markets in this dataset that is rising" needs re-checking.

### 5b. CMHC average rent
- Publisher: CMHC Housing Market Information Portal, Primary Rental Market → Average Rent ($), by zone, Winnipeg,
  **October 2025** (fetched via curl:
  https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableCategory?categoryLevel1=Primary+Rental+Market&categoryLevel2=Average+Rent+%28%24%29&geographyId=2680&geographyType=MetropolitanMajorArea).
  Whole-Winnipeg row: `Winnipeg  914 a | 1,232 a | 1,570 a | 1,849 a | Total 1,404 a` — Studio / 1BR / **2BR $1,570
  (reliability a, excellent)** / 3BR+ / Total.
- No newer dollar level exists (CMHC surveys once a year in October; the page's newest period is October 2025).
- Caution: aggregator WealthNorth quotes "~$1,300" for a Winnipeg purpose-built 2BR; that is **wrong** against
  CMHC's own table and should not be used.
- conf **high**. Record is correct.

**Recommendation:** keep $1,570, Oct 2025, `high` (existing note already correct).

---

## 6. `fees.setup` = $3,000 — derivation

What is published for a homebuyer moving into an existing Winnipeg house:

| Component | Published amount | Source | Conf |
|-----------|-----------------:|--------|------|
| Manitoba Hydro electricity account opening / connection | **none found**; "Only new **commercial** customers are eligible for a security deposit"; Jan 1 2026 rate schedule lists no residential connection charge | https://www.hydro.mb.ca/support/help/0019-security-deposits/ ; https://www.hydro.mb.ca/docs/billing/electricity-rate-schedule.pdf | high (absence) |
| Manitoba Hydro / Centra natural gas account opening | **none found**; guarantee deposit discretionary ("shall not normally exceed … three months of maximum consumption"); reconnect fee if service was shut off: **$70 + GST = $73.50** (business hours) | Centra Gas Schedule of Sales and Transportation of Rates, Nov 1, 2025 (PUB Order 138/25), https://www.hydro.mb.ca/docs/billing/schedule-of-sales-and-transportation-services-and-rates-v0826.pdf, XI. "Reconnect Fees" | high |
| Centra furnace safety check (optional) | **$50** | same document, "Furnace Safety Check: … will be $50" | high |
| City of Winnipeg water/sewer/waste account | **no set-up fee found**; owner must submit a meter reading on move-in (a reading not taken makes the new owner liable for prior water use); the rates page is JS-only and could not be read — **not confirmed as $0** | https://myutility.winnipeg.ca ; search snippets only | medium (absence) |
| Internet install (Bell MTS standard fee) | **$150** standard installation fee; self-install and often pro install free | Bell "one-time fee" page as reported by search (Bell pages themselves did not fetch); Rogers/Shaw amount not found | medium |

Sum of published one-time charges a buyer could plausibly meet: $73.50 (gas reconnect) + $50 (safety check) +
$150 (internet install) = **$273.50**. Rounded: **$275**, or **$300** as a round disclosed default with a
small allowance for an unpublished Winnipeg water/TV item. Grade: **assumption** — it is our chosen sum of
published tariffs applied to a contingent scenario (service shut off, professional internet install), not a
number any authority publishes. The central published finding is that opening a Hydro, gas or (unconfirmed) city
water account is **free**; the real-world range is roughly $0–$300.

**Is $3,000 a 5× transcription error?** The peers (Saskatoon $550, Calgary $600) are themselves defaults, so the
"5×" comparison is only a symptom. The stronger evidence is that no published Winnipeg utility charge or
deposit gets anywhere near $3,000: the derived ceiling is ~$300, which makes $3,000 a **10× overstatement** and
very plausibly a dropped-zero typo of $300. It should not stay at $3,000; every $3,000 of closing cost is also
modelled as cash the buyer must find on closing, so the error directly understates affordability.

**Recommendation:** change `fees.setup` from 3000 to **300** (assumption; note: "no Hydro/Centra residential
account-opening fee or new-residential deposit is published; sum of published contingent charges — Centra
reconnect $70+GST, furnace safety check $50, internet installation ≈$150 — is ≈$275, rounded up; the earlier
$3,000 is unsupported by any source"). Verify Winnipeg water account fee with the Utility Billing Centre before
`high`-izing the absence.

---

## 7. Every other figure in the record

### 7a. Closing-fee defaults (lawyer, titleIns, inspect, appraisal, moving)
No regulator or authority publishes a schedule; all remain `assumption`. Reference ranges only (search
synthesis of realtor/lawyer/mortgage blogs — Westoba, lawyerinfo.ca, andrewsthilaire.com, Winnipeg mortgage
broker guides; none fetched to the primary): lawyer **$800–$1,500** legal fees + $200–$500 disbursements
(record $1,800 is at the top of that combined range: defensible as fees+disbursements); title insurance
**$200–$500** (some sources $750 for purchaser+lender coverage; record $350 in range); home inspection
**$350–$600** (record $600 at the top); appraisal — no Winnipeg figure found (lender-arranged, often free or
$300–$500; record $400 plausible); moving **$1,500** — not sourced at all. All medium-quality at best, so
`assumption` stays.
Manitoba fact worth adding: **RST does not apply to title insurance** (Bulletin 061, see 7d), so a $350
premium carries no provincial sales tax.
**Recommendation:** keep all five at `assumption`; add to the note that the record's ranges were cross-checked
against Winnipeg-area secondary sources (lawyer $800–1,500 + $200–500 disbursements, inspection $350–600,
title $200–500). No value change.

### 7b. `fees.statusCert` = $100
The Condominium Act, C.C.S.M. c. C170 (https://web2.gov.mb.ca/laws/statutes/ccsm/c170.php): s.61(1): "Upon
request by a buyer of a unit in a condominium corporation or a unit owner, the corporation must certify, on the
form prescribed for this purpose, the following information …" — s.61 contains **no fee provision and no
cap**. The only fee language nearby is s.53(3): "A condominium corporation may charge reasonable fees for
providing documents or information under this section" (s.53 = the seller/buyer document package), and
s.132(1) ("a reasonable fee for labour and copying charges"). The Condominium Regulation, M.R. 164/2014, s.13
only prescribes the status-certificate **form** (Form 8) and contains no fee. There is therefore **no
statutory cap**; the fee is "reasonable" and set by each corporation. Market: "typically $100–$200"
(secondary, realestatecondos.ca via search; not fetched).
**Recommendation:** keep $100 `assumption`; add note "no statutory cap — Condominium Act s.61 sets none; s.53(3)
allows 'reasonable fees'; market $100–$200 (secondary)". Consider $150 midpoint only if the maintainer wants the
middle of the range; not required.

### 7c. `marginal` — Manitoba combined federal + provincial 2026
Source: EY, "Combined federal and provincial personal income tax rates — 2026, Manitoba", rates reflect
budget proposals and news releases to **2026-01-15** (fetched via curl:
https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf).
Table rows (upper limit → marginal rate): 15,780→0%; 16,452→10.80%; 47,000→24.80%; 58,523→26.75%;
100,000→33.25%; 117,045→37.90%; 181,440→43.40%; 200,000→46.69%; 258,482→47.55%; 400,000→51.25%; above
→50.40%. **All eleven record entries match exactly.** Notes 5/6 confirm the fall above $400,000 (Manitoba BPA
clawback $200,000–$400,000, ~0.85%). This is a **secondary (industry) source**, not a CRA/Manitoba primary;
the record grades it `high`. By the rubric a firm's published table is `medium` unless cross-checked to the
statute/CRA; the federal rates and thresholds and Manitoba's 10.8/12.75/17.4% bands were not re-fetched from
canada.ca / gov.mb.ca.
**Recommendation:** re-grade `marginal` to **medium** (EY secondary), or keep `high` only after cross-checking
CRA's 2026 federal bracket page and gov.mb.ca's 2026 provincial bracket page; no value change. Field is read by
nothing yet.

### 7d. RST on mortgage insurance premiums
**Confirmed on a gov.mb.ca primary document — upgrade to `high`.** Manitoba Finance, Taxation, **Bulletin No.
061 "The Retail Sales Tax Act — Insurance,"** issued July 15, 2012, **revised July 2020**
(https://www.gov.mb.ca/finance/taxation/pubs/bulletins/061.pdf, fetched): "The following highlighted insurance
contracts are exempt for all purchasers on new or renewal contracts that come into effect after June 30, 2020: …
Title insurance in connection with Manitoba property. • Mortgage insurance. • Insurance on land and buildings
located in Manitoba, including property damage insurance …". Same list in **Notice RST 20-04** (April 2020,
"Removal of RST from Residential and Business Property Insurance", https://www.gov.mb.ca/finance/taxation/pubs/bulletins/noticerst2004.pdf):
"Effective July 1, 2020 property insurance will be exempt from retail sales tax … Mortgage insurance."
(Bulletin No. 120 on the 2020 budget was checked and does not mention it — don't cite that one.)
**Recommendation:** re-grade `premiumTax` to **high**, `src`: Manitoba Finance Bulletin 061 (rev. July 2020) and
Notice RST 20-04; keep `null`. Drop the "not confirmed on a gov.mb.ca bulletin" caveat.

### 7e. Federal Home Buyers' Amount $1,400
CRA, "Line 31270 – Home buyers' amount" (https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html;
"Date modified: 2026-07-29"): "You can claim up to $10,000 for the purchase of a qualifying home" (page text is
worded for the 2025 return year). The credit is $10,000 × the lowest federal rate. EY's 2026 credit table shows
the federal basic personal credit as $2,076; $14,829 (base amount, EY note 5) × 14% = $2,076, which confirms a
**14%** lowest rate for 2026. `ca.ts` carries `hba: 1400`, and the record's Quebec cross-check ($1,400 × 0.835 =
$1,169) agrees. I did **not** re-fetch the 14% rate from a canada.ca page this pass, so the rate rests on EY
plus the Quebec cross-check; the $10,000 is `high` (CRA), the product `high` given both.
**Recommendation:** keep $1,400, `high`; re-source the `src` to the CRA line-31270 page for the $10,000 and
keep EY for the 14% rate.

---

## Could not verify

- A Winnipeg water/sewer **account-opening fee or deposit** (City MyUtility rates page is JS-only, legacy.winnipeg.ca
  returned 403). Believed $0; not confirmed.
- **Rogers/Shaw** and **Bell** installation fees from the providers' own pages (search-synthesis figure of $150
  only).
- The **Act/regulation** authorising HATC (pages and bulletin cite none) and whether a condo is a "single
  residential dwelling" for HATC.
- **Royal Assent date of Bill 53** on a gov.mb.ca page (bill page leaves "Assented to" blank; June 1, 2026 is
  MLT Aikins).
- Primary sources for lawyer, title insurance, inspection, appraisal and moving costs — none exist.
- Federal lowest rate (14%) and 2026 federal bracket table from a CRA page (EY only).
- Why DSFM does not levy on a Winnipeg residential bill (only its absence from the City's table is confirmed).

---

## Changes recommended

1. **`fees.setup` 3000 → 300** (assumption, with the component derivation above). Highest-impact fix.
2. **`bench.house` / `bench.condo`** → August 2026 release: **$439,216 / $283,715** (released 2026-09-03);
   revisit `yoy` (detached −3%, condo +2%; July's +2% is stale) and the "rising market" note.
3. **`premiumTax` re-grade medium → high**, cite Manitoba Finance Bulletin 061 (rev. July 2020) + Notice RST
   20-04 (mortgage insurance and title insurance both RST-exempt).
4. **`transfer.0.brackets` note**: replace "KNOWN EXPIRY / diarised end date" with the accurate description —
   Bill 53 adds a beneficial-interest tax from 2027-01-01, ordinary schedule unchanged.
5. **`propTax.assessmentRatio`**: add the cite Classification of Property and Portioned Values Regulation,
   M.R. 184/98.
6. **`propTax.publishedRate` note**: add HATC mechanics (credit = min($1,600, school tax); school portion = price
   × 0.45 × school mills), the frontage levy ($6.95/ft) and the eight-division id/effective-rate table; keep
   values (all confirmed `high`); note DSFM is not a levying line.
7. **`marginal`**: values confirmed exactly; re-grade to medium (EY secondary) unless CRA/gov.mb.ca cross-checked.
8. **`fees.statusCert`**: keep $100; add "no statutory cap (Condominium Act s.61 silent; s.53(3) 'reasonable
   fees')" and the $100–$200 market range.
9. **Keep unchanged:** `rent` $1,570 (CMHC Oct 2025 confirmed, reliability a), Land Titles $137/$137, LTT brackets,
   `taxTime` HBA $1,400, lawyer/titleIns/inspect/appraisal/moving (assumption).
