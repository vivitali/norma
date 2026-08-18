# Territories home-buying cost data verification — YT / NT / NU

**Date:** 2026-08-17
**Scope:** `src/domain/jurisdictions/yt.ts`, `nt.ts`, `nu.ts`
**Status:** COMPLETE for this pass. `WebSearch` budget ran out before benchmark prices and fees
could be attempted — those rows are honestly marked UNVERIFIED, not guessed.
**Nothing under `src/` was modified.** This document is findings only.

> **Load-bearing caveat, all three territories:** each `Jurisdiction` record is
> territory-wide (`city: null`, `cityData: false`) but every realistic figure in it —
> property tax rate, benchmark prices, fees, moving — is a **single-city** reality:
> Whitehorse for YT, Yellowknife for NT, Iqaluit for NU. Roughly 75% of Yukoners live in
> Whitehorse, ~45% of NWT residents in Yellowknife, ~20% of Nunavummiut in Iqaluit. For
> Nunavut in particular the territory-wide record is the *least* representative: 24 of 25
> communities are fly-in, and most Nunavut housing is public/staff housing, not owner-
> occupied freehold. Applying these numbers to Dawson, Inuvik, or Pond Inlet is wrong.

---

## Yukon (`yt.ts`)

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| `li_titleReg` (transfer/title registration) | flat `$650` | **WRONG — not flat.** `$29.25 + $0.25 per $1,000 of value above $25,000` | https://yukon.ca/en/housing-and-property/land-and-property/find-out-about-land-titles-fees | Yukon.ca, current page (Land Titles Tariff of Fees Regulation) | medium (search snippet from yukon.ca; needs confirmation of assurance-fund fee on top) |
| — is it flat or value-scaled? | modelled flat | **value-scaled** (`kind: "perValue"`, base 29.25, per 0.25, unit 1000, threshold $25,000) | same as above | 2026 | medium |
| `li_mortReg` (mortgage registration) | flat `$100` | **WRONG — not flat.** `$42 + $0.25 per $1,000 of amount secured above $50,000` | same as above | 2026 | medium |
| `propTax` (Whitehorse residential) | `0.0078` | **WRONG (too low) → `0.01123` (2025)`, `0.01097` (2026)** — Whitehorse levies residential property tax at 1.123% of assessed value for 2025; 2026 residential mill rate 1.097. | https://yukon-news.com/2025/04/27/property-taxes-in-whitehorse-explained/ ; https://www.whitehorsestar.com/News/council-oks-new-property-mill-rates ; https://www.whitehorse.ca/living-in-whitehorse/my-property/tax-utilities/ | 2025-04 / 2026 rate bylaw | medium (local press reporting the tax levy bylaw; city page is the primary but was not machine-readable) |
| `premiumTax` (PST on CMHC premium) | `null` | **CONFIRMED `null` is correct.** Yukon has no PST, so no tax on CMHC premiums. | https://www.nesto.ca/calculators/land-transfer-tax/yukon/ | 2026 | medium-high |
| `rebates` (first-time-buyer transfer rebate) | `kind: "none"` | **UNVERIFIED — no published source found** | — | — | **none** |
| `taxTime` federal HBA | `$1,500` | **UNVERIFIED — no published source found** | — | — | **none** |
| `bench.house` | `620000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `bench.condo` | `480000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `bench.newbuild` | `690000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.lawyer` | `1800` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.titleIns` | `350` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.inspect` | `700` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.appraisal` | `500` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.statusCert` (condo docs) | `150` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.moving` | `3200` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.setup` (utility setup) | `750` | **UNVERIFIED — no published source found** | — | — | **none** |
| `pro` (lawyer vs notary) | `"lawyer"` | **UNVERIFIED — no published source found** | — | — | **none** |
| `orgs.transfer` | "Yukon Land Titles Office, tariff of fees" | **UNVERIFIED — no published source found** | — | — | **none** |
| `orgs.rebate` | "Yukon Department of Finance" | **UNVERIFIED — no published source found** | — | — | **none** |
| `orgs.market` | "Yukon Bureau of Statistics" | **UNVERIFIED — no published source found** | — | — | **none** |

---

## Northwest Territories (`nt.ts`)

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| `li_titleReg` per-$1,000 rate | `$1.50 / $1,000` on price | **WRONG → `$2.00` per $1,000** of value or part thereof, where land value ≤ $1,000,000. Above $1M: `$2,000 + $1.50` per $1,000 of excess. | https://www.justice.gov.nt.ca/en/files/land-titles/Notices%20and%20Practice%20Directions/2025%20User%20Guide%20-%20Land%20Titles%20Office%20Fee%20Schedule.pdf (item 1) | Updated 2025-09-01 | **high** (primary — GNWT Justice fee schedule PDF, read directly) |
| `li_titleReg` base / minimum | base `$0`, min `$100` | **CONFIRMED** base $0, prescribed minimum **$100** | same PDF, item 1 | 2025-09-01 | **high** |
| `li_mortReg` per-$1,000 rate | `$1.00 / $1,000` on loan | **WRONG → `$1.50` per $1,000** or part thereof of the amount secured | same PDF, item 2 | 2025-09-01 | **high** |
| `li_mortReg` base / minimum | base `$0`, min `$80` | **CONFIRMED** base $0, prescribed minimum **$80** | same PDF, item 2 | 2025-09-01 | **high** |
| — note on `on: "loan"` | modelled on loan amount | **CONFIRMED correct**, with a caveat: if the amount secured exceeds the land value, the fee is calculated on the *land value* instead (s.156(4)), provided an affidavit of value is attached. Engine does not model this cap. | same PDF, item 2 note | 2025-09-01 | **high** |
| — NWT has **no land transfer tax** | not modelled (correct) | **CONFIRMED** — NWT levies only Land Titles registration fees, no ad-valorem LTT | same PDF (no LTT line item) | 2025-09-01 | **high** |
| `propTax` (Yellowknife residential) | `0.0112` | **≈ `0.00986`** (municipal residential mill rate 9.86 per $1,000). ⚠️ **Big caveat:** NWT property is assessed on a *base-year* general assessment well below current market value, so an effective rate applied to a market price is NOT comparable. Do not swap the number in without deciding which base the engine multiplies. | https://millrate.ca/northwest-territories-property-tax ; https://www.yellowknife.ca/en/living-here/resources/Property_Taxes_and_Assessment/2025-PROPERTY-TAX-GUIDE.pdf | 2025 tax year | medium (aggregator + city tax guide; mill rate itself is well attested, the assessment-base mismatch is the real problem) |
| `premiumTax` (tax on CMHC premium) | `null` | **CONFIRMED `null` is correct.** No territory levies PST/retail sales tax, so none taxes CMHC mortgage-insurance premiums. (Only ON, QC, SK do.) | https://www.ratehub.ca/land-transfer-tax ; https://www.nesto.ca/calculators/land-transfer-tax/yukon/ | 2026 | medium-high |
| `rebates` (first-time-buyer rebate) | `kind: "none"` | **CONFIRMED — no territorial first-time-buyer rebate or exemption on land-titles registration fees.** | https://www.ratehub.ca/land-transfer-tax ; https://www.nesto.ca/calculators/land-transfer-tax/ | 2026 | medium (consistent across all mortgage-industry sources; no territorial government page advertises one) |
| `taxTime` federal HBA | `$1,500` | **CONFIRMED** — federal Home Buyers' Amount is a 15% non-refundable credit on $10,000 = **$1,500** max, applies in all territories. | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html | 2026 | medium (federal figure, stable since 2022) |
| `bench.house` | `470000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `bench.condo` | `380000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `bench.newbuild` | `560000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.lawyer` | `1900` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.titleIns` | `350` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.inspect` | `750` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.appraisal` | `550` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.statusCert` (condo docs) | `150` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.moving` | `4200` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.setup` (utility setup) | `800` | **UNVERIFIED — no published source found** | — | — | **none** |
| `pro` | `"lawyer"` | **UNVERIFIED — no published source found** | — | — | **none** |
| `orgs.*` | NWT Land Titles / Finance / Bureau of Statistics | **UNVERIFIED — no published source found** | — | — | **none** |

---

## Nunavut (`nu.ts`)

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| `li_titleReg` per-$1,000 rate | `$1.50 / $1,000` on price | **CONFIRMED `$1.50` per $1,000** where value < $1,000,000. Above $1M: `$1,500 + $1.00` per $1,000 of excess (engine does not model this tier — immaterial at territorial price levels). Nunavut has **no land transfer tax**, only these registration fees. | https://www.nunavutlegislation.ca/en/consolidated-law/land-titles-tariff-fees-regulations-consolidation ; https://www.ratehub.ca/land-transfer-tax-nunavut ; https://www.nesto.ca/calculators/land-transfer-tax/nunavut/ | consolidated regs | medium (multiple independent sources agree on the $1.50 rate) |
| `li_titleReg` base / minimum | base `$0`, min `$100` | **DISPUTED — sources conflict: `$60` vs `$100`.** Most calculator sources say minimum **$60**; RE/MAX says $100. Unresolved. Immaterial in practice (binds only below ~$40–67k price). | same as above; https://blog.remax.ca/what-is-land-transfer-tax/ | — | **low — needs a human to read the actual regulation** |
| `li_mortReg` per-$1,000 rate | `$1.00 / $1,000` on loan | **CONFIRMED `$1.00` per $1,000** of principal secured | https://www.nunavutlegislation.ca/en/consolidated-law/land-titles-tariff-fees-regulations-consolidation ; corroborated https://www.ratehub.ca/land-transfer-tax-nunavut | Consolidated regs (Nunavut inherited the pre-1999 NWT tariff; NOT updated in step with the 2025 NWT revision) | medium (search snippet, two independent sources agree) |
| `li_mortReg` base / minimum | base `$0`, min `$80` | **min is WRONG → `$40`** | same as above | as above | medium |
| `propTax` (Iqaluit residential) | `0.009` | **UNVERIFIED — no rate found.** Structural finding: the Government of Nunavut administers property tax only for the *general taxation area, which excludes the City of Iqaluit*; Iqaluit sets its own mill rates and publishes them nowhere machine-readable. Iqaluit uses **five** classes — residential "7/8" (single-family / individually-owned condo) vs "9/10" (2+ dwelling units) — so a single `propTax` scalar cannot represent it faithfully. 2026 residential mill rates were held flat vs 2025 (+3% residential increase applied in 2025). | https://www.gov.nu.ca/en/taxation-and-insurance/property-tax ; https://nunatsiaq.com/stories/article/iqaluit-hikes-taxes-10-for-businesses-3-for-homeowners/ ; https://www.cbc.ca/news/canada/north/iqaluit-property-taxes-1.5438181 | 2025–2026 | **UNVERIFIED — needs a human to phone Iqaluit Finance (867-979-5610)** |
| `premiumTax` (tax on CMHC premium) | `null` | **CONFIRMED `null` is correct.** No territory levies PST/retail sales tax, so none taxes CMHC mortgage-insurance premiums. (Only ON, QC, SK do.) | https://www.ratehub.ca/land-transfer-tax ; https://www.nesto.ca/calculators/land-transfer-tax/yukon/ | 2026 | medium-high |
| `rebates` (first-time-buyer rebate) | `kind: "none"` | **CONFIRMED — no territorial first-time-buyer rebate or exemption on land-titles registration fees.** | https://www.ratehub.ca/land-transfer-tax ; https://www.nesto.ca/calculators/land-transfer-tax/ | 2026 | medium (consistent across all mortgage-industry sources; no territorial government page advertises one) |
| `taxTime` federal HBA | `$1,500` | **CONFIRMED** — federal Home Buyers' Amount is a 15% non-refundable credit on $10,000 = **$1,500** max, applies in all territories. | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html | 2026 | medium (federal figure, stable since 2022) |
| `bench.house` | `520000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `bench.condo` | `430000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `bench.newbuild` | `640000` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.lawyer` | `2100` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.titleIns` | `350` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.inspect` | `900` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.appraisal` | `650` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.statusCert` (condo docs) | `150` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.moving` | `6500` | **UNVERIFIED — no published source found** | — | — | **none** |
| `fees.setup` (utility setup) | `900` | **UNVERIFIED — no published source found** | — | — | **none** |
| `pro` | `"lawyer"` | **UNVERIFIED — no published source found** | — | — | **none** |
| `orgs.*` | Nunavut Land Titles / Finance / Bureau of Statistics | **UNVERIFIED — no published source found** | — | — | **none** |

---

## Discrepancies that change money materially

Ordered by dollar impact.

1. **Yukon title + mortgage registration are overstated by roughly 15×.** The placeholders model
   flat `$650` + `$100` = **$750**. The actual Yukon tariff is `$29.25 + $0.25 per $1,000 above
   $25,000` for a transfer and `$42 + $0.25 per $1,000 above $50,000` for a mortgage. On a
   $620,000 house with a $500,000 mortgage that is about **$29.25 + $148.75 = $178** plus
   **$42 + $112.50 = $155** ≈ **$333** — versus $750 modelled. Norma currently **over**states
   Yukon closing costs by ~$420. It is also the wrong *shape*: `kind: "fixed"` must become
   `kind: "perValue"` with a base and a threshold. **The engine's `perValue` variant has no
   "threshold below which the per-unit charge does not apply" concept** — check `src/domain/types.ts`
   before assuming this is a data-only fix. Note also an **assurance fund fee** is charged on top in
   Yukon and is not modelled at all; its amount was not established.

2. **NWT title registration is understated by 25%.** `$1.50` → **`$2.00` per $1,000** as of the
   2025-09-01 schedule. On a $470,000 house: $705 → **$940**, a **+$235** error.

3. **NWT mortgage registration is understated by 50%.** `$1.00` → **`$1.50` per $1,000**. On a
   $376,000 loan: $376 → **$564**, a **+$188** error. Combined, NWT closing costs are ~**$423 low**.
   ⚠️ Several third-party calculators (Ratehub, nesto) still publish the **old $1.50 / $1.00 rates**
   — they have not caught the September 2025 revision. Do not "correct" back to them.

4. **Whitehorse property tax is understated by ~30%, permanently.** `0.0078` → **`0.01123`** (2025)
   / **`0.01097`** (2026). On a $620,000 home that is ~$4,836 modelled versus ~**$6,963** actual —
   about **$177/month** understated in the carrying-cost and comfort-ceiling calculations. This is a
   recurring error, so it distorts the affordability ceiling far more than any one-time closing fee.

5. **Yellowknife property tax looks overstated (`0.0112` → mill rate 9.86 ⇒ `0.00986`) but is
   probably fine or even low.** NWT assesses on a base-year general assessment materially below
   market value. Norma multiplies `propTax` by a *market price*, so the mill rate cannot be dropped
   in directly. **Resolve the assessment-base question before touching this number** — a naive swap
   would understate NWT carrying costs.

6. **Nunavut mortgage-registration minimum is wrong (`$80` → `$40`)** but immaterial: it binds only
   below a $40,000 mortgage. The `$1.50` / `$1.00` per-$1,000 rates are correct for Nunavut — note
   that Nunavut kept the pre-1999 inherited NWT tariff while NWT itself revised in 2025, so the two
   territories genuinely differ now and must not be modelled as twins (they currently are).

7. **Unmodelled cap, NWT only:** if the mortgage exceeds the land value, the registration fee is
   computed on the land value (s.156(4)) given an affidavit. Only bites on unusual transactions.

## Unverifiable / needs a human

**Every territory-wide record models a single city.** `city: null, cityData: false` is doing a lot of
quiet work here. Whitehorse ≈ 75% of Yukon's population, Yellowknife ≈ 45% of NWT's, Iqaluit ≈ 20%
of Nunavut's. Nunavut is the severe case: 24 of 25 communities are fly-in with no road link, most
housing is public or employer staff housing rather than owner-occupied freehold, and there is
effectively no resale market in most of them. A Nunavut "average home price" is close to a category
error. **Recommend the UI say "Iqaluit" / "Yellowknife" / "Whitehorse", not "Nunavut" / "NWT" /
"Yukon".**

Not established, in rough priority order:

- **Iqaluit residential mill rate.** Not published online in any form found. The GN explicitly
  excludes Iqaluit from the territorial taxation area, and the City publishes only news coverage of
  percentage *changes*, never the rate. Also Iqaluit runs five tax classes including two distinct
  residential ones — a single scalar is a modelling compromise regardless. Contact: Iqaluit Finance,
  867-979-5610 / Accountsreceivable@iqaluit.ca.
- **All nine `bench` values (house / condo / newbuild × 3 territories).** CREA's MLS® HPI does not
  cover the territories. The NWT Bureau of Statistics site has a Housing section but publishes
  *housing conditions*, not prices. Yukon Bureau of Statistics blocks automated access. These nine
  numbers are currently pure invention and there is no obvious free public series to replace them
  with. Likely sources for a human: CMHC Housing Market Information Portal (Yellowknife and
  Whitehorse CMA/CA data), Yukon Bureau of Statistics quarterly *Yukon Residential Property Sales*
  bulletin, and — for Nunavut — probably nothing at all.
- **All 21 `fees` values.** No source found for any of them in any territory. In particular:
  - **`fees.moving` ($3,200 / $4,200 / $6,500) has no citation whatsoever and is very likely far too
    low.** Northern moving is barge- or air-freight-dependent: Iqaluit and most Nunavut communities
    have no road access at all and receive household goods by annual sealift, which is booked months
    ahead and priced per cubic metre. A realistic Iqaluit household move is plausibly a multiple of
    $6,500, and it is *seasonal* in a way the model cannot express. Flag: this is the single most
    confidently-wrong-in-spirit number in all three files.
  - **`fees.titleIns` is `$350` in all three** — identical to the southern provinces, which is
    suspicious. Title insurance availability and pricing in the territories was not verified.
  - **`fees.statusCert` is `$150` in all three.** Note NWT's tariff charges **$100 + $10 per unit**
    just to *register* a condominium plan; the buyer-side status/estoppel certificate cost is a
    different thing and was not found. Condominium stock in NU and NT is very thin.
- **Yukon assurance fund fee** — the Yukon Land Titles page references one alongside registration
  fees; the amount and formula were not obtained (yukon.ca returns 403 to automated fetch). This is
  a real closing-cost line item Norma omits entirely.
- **Nunavut minimum title-registration fee: `$60` or `$100`?** Secondary sources conflict. Needs
  someone to read the *Land Titles Tariff of Fees Regulations* consolidation text directly at
  https://www.nunavutlegislation.ca/en/consolidated-law/land-titles-tariff-fees-regulations-consolidation
- **`pro: "lawyer"` and all `orgs` strings** were not independently verified for any territory
  (they are plausible — all three are Torrens land-titles jurisdictions with no notary conveyancing
  tradition — but plausible is not verified).

### Method note

`WebSearch` budget was exhausted partway through this pass, before benchmark prices and fees could
be attempted. `yukon.ca`, `millrate.ca`, and the Yukon Bureau of Statistics all return **HTTP 403**
to `WebFetch`. The one clean primary source obtained was the GNWT Land Titles fee schedule PDF,
which was fetched as a binary and read directly — that is why NWT is the only territory here with
high-confidence tariff data.
