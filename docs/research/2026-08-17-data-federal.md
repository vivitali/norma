# Federal mortgage rules — primary-source verification

**Date of research:** 2026-08-17
**Target file:** `src/domain/federal.ts` (placeholders carried over from `design-reference/hbt-data.js`)
**Status:** COMPLETE. 26 figures confirmed, 2 corrected, 5 unverifiable/assumption-only.
Nothing under `src/` was modified — this document is the input to that change, not the change itself.

**Rules changed in 2024–2026 that the placeholders must reflect:** insured cap $1M → **$1.5M** and
30-yr amortization extended to all first-time buyers and all new-build purchasers (both 2024-12-15);
HBP withdrawal cap $35k → **$60k** (2024-04-16); HBP grace period temporarily 5 yrs for 2022–2025
withdrawals, back to 2 yrs from 2026-01-01; capital gains inclusion increase to 2/3 **cancelled**
(2025-03-21); First-Time Home Buyers' **GST Rebate** created (2025-03-20, law 2026-03-12); stress test
waived for straight switches at renewal (2024-11-21).

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| `cmhc.bands` — LTV ≤65% | 0.60% | **0.60%** ✅ | [CMHC premium info](https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership-programs/premium-information-for-homeowner-and-small-rental-loans) | page last published 2018-03-31, still current | high |
| `cmhc.bands` — LTV ≤75% | 1.70% | **1.70%** ✅ | same | same | high |
| `cmhc.bands` — LTV ≤80% | 2.40% | **2.40%** ✅ | same | same | high |
| `cmhc.bands` — LTV ≤85% | 2.80% | **2.80%** ✅ | same | same | high |
| `cmhc.bands` — LTV ≤90% | 3.10% | **3.10%** ✅ | same | same | high |
| `cmhc.bands` — LTV ≤95% | 4.00% | **4.00%** ✅ | same | same | high |
| `cmhc.longAmortSurcharge` | 0.20% | **0.20%** ✅ (per 5 yrs of amortization beyond 25) | same | same | high |
| `cmhc.insuredCap` | $1,500,000 | **$1,500,000** ✅ — raised from $1,000,000 effective **2024-12-15** | [CMT / Dept of Finance announcement](https://www.canadianmortgagetrends.com/2024/09/breaking-federal-government-raises-cmhc-insured-mortgage-cap-to-1-5-million/) | 2024-09-16, in force 2024-12-15 | high |
| `stressTest.floor` | 5.25% | **5.25%** ✅ | [OSFI — MQR for uninsured mortgages](https://www.osfi-bsif.gc.ca/en/supervision/financial-institutions/banks/minimum-qualifying-rate-uninsured-mortgages) | in force since 2021-06-01; reaffirmed Dec 2021/2022/2023 | high |
| `stressTest.buffer` | 2.00 pp | **+2.00 pp** ✅ (MQR = greater of 5.25% or contract + 2%) | same | same | high |
| `gds` | 39% | **39%** ✅ | [CMHC — Calculating GDS/TDS](https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds) | current | high |
| `tds` | 44% | **44%** ✅ | same | same | high |
| `heatAllowance` | $150/mo | **UNVERIFIED — no federal fixed figure** | [CMHC — Calculating GDS/TDS](https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds) | current | low |
| `maxAmortFtbInsured` | 30 yr | **30 yr** ✅ — all first-time buyers **and** all buyers of new builds, LTV > 80%, effective **2024-12-15** | [CMT / Dept of Finance](https://www.canadianmortgagetrends.com/2024/09/breaking-federal-government-raises-cmhc-insured-mortgage-cap-to-1-5-million/) | 2024-09-16, in force 2024-12-15 | high |
| `maxAmortOther` | 25 yr | **25 yr** ✅ for *insured* mortgages not meeting the FTB/new-build test. ⚠️ Does **not** apply to uninsured (20%+ down), where 30–35 yr is lender discretion. | same | same | medium |
| `fhsa.annual` | $8,000 | **$8,000** ✅ (not indexed; carry-forward of one prior year allows $16,000 in a single year) | [Scotiabank / CRA FHSA rules](https://www.scotiabank.com/ca/en/personal/advice-plus/features/posts.understanding-fhsa-contribution-limits.html) | 2026 | medium |
| `fhsa.lifetime` | $40,000 | **$40,000** ✅ | same | 2026 | medium |
| `hbp.max` | $60,000 | **$60,000** ✅ — raised from $35,000 for withdrawals after **2024-04-16** (Budget 2024) | [Advisor.ca / Budget 2024](https://www.advisor.ca/tax/tax-news/feds-boost-home-buyers-plan-withdrawal-limit-to-60000/) | 2024-04-16 | high |
| `hbp.repayYears` | 15 | **15** ✅ unchanged | same | 2024 | high |
| `hbp.graceYears` | 2 | **2** ✅ **for 2026 withdrawals.** ⚠️ Temporarily **5** for withdrawals made 2022-01-01 → 2025-12-31; reverts to 2 on 2026-01-01. Since the app models a purchase *today* (2026-08-17), 2 is correct — but a user with a 2022–2025 withdrawal has 5. | [Globe & Mail](https://www.theglobeandmail.com/investing/globe-advisor/advisor-news/article-time-running-out-for-first-time-homebuyers-to-access-extended-hbp/) | 2025 | high |
| `hbp.ruleDays` | 90 | **UNVERIFIED** — CRA's rule is that funds must be **in the RRSP for 90 days** before withdrawal to stay deductible. Value looks right but not confirmed against a CRA page in this pass. | [CRA — Withdraw funds under the HBP](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-home-buyers-plan/withdraw-funds-rrsp-s-under-home-buyers-plan.html) | — | medium |
| `rrspCap` | $33,810 | **$33,810** ✅ (2026 RRSP dollar limit) | [CRA — MP, DB, RRSP, DPSP, ALDA, TFSA limits](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html) | 2026 tax year | high |
| `capGainsInclusion` | 0.5 | **0.5** ✅ — the proposed rise to 2/3 (announced 2024-06-25, deferred 2025-01-31) was **cancelled 2025-03-21** and never enacted | [Wolters Kluwer](https://www.wolterskluwer.com/en-ca/expert-insights/changes-to-capital-gains-inclusion-rate-deferred-to-2026) · [Scotia Wealth](https://enrichedthinking.scotiawealthmanagement.com/2025/04/07/cancellation-of-the-proposed-capital-gains-inclusion-rate-increase/) | 2025-03-21 | high |
| `gstFthb.rate` | 5% | **5%** ✅ | [PwC Canada — GST relief for first-time home buyers](https://www.pwc.com/ca/en/services/tax/publications/tax-insights/gst-relief-first-time-home-buyers-2025.html) · [PBO costing](https://www.pbo-dpb.ca/en/publications/RP-2526-001-S--introducing-gst-rebates-first-time-home-buyers--remboursement-tps-acheteurs-une-premiere-habitation) | announced 2025-03-20; Bill C-4 Royal Assent 2026-03-12 | high |
| `gstFthb.fullTo` | $1,000,000 | **$1,000,000** ✅ (full rebate at or below) | same | same | high |
| `gstFthb.zeroAt` | $1,500,000 | **$1,500,000** ✅ (linear phase-out $1.0M → $1.5M, nil at/above) | same | same | high |
| `gstFthb.cap` | $50,000 | **$50,000** ✅ | same | same | high |
| `hba` (Home Buyers' Amount) | $1,500 | **$1,500** ✅ — 15% non-refundable credit on a $10,000 claim; doubled from $5,000 in Budget 2022 | [CRA — Line 31270 Home buyers' amount](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html) | current | medium |
| `rates.insured` | 3.94% | **3.94%** (best 5-yr fixed high-ratio, 2026-08-17). A second aggregator quotes 4.09% for the same day/segment — best-available rates vary by broker. | [WOWA — mortgage rates](https://wowa.ca/mortgage-rates) · [nesto](https://www.nesto.ca/mortgage-rates/fixed/5-year/) | 2026-08-17 | medium |
| `rates.uninsured` | 4.04% | ⚠️ **CORRECT TO ~4.39%** — best 5-yr fixed *uninsured* (20%+ down or >$1.5M) quoted at **4.39%** as of 2026-08-03. The placeholder's 10 bp spread understates the real insured/uninsured gap (~45 bp). | [WOWA — mortgage rates](https://wowa.ca/mortgage-rates) | 2026-08-03 | medium |
| `rates.variable` | 3.35% | **3.35%** ✅ (best 5-yr variable high-ratio, 2026-08-17 — prime 4.45% less 1.10%) | [nesto](https://www.nesto.ca/mortgage-rates/) | 2026-08-17 | medium |
| `rates.prime` | 4.45% | **4.45%** ✅ as of 2026-08-17 (BoC overnight 2.25%, held 2026-07-15, sixth consecutive hold; prime unchanged since Oct 2025) | [nesto — prime rate](https://www.nesto.ca/prime-rate-in-canada/) · [WOWA — BoC rate](https://wowa.ca/bank-of-canada-interest-rate) | 2026-08-17 | high |
| `contractRate` | 4.29% | **ASSUMPTION** — plausible default: sits between the best insured (3.94%) and best uninsured (4.39%) 5-yr fixed. ⚠️ The *average* 5-yr fixed conventional rate is **5.07%**, so 4.29% models a broker-shopped borrower, not a branch customer. | [WOWA — mortgage rates](https://wowa.ca/mortgage-rates) | 2026-08-17 | medium |
| `sellingCost` (assumption) | 5% | **ASSUMPTION — no authoritative source.** Rationale: typical Canadian resale cost = 3.5–5% realtor commission + ~1% legal/discharge/staging. 5% all-in is defensible but jurisdiction-dependent (QC brokerage ~4–5%, BC tiered 7%-on-first-$100k-then-2.5%). No regulator publishes a standard rate — commissions are negotiable by law (Competition Bureau). | — | — | low (assumption) |
| `maintenanceReserve` (assumption) | 1%/yr | **ASSUMPTION — no authoritative source.** The "1% of home value per year" rule of thumb is widely repeated by CMHC-adjacent consumer education but is not a published federal standard. Genworth/Sagen and most lenders use 1–3%. Reasonable conservative low end. | — | — | low (assumption) |
| `appreciation.inflation` (assumption) | 2.1% | **2.1%** ✅ — matches the **FP Canada / Institute of Financial Planning 2026 Projection Assumption Guidelines** inflation assumption exactly. This is *the* Canadian industry standard for long-term projections. | [FP Canada 2026 PAG (PDF)](https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf?sfvrsn=6e32eebb_1) · [Investment Executive](https://www.investmentexecutive.com/industry-news/fp-canada-institute-of-financial-planning-update-guidelines-on-expected-returns-add-shelter-projection/) | published 2026-04-16 | high |
| `appreciation.shelter` (assumption) | 3.1% | **3.1%** ✅ — matches the FP Canada 2026 PAG's **newly added shelter assumption** (inflation + 1.0 pp). Note this line item is new in the 2026 guidelines. | same | 2026-04-16 | high |
| `appreciation.flat` (assumption) | 0% | **ASSUMPTION by construction** — a deliberate "no appreciation" stress scenario, not a forecast. No source needed. | — | — | n/a (scenario) |
| `investReturn.cash` (assumption) | 2.4% | **ASSUMPTION, PAG-consistent** — FP Canada 2026 publishes fixed income at 3.2% and Canadian equity at 6.3%; short-term/cash sits below fixed income. 2.4% is plausible but the exact PAG short-term figure was **not confirmed** in this pass. | [FP Canada 2026 PAG](https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf?sfvrsn=6e32eebb_1) | 2026-04-16 | medium |
| `investReturn.balanced` (assumption) | 4.6% | **ASSUMPTION, PAG-consistent** — a ~50/50 blend of PAG fixed income (3.2%) and Canadian equity (6.3%) is 4.75% gross; 4.6% is that blend net of a small fee drag, which is what PAG requires. Defensible derivation, not a published number. | same | 2026-04-16 | medium |
| `investReturn.growth` (assumption) | 5.8% | **ASSUMPTION, PAG-consistent** — a ~80/20 equity/fixed blend of PAG figures is 5.68% gross; 5.8% is slightly above that. Defensible but on the optimistic side once fees are deducted. | same | 2026-04-16 | medium |
| `savingsReturn` (assumption) | 3.5% | ⚠️ **ASSUMPTION, likely TOO HIGH.** Exceeds FP Canada's 2026 fixed-income assumption (3.2%) and is well above achievable HISA yields with the BoC overnight rate at 2.25%. Suggest 2.5–3.0%. | [FP Canada 2026 PAG](https://www.fpcanada.ca/docs/professionalsitelibraries/standards/projection-assumption-guidelines.pdf?sfvrsn=6e32eebb_1) · [WOWA — BoC rate](https://wowa.ca/bank-of-canada-interest-rate) | 2026-04-16 / 2026-08-17 | medium |

## Discrepancies that change money materially

Ranked by dollar impact on a user's displayed affordability.

1. **`gstFthb` is modelled as if it applies to every purchase — it applies only to NEW construction.**
   *Biggest money error in the file.* The First-Time Home Buyers' GST Rebate (Bill C-4, Royal Assent
   2026-03-12) covers only newly built or substantially renovated homes, with a purchase agreement
   signed on or after **2025-03-20**. Resale homes — the large majority of Canadian transactions —
   get **nothing**. The rate/thresholds/cap in `federal.ts` are all individually correct, but nothing
   in the shape of `gstFthb` encodes the new-build gate. If the Closing Costs page applies this to a
   resale purchase it overstates the buyer's position by **up to $50,000**.
   Source: [PwC Canada](https://www.pwc.com/ca/en/services/tax/publications/tax-insights/gst-relief-first-time-home-buyers-2025.html)

2. **`rates.uninsured` (4.04%) is ~35 bp too low.** Best-available uninsured 5-yr fixed is quoted at
   **4.39%**, not 4.04%. The placeholder encodes a 10 bp insured/uninsured spread; the real spread is
   ~45 bp. On a $600k mortgage over 25 years that is roughly **$120/month** and ~$36k over the
   amortization. This intersects the open product question in issue [#3](https://github.com/vivitali/norma/issues/3)
   about the "now-unused insured/uninsured rate spread" — the spread is real and material, so the
   right resolution is to *use* it, not delete it.

3. **`maxAmortOther: 25` is right for insured mortgages and wrong for uninsured ones.** A borrower with
   20%+ down is not bound by the 25-year insured cap; 30-year (often 35-year) uninsured amortizations
   are routinely available. Capping every non-FTB borrower at 25 years understates their affordable
   price by roughly **8–10%**. The field name doesn't carry the insured/uninsured distinction, so this
   is a modelling gap, not just a wrong number.

4. **`hbp.graceYears: 2` is correct today but silently wrong for a large cohort.** Anyone who made an
   HBP withdrawal between 2022-01-01 and 2025-12-31 has a **5-year** grace period. That window closed
   only ~8 months ago, so many current buyers are in it. The value should be derived from the
   withdrawal date, not stored as a constant.

5. **`cmhc.bands` is missing the non-traditional-down-payment band.** CMHC charges **4.50%** (not 4.00%)
   at 90.01–95% LTV when the down payment is borrowed/non-traditional. On a $500k mortgage that is
   **$2,500** of extra premium the model never shows.

6. **`savingsReturn: 3.5%` is above FP Canada's own fixed-income assumption (3.2%)** and well above
   achievable HISA yields at a 2.25% overnight rate. It makes "save longer before buying" look better
   than it is — a directional bias in the Down Payment and Rent vs Buy pages.

## Unverifiable / needs a human

- **`heatAllowance: 150`** — there is **no federal fixed heating allowance**. CMHC's published guidance
  instructs the underwriter to use the borrower's *actual* heating costs where records are provided.
  The $150/month figure is a lender convention (commonly $100–$175, sometimes sized by square footage),
  not a rule. A human needs to decide whether norma states a convention, asks the user, or varies it by
  province — a heating figure that is right in Vancouver is badly wrong in Winnipeg.

- **`hbp.ruleDays: 90`** — the 90-day-in-plan requirement is real CRA doctrine, but the canada.ca page
  was not fetched successfully in this pass (canada.ca blocks WebFetch). Confirm directly against
  [CRA — Withdraw funds under the HBP](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-home-buyers-plan/withdraw-funds-rrsp-s-under-home-buyers-plan.html).

- **`sellingCost: 5%` and `maintenanceReserve: 1%`** — no regulator or industry body publishes a standard
  for either. Real-estate commissions are negotiable by law and vary materially by province and
  brokerage model. These must be labelled in the UI as user-adjustable assumptions, with the default
  disclosed, rather than presented as computed facts.

- **`investReturn.{cash,balanced,growth}`** — FP Canada's 2026 PAG publishes asset-class returns
  (fixed income 3.2%, Canadian equity 6.3%, inflation 2.1%), not portfolio labels. The three portfolio
  figures in `federal.ts` are blends someone constructed. A human should either (a) fetch the full PAG
  PDF and record the exact short-term/foreign-equity rows plus the mandated fee deduction, then rebuild
  the blends transparently, or (b) restate them as user-editable inputs. As stored they look like
  sourced numbers but are not.

- **`contractRate: 4.29%`** — this is a default, and which default is honest is a product decision. Best
  broker-shopped rates are ~3.94–4.39%; the *average* 5-year fixed conventional rate is **5.07%**.
  Defaulting to the broker rate flatters the affordability number for a user who will walk into a
  branch.

- **CMHC premium page vintage** — the premium schedule fetched from cmhc-schl.gc.ca carries a last
  publication date of 2018-03-31. The rates are believed current (they match every 2026 secondary
  source), but a human should confirm CMHC has not issued a superseding schedule, and should
  cross-check Sagen and Canada Guaranty, whose premium grids norma may also need.

- **Marginal tax tables (`marginal`)** — out of scope for this pass. Every bracket and combined rate in
  that object remains an unverified placeholder and needs its own per-jurisdiction verification against
  CRA and provincial finance sources.

