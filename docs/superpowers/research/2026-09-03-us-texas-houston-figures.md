# US federal / Texas / Houston (Harris County) figures — sourced dossier

Date compiled: 2026-09-03. Scope: items A (US federal), B (Texas), C (Houston / Harris County),
D (publisher URL notes), requested for the `norma` US-market seam (see
`docs/superpowers/specs/2026-08-29-us-market-design.md`). Every figure below is graded on the
`Provenance.conf` scale defined in `src/domain/types.ts` (`high / medium / low / assumption /
none`) — the scale this repo already uses for the Canadian dataset. **Nothing here has been
written into `src/domain`; this is research input only.**

Tax-year framing: 2026 figures used where a publisher has already released them (IRS inflation
adjustments, FHFA/FHA/CLL limits, Texas homestead law, Harris County/Houston/HISD/HCC 2025 tax
rates — Texas counties set a calendar-tax-year rate in the fall for that same year, so "2025 tax
year" is the newest adopted rate as of today). Where only a 2025-vintage IRS publication exists
(Pub. 936, Pub. 523), that is stated explicitly, because the values themselves are unchanged into
2026 but the *document* has not yet been reissued for tax year 2026.

## Summary table

| # | Item | Value | Conf | As of |
|---|------|-------|------|-------|
| A1 | Standard deduction 2026 | Single/MFS $16,100 · MFJ $32,200 · HoH $24,150 | high | 2025-10-09 (IR-2025-103) |
| A2 | 2026 federal brackets (single/MFJ) | 7 rates, 10–37%, see §A2 | high | 2025-10-09 |
| A3 | MID acquisition-debt cap | $750,000 ($375,000 MFS); permanence is OBBBA, not yet in a reissued Pub. 936 | high (cap) / medium (permanence claim) | Pub. 936 "for 2025 returns" |
| A4 | SALT cap 2026 | $40,400, phased down 30% of MAGI over $505,000 ($252,500 MFS) to a $10,000 floor | medium | Rev. Proc. 2025-32 (via secondary synthesis) |
| A5 | PMI/MIP deductibility 2026 | Restored by OBBBA §70108 effective 2026; **current irs.gov Pub. 936 (2025 edition) still says "has expired"** | medium | 2025-edition Pub. 936 read 2026-09-03; statute per secondary sources |
| A6 | §121 exclusion | $250,000 single / $500,000 MFJ; 24-of-last-60-months ownership + use test | high | Pub. 523, "for 2025 returns" |
| A7 | FHFA conforming loan limit 2026 | Baseline $832,750 (1-unit); ceiling $1,249,125 | high | FHFA news release 2025-11-25 |
| A8 | FHA program terms | 3.5% down at ≥580 FICO (10% at 500–579); upfront MIP 1.75%; annual MIP 0.50–0.55% (30-yr, ≤$726,200 base); Harris County FHA limit $541,287 (national floor) | high (national terms) / medium (Harris County figure) | ML 2025-23 (2025-12-11); ML 2023-05 (2023-02-22, still in force) |
| A9 | Conventional min down / PMI cancellation | 3% (HomeReady/Home Possible), 5% standard; HPA: request at 80% LTV, automatic termination at 78% LTV | high | multiple corroborating secondary sources |
| A10 | Typical PMI annual rate | ~0.3%–1.5% of loan balance/year, credit- and LTV-dependent | assumption | rate-card aggregation, 2026 |
| A11 | DTI guidelines | Conventional "soft" 28/36; Fannie Mae DU up to 45–50%; FHA 31/43 | medium | secondary synthesis of Fannie Mae Selling Guide / HUD 4000.1 |
| A12 | Freddie Mac PMMS | 30-yr fixed 6.66%, 15-yr fixed 5.98% | high | freddiemac.com/pmms, week of 2026-08-27 |
| A13 | FHFA HPI 10-yr / BLS CPI | HPI: 226.57 (Jun-2016) → 442.53 (Jun-2026), **+6.93%/yr compounded nominal**; CPI-U +3.4% (12-mo, to Jul-2026) | high | FHFA HPI Quarterly Report 2026Q2 (2026-08-25 appendix table); BLS CPI release 2026-08-12 |
| A14 | HUD/FHA first-time-buyer definition | No ownership interest in a principal residence in the preceding 3 years | medium | secondary synthesis of HUD program rules |
| A15 | IRA first-time-buyer $10,000 exception | Lifetime $10,000 penalty exception (10% early-withdrawal), 120-day use window, 2-year lookback definition | medium | secondary synthesis |
| B1 | No TX income tax / transfer tax / mortgage recording tax | Confirmed, constitutional | high (income tax) / medium (transfer/recording, not independently statute-checked) | — |
| B2 | Homestead exemption 2025 | School district $140,000 (was $100,000, Prop 13, Nov 2025, retroactive to TY2025); 10% appraisal cap unchanged; local-option exemptions up to 20% at each taxing unit's discretion | high ($140k, cap) / medium (which entities adopted 20%) | HCAD, Comptroller, Ballotpedia |
| B3 | TDI title insurance basic premium | Formula: (face − $100,000) × 0.00494 + $780 for $100,001–$1,000,000; $350,000 policy = **$2,015** | high | tdi.texas.gov/title/titlerates2026.html, effective 2026-03-01 |
| B4 | No state property tax; truth-in-taxation | Confirmed | high | comptroller.texas.gov |
| B5 | TX average homeowners premium | $3,506/yr (2025 preliminary); $3,291/yr (2024) | medium | TDI market overview page (statewide average, via secondary read) |
| B6 | TX/Harris closing-cost items | See §B6 — appraisal, survey, title split, recording fee, escrow fee, HOA transfer | mixed, mostly assumption/medium | see line items |
| C1 | HAR July 2026 report | Single-family median $340,000 (+0.6% YoY), average $440,816; existing-only median $345,000 | medium | HAR.com July 2026 release, read via secondary/search re-derivation of the primary release, not directly fetched | 
| C2 | HUD FMR FY2026, Houston HMFA | **Small Area FMR by ZIP**, not one metro figure; effective 2025-11-01; example ZIPs $1,120–$1,650 (1BR), $1,380–$1,960 (2BR) | high (structure & effective date) / high (example ZIP figures, primary PDF) | huduser.gov FY2026 FMR document, reproduced by City of Pasadena, TX |
| C3 | Harris/Houston/HISD/HCC 2025 rates | Combined nominal **2.120422 / $100** (≈2.12%); components below | high (each nominal rate) / low (effective-rate-after-exemption estimate) | hctax.net, houstonisd.org, hccs.edu, houstontx.gov, communityimpact.com |
| C4 | MUD taxes | Not modeled in Harris/Houston core-city calc; $0.25–$1.40+/$100 extra where present, statutory buyer disclosure required | medium | secondary synthesis, Tex. Water Code Ch. 49 |
| C5 | Houston electricity | ~$180–$212/month typical; ~$104 (Mar) to ~$219 (Aug) seasonal range | assumption | rate-comparison aggregators, 2026 |
| C6 | Houston condo/HOA fee | Houston-wide median ~$67/mo (all property types); condo-specific ~$200–$600/mo | assumption | Axios Houston / HAR.com blog / thecooldown.com |

---

## A. US federal

### A1. Standard deduction 2026
- Single / MFS: **$16,100**. MFJ: **$32,200**. HoH: **$24,150**.
- Publisher: IRS. Document: "IRS releases tax inflation adjustments for tax year 2026, including
  amendments from the One, Big, Beautiful Bill" (IR-2025-103), citing Revenue Procedure 2025-32.
- URL: https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
- asOf: 2025-10-09 (release date; governs tax year 2026 returns filed in 2027).
- conf: **high** — fetched directly, IRS's own page, table read verbatim.
- Caveat: several SEO aggregator pages (NerdWallet, Jackson Hewitt, ourtaxpartner.com) surfaced in
  search repeat these same three numbers, so there is no dispute here.

### A2. Federal ordinary income tax brackets 2026

Read directly off the same IRS page (IR-2025-103 / Rev. Proc. 2025-32):

| Rate | Single | Married filing jointly |
|---|---|---|
| 10% | up to $12,400 | up to $24,800 |
| 12% | over $12,400 | over $24,800 |
| 22% | over $50,400 | over $105,700 → **correction: over $50,400** (see note) |
| 24% | over $105,700 | over $211,400 |
| 32% | over $201,775 | over $403,550 |
| 35% | over $256,225 | over $512,450 |
| 37% | over $640,600 | over $768,700 |

Note: the WebFetch extraction returned the 22% row as "Over $50,400 / Over $100,800" — i.e. MFJ's
22% threshold is **$100,800**, not $105,700 (that figure is the *24%* single threshold and was
mis-transcribed into the table once in raw extraction; corrected here). The self-consistency check
that supports this correction: $50,400 × 2 = $100,800 exactly, matching the doubling pattern IRS
uses for the 10/12/22/24/32% brackets (MFJ = 2× single) before it stops doubling at 35%/37%. A
second, independently-searched source (Harter Secrest & Emery LLP client note) separately states
"the top of the 12 percent bracket now sits at $100,800" for MFJ and "the 37 percent rate starts
above $768,700" — both corroborate the corrected table.
- conf: **high** for the corrected table (primary IRS page + independent corroboration on two
  anchor figures); the raw single-fetch table had one internal transcription glitch, flagged above
  rather than silently fixed.
- Caveat: A different secondary aggregation (from a general web search, not fetched from irs.gov)
  returned single-filer thresholds ($11,925 / $48,475 / $103,350 / $197,300 / $250,525 / $626,350)
  that are actually the **2025** brackets, not 2026 — discard these; they were not used above.

### A3. Mortgage interest deduction acquisition-debt cap
- Current cap: **$750,000** ($375,000 MFS) for acquisition debt secured after 2017-12-15.
- Grandfathered debt (secured 1987-10-13 through 2017-12-15): **$1,000,000** ($500,000 MFS).
- Publisher: IRS. Document: Publication 936, *Home Mortgage Interest Deduction*, "For use in
  preparing **2025** Returns" (this is the current live edition on irs.gov as of 2026-09-03; the
  2026-tax-year edition has not yet been issued — IRS publishes each Pub. 936 edition after the
  tax year closes).
- URL: https://www.irs.gov/publications/p936
- asOf: as printed on the page, "for 2025 returns."
- conf: **high** for the $750,000/$1,000,000 figures themselves (unchanged by OBBBA — OBBBA made
  the *existing* $750,000 cap permanent rather than letting it expire back to $1,000,000 after
  2025, so the number the live IRS publication shows is already the number that carries into 2026).
- conf: **medium** for the "OBBBA made it permanent" characterization — this is not stated on the
  currently-published IRS page (which predates the change taking visible effect in an IRS
  publication) and rests on secondary tax-industry commentary (nationaltaxtools.com, LegalClarity)
  describing the statute. A later verification pass should re-check irs.gov once the 2026-year
  Pub. 936 is issued (normally around January of the following year).

### A4. SALT cap 2026 and phase-down
- Cap: **$40,400** for most filers ($20,200 MFS) for tax year 2026, per Revenue Procedure 2025-32.
- Phase-down: reduced by 30% of MAGI over **$505,000** ($252,500 MFS); floors at $10,000.
- Publisher: IRS (Rev. Proc. 2025-32), but **not independently fetched from irs.gov** — the direct
  fetch of the IRS newsroom release (used for A1/A2) did not mention SALT at all, and a direct
  fetch of the raw PDF at https://www.irs.gov/pub/irs-drop/rp-25-32.pdf was not attempted after the
  newsroom page came back silent on this item; the $40,400 / $505,000 figures come from a
  WebSearch synthesis citing q3adv.com and thearcalabs.com, both summarizing Rev. Proc. 2025-32.
- conf: **medium** — the underlying statute (One Big Beautiful Bill Act §70120, raising the SALT
  cap and applying a MAGI-based phase-down through 2029 before reverting to $10,000 in 2030) is
  well-corroborated across many independent tax-commentary sites with consistent numbers, but no
  page here was fetched directly off irs.gov showing this exact figure. **Recommend a follow-up
  direct fetch of rp-25-32.pdf before this figure ships at anything above `medium`.**

### A5. PMI / FHA MIP deductibility status for 2026
- **Restored** by the One Big Beautiful Bill Act, §70108 (Public Law 119-21, signed 2025-07-04),
  effective for tax year 2026, for contracts issued after 2006 (VA, FHA, Rural Housing Service,
  and private MI). Phases out as AGI exceeds $100,000 ($50,000 MFS), 10% per $1,000 of excess,
  gone entirely above $109,000 ($54,500 MFS).
- **Important finding, load-bearing for anyone citing this**: the IRS's own currently-live
  Publication 936 (2025 edition, fetched directly 2026-09-03) states in its opening section:
  *"Mortgage insurance premiums. The itemized deduction for mortgage insurance premiums has
  expired. You can no longer claim the deduction."* That sentence is accurate **for the 2025 tax
  year this edition covers** — the restoration applies starting tax year **2026**, and IRS has not
  yet issued a 2026-year edition of Pub. 936 that would reflect it. A norma copy claiming "PMI is
  deductible" sourced only to today's live IRS publication would be citing a document that says the
  opposite.
- Publisher/document for the restoration itself: secondary — USMI (US Mortgage Insurers, an
  industry trade group) press release and instead.com summary, both citing OBBBA §70108 directly.
- URLs: https://www.usmi.org/one-big-beautiful-bill-act-restores-mortgage-insurance-premium-tax-deduction-delivering-tax-relief-to-middle-class-homeowners/ ;
  https://www.irs.gov/publications/p936 (current/expired-language edition, fetched directly)
- asOf: statute effective 2026-01-01; live IRS Pub. 936 read 2026-09-03 still shows pre-OBBBA
  language.
- conf: **medium** for the restoration and its terms (industry-source corroboration, not an IRS
  primary document reflecting it yet); **high** for the fact that irs.gov currently still displays
  "has expired" language, since that was read directly.

### A6. §121 exclusion and the 2-of-5-year test
- $250,000 single / $500,000 MFJ gain exclusion on sale of a principal residence.
- Ownership test: owned the home ≥24 months of the 60 months before the sale.
- Use test: lived in it as principal residence ≥24 months of the same 60-month window (need not be
  contiguous).
- Publisher: IRS. Document: Publication 523, *Selling Your Home*, "For use in preparing **2025**
  Returns" (current live edition).
- URL: https://www.irs.gov/publications/p523
- asOf: as printed, "for 2025 returns."
- conf: **high** — fetched directly, exact quotes captured above. These dollar figures and the
  24-of-60-month test are long-standing (unindexed for inflation) and not affected by OBBBA.

### A7. FHFA conforming loan limit 2026
- Baseline (1-unit): **$832,750** (up $26,250 from $806,500 in 2025), a 3.26% increase tracking the
  FHFA HPI Q3-2024→Q3-2025 change.
- Ceiling (high-cost areas, 1-unit): **$1,249,125** (150% of baseline).
- Publisher: FHFA. Document: "FHFA Announces Conforming Loan Limit Values for 2026," news release.
- URL: https://www.fhfa.gov/news/news-release/fhfa-announces-conforming-loan-limit-values-for-2026
- asOf: announced 2025-11-25; effective for whole loans/MBS pools delivered on/after 2026-01-01.
- conf: **high** — fetched directly.
- Harris County: not named individually in this release (it covers baseline/ceiling only); Harris
  County's conforming loan limit is the **baseline** $832,750 per multiple secondary
  mortgage-industry sources (not independently checked against FHFA's county-level data file).

### A8. FHA terms and Harris County limit
- Minimum down payment: **3.5%** at FICO ≥580; **10%** at FICO 500–579.
  - conf: **high**. HUD Handbook 4000.1 baseline, corroborated across many industry sources with
    identical figures; not independently fetched from the HUD handbook PDF itself in this pass.
- Upfront MIP: **1.75%** of base loan amount.
  - conf: **medium** — consistent across multiple sources referencing HUD Mortgagee Letter
    2023-05 / Handbook 4000.1 Appendix 1.0, not independently fetched from a HUD PDF this pass.
- Annual MIP, 30-year term, base loan amount ≤$726,200 (the general FHA loan-size band):
  - LTV ≤90%: **0.50%**
  - LTV >90% and ≤95%: **0.50%**
  - LTV >95%: **0.55%**
  - Source described as HUD Mortgagee Letter 2023-05, effective for FHA case numbers assigned on
    or after 2023-03-20, and reported as still in force as of 2026.
  - conf: **medium** — read via a WebSearch synthesis that explicitly quoted the ML number and
    date; **not independently fetched from a HUD PDF**. This is a load-bearing figure for norma's
    US mortgage model and should get a direct-PDF verification pass (search for
    "2023-05hsgml.pdf" at hud.gov, mirroring how the loan-limit ML 2025-23 was verified above)
    before it ships at `high`.
- FHA loan limit, Harris County, TX (1-unit, 2026): **$541,287** — this equals the *national floor
  ("low-cost area")* limit confirmed directly in HUD Mortgagee Letter 2025-23 (fetched and read in
  full; text: *"The FHA national low-cost area mortgage limits... One-unit: $541,287"*). Multiple
  independent secondary sources (JVM Lending, LendingTree, homebuyer.com, thetruthaboutmortgage.com)
  all separately report Harris County sits at exactly this floor figure for 2026, consistent with
  Harris County not being one of the ~c.200 higher-cost counties nationally.
  - Publisher: HUD. Document: Mortgagee Letter 2025-23, "2026 Nationwide Forward Mortgage Loan
    Limits."
  - URL: https://www.hud.gov/sites/dfiles/hudclips/documents/2025-23hsgml.pdf
  - asOf: 2025-12-11; effective for case numbers assigned on/after 2026-01-01.
  - conf: **high** for the $541,287 *national floor* figure (read directly from the fetched PDF).
    conf: **medium** that this specific floor figure is what applies to Harris County specifically
    — the ML itself does not enumerate county-by-county limits (those live in a separate CHUMS
    data file / the entp.hud.gov lookup tool, at
    https://entp.hud.gov/idapp/html/hicostlook.cfm, which was reached but returns results only
    via an interactive query, not fetchable as static text). A follow-up agent should run that
    lookup tool (Harris County, TX, CY2026) directly, or download the CHUMS text file, for a
    `high`-confidence county-specific figure.

### A9. Conventional minimums and PMI cancellation (Homeowners Protection Act)
- Minimum down: **3%** for Fannie Mae HomeReady / Freddie Mac Home Possible (income-restricted,
  ≤80% AMI, first-time-buyer-oriented but not exclusively so); **5%** standard conventional
  fixed-rate minimum outside those programs (ARMs commonly require ≥5%).
- PMI cancellation under the Homeowners Protection Act of 1998: borrower may **request**
  cancellation at **80%** of original value (current on payments, sometimes subject to a
  new-appraisal condition for value-based requests); servicer must **automatically terminate**
  PMI at **78%** of original value amortization schedule, regardless of request, if current on
  payments.
- conf: **high** for the 78%/80% HPA mechanics (extremely well-established, consistent across the
  Federal Reserve's own HPA background document, CFPB compliance manual, and NCUA guide, several of
  which surfaced directly in search results, though none was individually fetched this pass).
- conf: **medium** for the 3%/5% conventional minimums (consistent secondary corroboration,
  not fetched from Fannie Mae's own Selling Guide).

### A10. Typical PMI annual rate (assumption figure)
- Widely cited range: **≈0.3%–1.5%** of the loan balance per year, driven mainly by credit score
  and LTV (e.g., 760 FICO / 10% down ≈0.3%/yr; 680 FICO / 3% down ≈1.1%/yr).
- No single authoritative "typical" figure exists — this is inherently a rate-card quantity set by
  private mortgage insurers (MGIC, Radian, Arch, Essent, National MI) and varies by exact
  risk-based pricing grid.
- conf: **assumption** (norma's own term for "nobody publishes one true number here; a range is
  disclosed"). Source: rate-comparison aggregators (amerisave.com, zeitro.com, altgage.com),
  2026-current, none of which is a primary MI rate card.
- **Recommend**: if norma wants a citable anchor, pull one insurer's public rate card (e.g. MGIC's
  published rate finder) directly rather than continue to rely on aggregator summaries.

### A11. DTI guidelines
- Conventional "soft" guideline: **28% front-end / 36% back-end** (classic guideline, not a hard
  cap for most conforming loans today).
- Fannie Mae (Desktop Underwriter, automated): up to **45%**, and up to **50%** with strong
  compensating factors (credit score, reserves, LTV).
- FHA: **31% front-end / 43% back-end** guideline per HUD Handbook 4000.1, with documented
  compensating factors allowing higher ratios in practice.
- conf: **medium** — consistent secondary synthesis; not independently fetched from Fannie Mae's
  Selling Guide PDF or HUD Handbook 4000.1 PDF this pass. The Fannie Mae Selling Guide URL surfaced
  in search (singlefamily.fanniemae.com/media/20786/display) was not fetched.

### A12. Freddie Mac PMMS — latest weekly value
- 30-year fixed: **6.66%**. 15-year fixed: **5.98%**.
- Publisher: Freddie Mac. Document: Primary Mortgage Market Survey® (PMMS®).
- URL: https://www.freddiemac.com/pmms
- asOf: week ending **2026-08-27** (the most recent survey available; next release would be the
  following Thursday, after the 2026-09-03 research date).
- conf: **high** — fetched directly.

### A13. FHFA HPI 10-year appreciation and BLS CPI
- **FHFA HPI**, Purchase-Only, Seasonally Adjusted, Nominal, U.S. national index (1991-01=100):
  - June 2016: **226.57**
  - June 2026: **442.53**
  - 10-year compounded annual growth rate: (442.53 / 226.57)^(1/10) − 1 = **+6.93%/year** (nominal,
    not inflation-adjusted).
  - This is a figure norma would derive itself from FHFA's own published monthly index table (the
    report does not print a "10-year annualized" figure directly) — directly analogous to how
    Toronto's `assessmentRatio` is a derived quotient of two published TRREB benchmarks. Unlike the
    Toronto ratio, no assumption is layered on top here (no "assume the reader's home tracked the
    index" step) — it is a pure compounding of two points the publisher itself tabulates, so it
    does not need the `low` discount Toronto's ratio carries for exactly that reason.
  - Also directly on the record, Y/Y: **+2.1%** (Q2-2025→Q2-2026) / **+2.3%** (12 months to
    June-2026, monthly series) / **+0.3%** QoQ (Q1-2026→Q2-2026).
  - Publisher: FHFA. Document: "FHFA House Price Index (HPI) Quarterly Report, 2026Q2 & June 2026,"
    press release dated 2026-08-25, Appendix "Monthly House Price Index for U.S. from January 1991
    - Present."
  - URL: https://www.fhfa.gov/document/d/hpi/fhfa-house-price-index-report-2026q2
  - asOf: 2026-08-25 (release date; index reflects data through June 2026).
  - conf: **high** — both endpoint index values and the Y/Y figures were read directly off the
    fetched PDF (pages of the appendix table).
- **BLS CPI-U**, 12-month change (not seasonally adjusted): **+3.4%**.
  - Publisher: BLS. Document: "Consumer Price Index Summary," news release USDL (July 2026 data).
  - URL: https://www.bls.gov/news.release/cpi.nr0.htm
  - asOf: release dated **2026-08-12**, covering data through **July 2026** (the August 2026 CPI
    release is scheduled for 2026-09-11, after today's research date, so July is the latest
    available figure).
  - conf: **high** — fetched directly.

### A14. HUD/FHA first-time-homebuyer definition
- No ownership interest in a principal residence during the 3-year period ending on the date of
  purchase of the new property. Applies to either spouse independently (if either qualifies, the
  household is treated as first-time). Additional categorical inclusions exist (single parents who
  only owned with a former spouse, displaced homemakers).
- conf: **medium** — consistent secondary synthesis (tchabitat.org, LegalClarity, fha.com); not
  independently fetched from a HUD program handbook or CFR citation.
- **Note for norma's cross-country table**: this is narrower than the CMHC/Canadian federal
  definition norma models today only in framing, not substance — both use a 3-year ownership
  lookback (contrast with §121's 2-of-5-year *test*, item A6, which is a different rule for a
  different purpose and should not be conflated with this one).

### A15. IRA first-time-homebuyer $10,000 exception (note only, per the brief)
- Up to **$10,000 lifetime** (each spouse, if married, for a combined $20,000) of otherwise-taxable
  IRA distribution is exempt from the 10% early-withdrawal penalty when used toward a first home,
  within **120 days** of receipt, for the account holder, spouse, child, grandchild, or parent.
  "First-time" here uses a narrower **2-year** lookback (not 3-year), specific to this exception —
  distinct from both A6 (§121, 2-of-5-*years*-i.e.-60-months) and A14 (HUD, 3-year). Penalty-free
  is **not** tax-free for a traditional IRA — ordinary income tax still applies to the distribution.
- conf: **medium** — consistent secondary synthesis across multiple sources (Greenbush Financial,
  Bradyware, U.S. News); not independently fetched from an IRS page (IRC §72(t)(2)(F) /
  Pub. 590-B would be the primary cites).

---

## B. Texas

### B1. No state income tax; no real-estate transfer tax; no mortgage recording tax
- Texas Constitution Art. VIII, §24 requires voter approval (via constitutional amendment) before
  any personal income tax could be enacted — voters have never approved one; a 1993 amendment and a
  2019 amendment (Prop 4) both reinforced the prohibition.
- Texas is one of a minority of states (commonly cited as 13) with no real-estate transfer tax; the
  prohibition on a transfer tax specifically is described by one secondary source as "enshrined in
  the state constitution since 2016" (Texas Constitution Art. VIII, §24-a, "Prohibition on Statewide
  Transaction Tax on Sale of Real Property," proposed by the legislature and passed as Prop 1 in
  the November 2015 election — the "2016" a searched source cites is likely a rounding to the
  amendment's effective/certification date).
- No state-level mortgage recording tax; Texas does have the county recording fee (see B6) but no
  ad valorem-style tax on the mortgage instrument itself, unlike states such as New York or Florida.
- conf: **high** for no state income tax (well-established constitutional fact, widely and
  consistently corroborated). conf: **medium** for the transfer-tax and recording-tax prohibitions
  — corroborated only through secondary summaries (realestateinaustin.com, noincometaxstates.com,
  legalclarity.org), not independently checked against the constitutional text itself
  (Art. VIII, §24-a) or Texas Tax Code / Local Government Code citations.
- **Recommend**: a follow-up pass should pull the actual constitutional text of Art. VIII §24-a
  from the Texas Legislature's own site (statutes.capitol.texas.gov) for a `high`-confidence cite.

### B2. Homestead exemption after the 2025 amendment
- General school-district homestead exemption: **$140,000** (up from $100,000), enacted via S.B. 4
  + S.J.R. 2 (89th Legislature, 2025), ratified by voters as **Proposition 13** on 2025-11-04,
  applying retroactively to tax years beginning **2025-01-01**.
- Age-65-or-older / disabled additional school exemption: **+$60,000** (via a companion measure,
  **Proposition 11**), for a combined $200,000 school-district exemption for that cohort — this
  is the "$150,000 for seniors" figure Lt. Gov. Patrick's statement references (a partial framing;
  the fuller $200,000 combined figure comes from a separate secondary summary, ownwell.com).
- 10% homestead appraisal cap: **unchanged**, Texas Tax Code §23.23 — appraised value for a
  qualified homestead cannot rise more than 10%/year plus the value of new improvements, resetting
  only on a qualifying-status change or ownership change.
- No 2025 change identified to non-homestead (e.g., commercial, investment-property) appraisal
  caps — Texas caps growth for *homestead* property only; nothing in this research surfaced a 2025
  change extending or altering that for non-homestead property.
- Publishers: Ballotpedia (Prop 11, Prop 13 summaries); Texas Lt. Governor's office (S.B. 4 / S.J.R.
  2 statement); Texas Tax Code §23.23 (via FindLaw mirror, not the official statutes site);
  Harris Central Appraisal District news release (dated 2025-04-11, **predates** the November 2025
  amendment and still shows the old $100,000 figure — useful only for the *mechanism* description,
  specifically the 20%-local-option-exemption rule, not for the current dollar amount).
- URLs: https://ballotpedia.org/Texas_Proposition_13,_Increase_Homestead_Property_Tax_Exemption_Amendment_(2025) ;
  https://www.ltgov.texas.gov/2025/02/13/lt-gov-dan-patrick-statement-on-the-unanimous-passage-of-senate-bill-4-and-senate-joint-resolution-2-increasing-the-homestead-exemption-to-140000-and-150000-for-seniors/ ;
  https://hcad.org/assets/uploads/pdf/25-05-Homeowner-Exemptions.pdf (fetched directly, pre-Prop-13 vintage)
- asOf: election certified 2025-11-04; retroactive to TY2025.
- conf: **high** for the $140,000 figure and the 10% cap being unchanged (Ballotpedia + Lt. Gov.
  statement + Tax Code text are consistent and specific). conf: **medium** for the $60,000
  senior/disabled add-on and the "no non-homestead change" finding (the latter is an absence
  finding — nothing surfaced saying it changed — rather than a confirmed statute read).

### B3. Title insurance — TDI Basic Premium Rate
- Formula for a policy face value **$100,001–$1,000,000**: `(face − $100,000) × 0.00494 + $780`.
- Worked example, **$350,000 owner's policy**: (350,000 − 100,000) × 0.00494 + 780 = 1,235 + 780 =
  **$2,015**.
- Rates were reduced **6.2%** by Commissioner's Order No. 2025-9697 (dated 2025-12-19),
  **effective 2026-03-01** — i.e., a $350,000 policy issued *before* 2026-03-01 would price under
  the prior (higher) schedule, not the $2,015 figure above.
- Publisher: Texas Department of Insurance. Document: "Texas Title Insurance Basic Premium Rates,"
  2026 rate page.
- URL: https://tdi.texas.gov/title/titlerates2026.html
- asOf: rates effective 2026-03-01.
- conf: **high** — fetched directly, formula and worked example both captured from the live page;
  the order number and 6.2% reduction datum are separately corroborated by search results citing
  Commissioner's Order No. 2025-9697 and a related TDI bulletin
  (tdi.texas.gov/orders/documents/20259697.pdf, not independently fetched).

### B4. No state property tax; truth-in-taxation
- Texas has no state-level property tax; the Comptroller's office administers oversight
  (appraisal-district reporting, truth-in-taxation compliance) but does not itself levy or set
  local rates. Local rates are the sum of whatever county, city, school district, and special
  districts (hospital, flood control, community college, port, MUD/utility districts, emergency
  services districts) overlap a given parcel.
- "Truth-in-taxation" is a Texas Constitutional/statutory framework (Tax Code Ch. 26) requiring
  public notice and, above certain growth thresholds, a public hearing or voter-approval election
  before a taxing unit's rate can rise beyond its "no-new-revenue" rate.
- Publisher: Texas Comptroller. URL: https://comptroller.texas.gov/taxes/property-tax/truth-in-taxation
  (page located via search, not independently fetched — the WebFetch on this exact URL was not
  attempted after the general search returned a consistent description).
- conf: **high** for "no state property tax" (foundational, uncontested, and consistent with every
  local-rate document fetched in section C below, all of which show only local-entity rates).
  conf: **medium** for the truth-in-taxation mechanics description (secondary synthesis; the
  Comptroller's own truth-in-taxation page was not independently fetched this pass, though its
  URL was captured for follow-up).

### B5. Homeowners insurance — Texas average annual premium
- Statewide average annual homeowners premium: **$3,506** (2025, preliminary) / **$3,291** (2024).
- Context figure (Governor's office framing, not TDI's own headline number): "up 79% in six years,"
  from "less than $2,000 in 2020" to "more than $3,500 in 2026." Rate increases by TDI's own
  rate-filing data: **+21.1%** (2023), **+18.7%** (2024), **+4.3%** (2025) — deceleration, not
  further acceleration, into 2025.
- Publisher: Texas Department of Insurance. Document: "Texas Homeowners Insurance Market Overview."
- URL: https://www.tdi.texas.gov/general/texas-homeowners-insurance-market-overview.html
- asOf: 2025 figures marked "preliminary" by TDI itself; page fetched 2026-09-03.
- conf: **medium** — the page *was* fetched directly via WebFetch, but the fetch tool's own
  extraction did not identify which specific policy form (e.g., HO-3 all-perils dwelling vs. a
  broader "all homeowners policies" blend) the $3,506/$3,291 figures represent, and stated so
  explicitly ("does not specify the particular coverage type"). Treat as a statewide blended
  average across TDI's "Texas Statistical Plan for Residential Risks," not a single-policy-form
  quote comparable to a rate-card premium.
- Caveat: this is explicitly a state-wide average, not a Houston/Harris-County-specific figure —
  Harris County (hurricane/flood/hail exposure) plausibly runs above the state average, but no
  Harris-County-specific TDI figure was located in this pass.

### B6. Buyer closing-cost items

| Item | Figure | conf | Source |
|---|---|---|---|
| Owner's title policy, who customarily pays | Seller, by Texas/Harris County custom (negotiable, not statutory) | medium | multiple secondary (JVM Lending, National Title Group, iBuyer) |
| Lender's title policy, who customarily pays | Buyer, at the "simultaneous issue" rate | medium | same as above |
| Title insurance premium itself | **Promulgated by TDI** — identical at every title company; see B3 for the rate formula/example | high (that it's promulgated) | tdi.texas.gov, multiple corroborating sources |
| Harris County Clerk recording fee (deed, real property record) | **$25 first page, $4 each additional page** | medium | deeds.com secondary aggregation of the Harris County Clerk fee schedule; a direct WebFetch of cclerk.hctx.net/RealProperty.aspx returned an internally inconsistent extraction ("$5.00" vs "$25.00") and should be re-verified against a clean PDF of the fee schedule before this ships above `medium` |
| Escrow / settlement fee | **~$250–$800** typical range (title-company administrative fee, not state-set) | assumption | multiple secondary sources (Herring Bank, Rocket Mortgage, Texas Country Title), all agreeing this is a *negotiable/shoppable* fee unlike the title premium itself |
| Appraisal fee | Not independently sourced this pass — norma's existing Canadian dataset assumption pattern (a flat modelling default, disclosed) is the recommended treatment; no Texas-specific appraisal-fee study was located | none found | — |
| Survey fee | Not independently sourced this pass; Texas conventionally requires a survey (or survey affidavit) for title insurance purposes, commonly cited informally as $400–$800, but no primary or reputable-secondary figure was captured with a citation strong enough to record here | none found | — |
| HOA transfer fee | Not independently sourced this pass — Texas HOAs commonly charge a resale-certificate fee (Texas Property Code §207.003 caps it, currently often cited informally near $375, but this was **not verified** against the statute text this pass) | none found | — |

**Recommend**: appraisal fee, survey fee, and HOA transfer/resale-certificate fee all need a
dedicated follow-up search-and-fetch pass; none should ship in norma at anything better than
`assumption`, and right now none has even an `assumption`-grade citation captured.

---

## C. Houston / Harris County

### C1. HAR latest monthly report
- Report month: **July 2026** (published 2026-08-12; the August 2026 report was not yet published
  as of the 2026-09-03 research date).
- Single-family: median **$340,000** (+0.6% YoY), average **$440,816** (+1.9% YoY), 8,340 homes
  sold (+1.6% YoY vs. 8,212 in July 2025).
- Existing single-family only (a HAR sub-cut): median **$345,000** (+1.5% YoY), 6,121 closings
  (+4.6% YoY).
- Inventory: 40,750 active listings, a record high, +3.4% YoY.
- Headline: "MORE LISTINGS, STEADY DEMAND ACROSS HOUSTON IN JULY — Home sales rise as inventory
  reaches a record high."
- A townhome/condo median **is** published separately by HAR (as a distinct market segment in its
  monthly release), but this pass did not capture its July 2026 value — see "Could not verify."
- Publisher: Houston Association of REALTORS® (HAR). The release content above was reconstructed
  via WebSearch synthesis (search snippets quoting the release directly, including its exact
  headline) rather than a clean WebFetch of the primary press-release page itself — attempts to
  fetch har.com's newsroom/mls listing pages directly returned HTTP 403/404 (see §D1).
- conf: **medium** — high confidence in the *numbers* (multiple search results independently
  quote the same $340,000/$440,816/8,340/+0.6%/+1.9% figures verbatim, including the exact
  headline phrase, strongly suggesting they are lifted from the same underlying HAR release rather
  than invented), but **not independently confirmed by a direct fetch of har.com's own page**, so
  capped at `medium` per this task's own rule about relying on secondary reads.
- **Recommend**: locate and fetch the exact HAR press-release URL for the July 2026 report before
  this ships at `high` (see §D1 for why the URL is not predictable).

### C2. HUD FMR FY2026, Houston HMFA
- **Structural finding, load-bearing**: the Houston-The Woodlands-Sugar Land, TX HUD Metro FMR Area
  (which contains Harris County) does **not** have one metro-wide FMR for FY2026. HUD requires
  **Small Area FMRs (SAFMR), by ZIP code**, for all Housing Choice Voucher programs operated
  anywhere in this HMFA. This means item C2 as posed ("0/1/2/3-bedroom... for the Houston-The
  Woodlands-Sugar Land HMFA") has no single correct answer — the correct FMR depends on which ZIP
  code the property is in. This is directly analogous to norma's own `RentBasis` design concern
  (§14 of the design spec: "a **new** RentBasis value, not `apartment2br` relabelled") and should
  be treated as a genuine structural fact to carry into the domain model, not smoothed over into a
  single number.
- Effective date: **2025-11-01** (FY2026 FMRs).
- Example ZIP-level Small Area FMRs, read directly off the primary document (Efficiency / 1BR / 2BR
  / 3BR / 4BR), a representative sample spanning the HMFA (not exhaustive — the full table has
  hundreds of ZIP rows):

  | ZIP | Eff. | 1BR | 2BR | 3BR | 4BR |
  |---|---|---|---|---|---|
  | 77034 | $1,120 | $1,160 | $1,380 | $1,860 | $2,320 |
  | 77501 | $1,250 | $1,290 | $1,540 | $2,070 | $2,580 |
  | 77505 | $1,430 | $1,480 | $1,760 | $2,370 | $2,950 |
  | 77506 | $1,020 | $1,060 | $1,260 | $1,700 | $2,110 |
  | 77507 | $1,590 | $1,650 | $1,960 | $2,640 | $3,290 |

  (This is a partial extract of one PDF page covering ZIPs in the Pasadena, TX area specifically —
  it is not a Houston-core-city or Harris-County-wide sample. It is included to demonstrate the
  ZIP-to-ZIP spread — roughly $1,260 to $1,960 for a 2BR across just these five ZIPs — not as a
  representative "Houston" figure.)
- Publisher: HUD (huduser.gov / HUD USER). Document: "FY 2026 Fair Market Rents, Effective November
  1, 2025," for the Houston-The Woodlands-Sugar Land, TX HUD Metro FMR Area. Read via a mirror
  copy hosted by the City of Pasadena, TX, which reproduces HUD's own document verbatim (title,
  effective date, and full explanatory text about SAFMR methodology all match HUD's standard FY2026
  FMR document boilerplate used nationwide).
- URL (as fetched): https://www.pasadenatx.gov/DocumentCenter/View/10575/FY-2026-FAIR-MARKET-RENTS-PDF
- URL (HUD's own dataset home, for a follow-up pass to pull the full ZIP table or the
  pre-SAFMR "basic" metro-wide FMR that still exists for programs not using SAFMR):
  https://www.huduser.gov/portal/datasets/fmr.html and
  https://www.huduser.gov/portal/datasets/fmr/smallarea/index.html
- asOf: 2025-11-01 (FY2026 effective date, printed on the document itself).
- conf: **high** for the structural finding (SAFMR-by-ZIP, effective date) and for the five example
  ZIP rows (both read directly off a verbatim reproduction of HUD's own document). conf:
  **assumption/none** for "a single Houston HMFA figure" — deliberately not produced, because one
  does not exist in the form requested; see "Could not verify."
- **Recommend**: for norma's `condo` pricing comparability need (per the spec's note, "for
  comparability it prices a condo, as `apartment2br` does"), a follow-up pass should either (a) pick
  a specific ZIP or a small set of ZIPs to represent "Houston core," or (b) locate whether HUD
  still separately publishes a non-SAFMR "metro area" FMR for this HMFA (used for programs that are
  not Housing Choice Voucher, e.g. some HOME/CDBG calculations) — the FY2026 FMR Schedule PDF at
  huduser.gov (attempted, returned empty content on fetch) is the likely place to find that.

### C3. Property tax rates 2025, Harris County / Houston / HISD / HCC

All rates are **adopted 2025 tax-year rates**, per $100 of taxable value, each read from the
taxing entity's own primary page or its own primary adoption notice PDF.

| Entity | Total rate | M&O | Debt service | Source |
|---|---|---|---|---|
| Harris County (general) | 0.380960 | — | — | hctax.net jurisdiction rate page + communityimpact.com corroboration |
| Harris County Flood Control District | 0.049660 | — | — | same |
| Harris County Hospital District (Harris Health) | 0.187610 | — | — | same |
| Port of Houston Authority | 0.005900 | — | — | same |
| **Harris County combined (4 entities)** | **0.624130** | | | sum, cross-checked against communityimpact.com's own stated "$0.6241" combined figure |
| City of Houston | 0.519190 | not broken out on the notice | not broken out | houstontx.gov, "Notice of Meeting to Vote on Tax Rate," fetched directly as a PDF |
| Houston ISD | 0.878300 | 0.711600 | 0.166700 | houstonisd.org tax-information page, fetched directly |
| Houston Community College | 0.098802 | 0.085585 | 0.013217 | hccs.edu truth-in-taxation page, fetched directly |
| **Combined nominal rate (City of Houston + HISD + HCC + 4 Harris County entities)** | **2.120422** (≈2.12%) | | | sum of the rows above |

Sources / asOf:
- Harris County four-entity figures: primary page https://www.hctax.net/property/jurisdictiontaxrates
  (fetched directly via WebFetch), cross-checked against Community Impact's 2025-11-05 article
  reporting the same four numbers and the same $0.6241 combined total, both dated to the
  county's **2025-11-04** adoption. conf: **high** (two independent reads converge exactly).
- City of Houston: fetched directly as a PDF, "NOTICE OF MEETING TO VOTE ON TAX RATE" —
  proposed/no-new-revenue/voter-approval rates all shown; the proposed rate ($0.519190) equals the
  no-new-revenue... no, equals the **prior year's** rate exactly ("no change" per the document's
  own comparison table), and the meeting to vote was 2025-10-15.
  URL: https://houstontx.gov/2025-tax-rate/TY25-Notice-Meeting-Vote-Tax-Rate.pdf. conf: **high**.
  Caveat: the document's own comparison table oddly labels its two columns "2025" and "2026" while
  the filename and body text both say this is the "TY25" (2025 tax year) notice for an October 2025
  vote — read this as the City of Houston's rate for tax year 2025 (adopted/voted 2025-10-15),
  which carried unchanged into what the table calls "2026" in that comparison column; do not read
  the table's "2026" column as a separately-adopted 2026 tax-year rate.
- Houston ISD: fetched directly, houstonisd.org. Adopted **2025-10-15**. conf: **high**.
- Houston Community College: fetched directly, hccs.edu. Certified **2025-09-16**. conf: **high**.

**Effective rate on the HAR median, after homestead exemption — illustrative, not authoritative:**

Using the HAR July 2026 single-family median of **$340,000** (§C1, medium confidence) and only the
exemptions independently confirmed above:
- HISD: general homestead exemption **$140,000** off the HISD-taxable value only (confirmed, §B2).
  Taxable: $200,000. Tax: $200,000 × 0.8783% = **$1,756.60**.
- Harris County (general fund only): a **20%** local-option homestead exemption, confirmed adopted
  ("commissioners court unanimously voted to approve the extension of a 20-percent homestead tax
  exemption, the maximum allowed by law, for all homeowners" — secondary source, not the county's
  own adoption order). Taxable: $272,000. Tax: $272,000 × 0.380960% = **$1,036.21**.
- Flood Control District, Hospital District, Port of Houston, City of Houston: **no confirmed
  local-option exemption** for these specific entities was located this pass (the City of Houston
  is explicitly reported as granting *no* homestead exemption by one secondary source). Taxed at
  full $340,000 nominal value: $168.84 + $637.87 + $20.06 + $1,765.25 = **$2,592.02**.
- HCC: a **15%** local-option exemption was found, but sourced to a 2019 HCC news article
  ("HCC increased the homestead exemption from 10% to 15% in 2019") — **not confirmed still current
  for 2025**. If still 15%: taxable $289,000, tax **$285.54**. If since revoked (full value): tax
  **$335.93**.
- **Illustrative total, using the 15% HCC figure**: $1,756.60 + $1,036.21 + $2,592.02 + $285.54 =
  **$5,670.37**, i.e. an **effective rate of ≈1.668%** on the $340,000 median (vs. the 2.120%
  nominal combined rate).
- conf: **low** for this effective-rate computation as a whole — it correctly applies only the two
  exemptions independently confirmed (HISD $140,000; Harris County 20%), and is explicitly flagged
  above everywhere a component is unconfirmed or possibly stale. It also does not model the 10%
  appraisal cap (§B2), which would matter for any home that has not just transacted at market
  value — the HAR median price and the county's *appraised* value for tax purposes are not
  necessarily the same number in year one after a purchase (Texas taxes new buyers on the purchase
  price / appraised market value in the year of sale, with the 10% cap only constraining *future*
  year-over-year growth from that base). This is presented as a worked illustration, not a figure
  fit to ship in norma without a dedicated verification pass per entity.

### C4. MUD taxes
- Municipal Utility Districts are common outside Houston's core incorporated area (and even inside
  it, by interlocal agreement) and levy their own additional tax, commonly cited informally in the
  **$0.25–$1.40+ per $100** range depending on the district's debt-service load, on top of every
  other overlapping entity's rate — i.e., additive to, not a substitute for, the C3 stack.
- Statutory buyer protection: **Texas Water Code Chapter 49** requires a written MUD notice before
  a purchase contract is signed; a buyer who does not receive it may terminate the contract and
  recover costs, including interest and attorney's fees.
- Recommendation for norma: **should be noted**, at minimum as a caveat on any Harris-County-wide
  property-tax figure that assumes only the C3 stack, because MUD-serviced new-construction
  subdivisions are a large and fast-growing share of Harris County's exurban housing stock, and a
  MUD rate can add meaningfully to the effective rate computed in §C3.
- conf: **medium** for the rate range and the Water Code citation (secondary synthesis, consistent
  across several sources, but the Water Code Ch. 49 text itself was not independently fetched).

### C5. Houston utilities (electricity)
- Typical monthly bill estimates cluster around **$180–$212/month** on an annual-average basis,
  with cited seasonal lows near **$104** (March) and highs near **$219–$300+** (August, driven by
  air-conditioning load) — figures diverge somewhat by source and by exactly which month's spot
  rate is being quoted (some sources dated to September 2026, one to March 2026).
- Typical usage cited: **~15,600 kWh/year** (~1,300 kWh/month) for the Houston/CenterPoint service
  area; average rate **≈15.33¢/kWh** as of 2026-09-01.
- Publisher: none authoritative — all figures are from rate-comparison/marketing aggregators
  (electricityplans.com, electricrates.org, jackery.com, suntria.com), not CenterPoint Energy's own
  published data or the PUCT (Public Utility Commission of Texas).
- conf: **assumption** — this is exactly norma's own `assumption` category (a modelling default,
  disclosed, because nobody publishes one canonical "typical Houston electric bill" figure; usage
  varies enormously by home size and thermostat behavior). **Recommend** citing a mid-range point
  (e.g. $180–$200/month) with the range disclosed, rather than a false-precision single figure.

### C6. Houston condo/HOA typical monthly fee
- Houston-wide **median across all property types**: **$67/month** (this blends the large share of
  single-family, non-HOA or low-HOA homes with the smaller condo share, so it understates a
  condo-specific figure).
- Condo-specific: **$200–$600/month** typical range cited across sources, with high-rise/amenity
  buildings reported as high as **$500–$2,500/month**.
- Publisher: none authoritative — Axios Houston (secondary journalism, citing Realtor.com/HOA-data
  aggregation methodology), HAR.com's own blog (a secondary blog post, not a data release), and
  thecooldown.com (secondary). No HOA-industry primary source (e.g. Community Associations
  Institute) or MLS-derived figure was located and fetched this pass.
- conf: **assumption** — matches norma's own category for "a legitimately-estimated" but
  unpublished figure (directly analogous to the $500 home-inspection-fee assumption pattern already
  in `federal.ts`'s provenance notes). **Recommend** a mid-range condo figure (e.g. $300–$400/month)
  disclosed as a range, consistent with how norma's Canadian condo-fee inclusion is handled.

---

## D. Publisher notes

### D1. Is the HAR monthly press release stable at a URL?
**No.** HAR's newsroom uses a query-string `pid=` parameter
(`https://www.har.com/content/department/newsroom?pid=<number>`), and each monthly release gets a
new, non-obviously-sequential `pid` — search results turned up `pid=2226` ("houston housing market
blooms with stability in march"), `pid=2212` ("houston housing market delivers a strong, more
balanced..."), and a generic newsroom index at `pid=640`. There is no fixed URL that always points
to "this month's release" — it must be located fresh each time, either via HAR's own newsroom index
page (which itself returned HTTP 403 to a direct WebFetch this pass — it may be
bot-protected/JS-rendered) or via web search for the specific month's headline. The general
monthly-data landing page `https://www.har.com/content/department/mls` also returned HTTP 403 on a
direct WebFetch. **Recommend**: any automation that needs "this month's HAR figure" should treat
HAR as requiring a live search each run, not a hardcoded URL, and should budget for the possibility
that har.com blocks non-browser fetches (a headless-browser or the `claude-in-chrome` tool may be
needed for a reliable direct read, rather than WebFetch).

### D2. HUD FMR query URL pattern for a given FY and area
Two usable patterns were found, both keyed by fiscal year in the path:
- **Static per-FY dataset root**: `https://www.huduser.gov/portal/datasets/fmr/fmr<YYYY>/` — e.g.
  `fmr2026` — hosts the FY-specific schedule and documentation files (the "FY2026_FMR_Schedule.pdf"
  lives here, though it returned empty content on a direct WebFetch this pass — likely a
  large/complex PDF the fetch tool couldn't parse as text; a `curl`+`Read` approach, as used
  successfully elsewhere in this research for other stubborn PDFs, would likely work better).
- **Interactive summary query**: `https://www.huduser.gov/portal/datasets/fmr/fmrs/FY<YYYY>_code/2026summary.odn?year=<YYYY>&fmrtype=Final&inputname=<AREA_CODE>&selection_type=hmfa&data=<YYYY>`
  — this is the pattern HUD's own site uses internally (inferred from a search-result URL fragment
  for the FY2024 **Income Limits** documentation system, which uses the identical
  `inputname=METRO26420M26420*Houston-The+Woodlands-Sugar+Land%2C+TX+HUD+Metro+FMR+Area` area-code
  convention). Both direct-fetch attempts against this pattern's FMR-specific variant returned
  **empty content** rather than an error — consistent with the page being JS-rendered/dynamic
  rather than a static document, which a plain WebFetch cannot execute.
- **What reliably worked this pass**: locating a specific jurisdiction's FY-year FMR document via
  web search for a phrase like `"FY 2026 FAIR MARKET RENTS" [county/city name]`, which frequently
  surfaces a **verbatim mirror** of HUD's own document hosted by a local housing authority or city
  government (as happened here with the City of Pasadena, TX PDF used for §C2) — these mirrors
  reliably fetch and parse as PDFs where huduser.gov's own dynamic query tool does not.
- **Recommend**: for a repeatable norma data-refresh process, prefer the **Small Area FMR Excel
  download** pattern instead of the dynamic query tool —
  `https://www.huduser.gov/portal/datasets/fmr/smallarea/index.html` links to
  `FY<YYYY>_FMR_50_county.xlsx`-style static files that a script could parse directly, avoiding
  both the JS-rendering problem and the "which local mirror exists this year" uncertainty.

---

## Could not verify

- **A single Houston HMFA-wide FY2026 FMR (0/1/2/3BR)** — does not exist in the form requested; the
  HMFA uses Small Area (ZIP-level) FMRs exclusively for FY2026 Housing Choice Voucher purposes (see
  §C2). A norma implementation needs a product decision on which ZIP(s) to use as "Houston," not a
  missing data point.
- **SALT cap 2026 ($40,400) and its phase-down, directly off irs.gov** — only reached via secondary
  synthesis of Revenue Procedure 2025-32; the raw PDF at
  https://www.irs.gov/pub/irs-drop/rp-25-32.pdf was located but not fetched this pass.
- **FHA upfront MIP (1.75%) and annual MIP LTV bands, directly off a HUD PDF** — reached only via a
  WebSearch synthesis that named HUD Mortgagee Letter 2023-05 and quoted specific figures, but the
  ML PDF itself (at a URL pattern like hud.gov/.../2023-05hsgml.pdf) was not independently fetched,
  unlike ML 2025-23 (the loan-limits letter), which **was** fetched directly and confirmed.
- **Harris County's FHA loan limit, from HUD's own county-level data file or lookup tool** — only
  confirmed indirectly, as equal to the *national floor* figure that ML 2025-23 does state directly;
  the entp.hud.gov interactive lookup tool and the CHUMS downloadable county-limit text file were
  both located but not queried/downloaded this pass.
- **HAR's July 2026 press release, from har.com directly** — har.com returned HTTP 403 on every
  direct WebFetch attempt this pass; all HAR figures here rest on WebSearch snippets that quote the
  release, not a page fetch of the release itself.
- **A HAR-published condo/townhome median for July 2026** — HAR is known to publish this as a
  separate cut (per general knowledge of HAR's report structure), but the July 2026 value was not
  located in the search/fetch results captured this pass.
- **Texas Constitution Art. VIII §24-a (transfer-tax prohibition) and the Local Government Code /
  Tax Code cites for "no mortgage recording tax"** — described only via secondary summaries, not
  read from the Texas Legislature's own statutes site.
- **Appraisal fee, survey fee, and HOA/resale-certificate transfer fee for Texas/Harris County
  closings** — no citable figure (even at `assumption` grade) was captured this pass; see §B6.
- **Whether Flood Control District, Hospital District, Port of Houston, or HCC currently apply any
  local-option homestead exemption for tax year 2025** — Harris County (general fund) and HISD are
  confirmed; the other entities are either confirmed to have none (City of Houston) or unconfirmed
  (Flood Control, Hospital District, Port) or stale-sourced (HCC's 15%, from a 2019 article). This
  directly limits confidence in the §C3 "effective rate" computation.
- **A Harris-County- or Houston-specific homeowners-insurance premium** — only a statewide TDI
  average was found (§B5); Harris County's coastal/flood/hail exposure plausibly diverges from the
  state average, but no county-specific TDI figure was located.
- **Direct confirmation of the FY2026 metro-wide (non-SAFMR) "basic" FMR**, which HUD sometimes
  still publishes alongside SAFMRs for programs that don't use small-area rents — not located this
  pass; see the §D2 recommendation for where to look next.

---

## Summary for the calling agent

Of the ~35 discrete figures/items requested, roughly:
- **High confidence, fetched directly from the primary publisher**: standard deduction, 2026
  brackets, §121 exclusion terms, MID cap dollar figures, FHFA conforming loan limit, FHFA HPI
  (both the raw index values and the derived 10-yr CAGR), BLS CPI, Freddie Mac PMMS, HUD FHA
  national loan-limit floor (ML 2025-23), TDI title-insurance formula/example, Texas homestead
  $140,000 figure and 10% cap, City of Houston / HISD / HCC / Harris County (4-entity) 2025 tax
  rates, HUD FY2026 FMR's SAFMR-by-ZIP structural finding and its example figures.
- **Medium confidence** (consistent secondary corroboration, not independently fetched from the
  named primary source, or a primary source fetched but with an internal caveat like Pub. 936's
  stale MIP language): SALT cap and phase-down, PMI/MIP restoration terms, FHA upfront/annual MIP
  percentages, Harris-County-specific FHA limit, DTI guideline ratios, conventional 3%/5% minimums,
  HAR's July 2026 sale-price figures, TX average homeowners premium, Harris County Clerk recording
  fee, MUD tax range.
- **Assumption-grade** (norma's own "disclosed default, nobody publishes one true number"):
  typical PMI annual rate, Houston electricity typical bill, Houston condo/HOA typical fee.
- **Could not verify at all** (listed above): a single Houston-wide FMR, HCC/Flood-Control/
  Hospital-District/Port homestead-exemption practice, appraisal/survey/HOA-transfer closing-cost
  figures, and a few primary-document cross-checks flagged as follow-up work (SALT Rev. Proc. PDF,
  HUD ML 2023-05 PDF, entp.hud.gov county lookup, HAR's own press-release page, Texas constitutional
  text for the transfer-tax prohibition).

Nothing in this dossier was written into `src/domain`. The next implementation step (per the design
spec's "Implementation order," step 4, "Houston (Harris County), with provenance on every figure")
should treat every `medium`/`assumption`/unresolved item above as a blocker for shipping that
specific figure at anything better than the confidence recorded here — exactly the discipline
`CLAUDE.md`'s "A figure may leave the app only if..." rule already enforces for the Canadian data.
