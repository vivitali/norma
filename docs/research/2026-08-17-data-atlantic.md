# Atlantic Canada home-buying cost data — verification

Date of research: 2026-08-17. Scope: `src/domain/jurisdictions/halifax.ts`, `nb.ts`, `nl.ts`, `pe.ts`.

Status legend for **Verified value**: a figure = confirmed/corrected; `UNVERIFIED` = could not confirm
against a primary source; `PENDING` = not yet researched.

Confidence: **high** = primary-source page fetched and read; **medium** = authoritative-domain search
snippet only, page not fetched; **low** = secondary/industry source only.

---

## HALIFAX / NOVA SCOTIA (`halifax.ts`)

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| Municipal deed transfer tax rate (`transfer[0].rate`) | 0.015 (1.5%) | **0.015 (1.5%) — CONFIRMED.** HRM DTT is 1.5% of sale price, the statutory maximum. Council has *explored* raising it (staff report requested 2026) but no increase has been enacted as of 2026-08-17. | https://www.cbc.ca/news/canada/nova-scotia/halifax-deed-transfer-tax-major-projects-1.7632686 · https://pub-halifax.escribemeetings.com/filestream.ashx?DocumentId=3101 | 2026 | medium (search snippet + HRM council doc; halifax.ca 403s to WebFetch) |
| NS Provincial Deed Transfer Tax — non-resident purchasers | not modelled | **10% — FINDING, not modelled.** Provincial DTT of 10% on non-resident buyers of residential property with ≤3 dwelling units, applied to the *greater of* purchase price or assessed value, pro-rated by the non-resident ownership interest. Rose from 5% → 10% effective 2025-04-01. Administrative amendments 2026-08-07 (proof-of-residency window 6 mo → 1 yr; refund window 1 yr → 2 yr; willed-property exemption) — **rate unchanged at 10%**. Stacks on top of the 1.5% HRM municipal DTT. | https://www.novascotia.ca/non-resident-provincial-deed-transfer-tax · https://news.novascotia.ca/en/2026/08/07/changes-non-resident-deed-transfer-tax · https://notices.novascotia.ca/files/ftb-taxation/ftb-tn-non-resident-deed-transfer-tax-increase-budget-2025-2025-04-04.pdf | 2025-04-04 / 2026-08-07 | high |
| Property tax rate (`propTax`) | 0.01105 | **≈0.01098 — effectively CONFIRMED (0.6% low).** FY2026-27 HRM urban residential municipal rate = $0.798 per $100 of assessment (up from $0.770); mandatory provincial rates on the same bill = $0.300 per $100 ($0.010 property valuation + $0.290 education). Total 1.098 per $100 = **0.01098**. Halifax Water charges are billed separately and are *not* part of this rate. Suburban/rural general rates are lower ($0.654 base vs $0.687 urban base), so a rural HRM buyer pays less. | https://www.cbc.ca/news/canada/nova-scotia/halifax-property-tax-bills-rising-9-5-this-year-9.7149182 · https://www.halifax.ca/home-property/property-taxes/tax-rates · https://www.halifax.ca/sites/default/files/documents/city-hall/budget-finances/2026-27-budget-and-business-plan_web_final_0.pdf | FY2026-27 | medium (search snippets; halifax.ca 403s to WebFetch) |
| First-time-buyer deed transfer rebate (`rebates`) | `none` | **`none` — CONFIRMED.** Nova Scotia has **no** first-time-buyer *deed transfer tax* rebate. The similarly-named NS "First-Time Home Buyers Rebate Program" is a rebate of the provincial portion of HST on **newly built** homes, up to **$3,000** — a different tax and only for new construction. Not currently modelled. | https://www.novascotia.ca/programs-and-services/first-time-home-buyers-rebate-program · https://beta.novascotia.ca/sites/default/files/documents/1-1192/first-time-home-buyers-rebate-program-overview-en.pdf | 2026 | medium |
| Professional (`pro`) | lawyer | **lawyer — CONFIRMED** (NS conveyancing is lawyer-only; no notary alternative). | https://www.novascotia.ca/non-resident-provincial-deed-transfer-tax | 2026 | medium |
| Benchmark house (`bench.house`) | 585 000 | **UNVERIFIED** — see "Benchmarks and fees" note below. | — | — | none |
| Benchmark condo (`bench.condo`) | 460 000 | **UNVERIFIED** | — | — | none |
| Benchmark new build (`bench.newbuild`) | 640 000 | **UNVERIFIED** — CREA MLS® HPI has no "new build" series at all; this figure cannot come from the cited org. | https://stats.crea.ca/en-CA/ | 2026-06 | none |
| Benchmark rent (`rent`) | 2 050 /mo | **UNVERIFIED** | — | — | none |
| YoY price growth (`yoy`) | 0.034 | **UNVERIFIED** | — | — | none |
| Lawyer fee | 1 700 | **UNVERIFIED** — see "Benchmarks and fees" note. | — | — | none |
| Title insurance | 350 | **UNVERIFIED** | — | — | none |
| Home inspection | 600 | **UNVERIFIED** | — | — | none |
| Appraisal | 400 | **UNVERIFIED** | — | — | none |
| Condo status certificate | 100 | **UNVERIFIED** | — | — | none |
| Moving | 1 400 | **UNVERIFIED** | — | — | none |
| Utility setup | 600 | **UNVERIFIED** | — | — | none |
| Orgs — transfer authority | HRM deed transfer tax by-law | **Correct attribution.** HRM By-law D-300 (Deed Transfer Tax). **Incomplete**: does not name the *provincial* non-resident DTT, which is a separate NS Dept. of Finance levy. | https://www.halifax.ca/home-property/property-taxes | 2026 | medium |
| Orgs — rebate authority | NS Dept. of Finance | **Correct** as the authority — but there is no deed transfer rebate for it to administer (see rebate row). | https://www.novascotia.ca/programs-and-services/first-time-home-buyers-rebate-program | 2026 | medium |
| Orgs — market | CREA MLS® HPI | **Correct authority, but the figures are not sourced from it** (see benchmark rows). | https://stats.crea.ca/en-CA/ | 2026-06 | medium |

---

## NEW BRUNSWICK (`nb.ts`)

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| Real Property Transfer Tax rate (`transfer[0].rate`) | 0.01 (1%) | **0.01 (1%) — CONFIRMED.** Rate doubled from 0.5% → 1% effective 2016-04-01 and is unchanged in 2026. | https://www2.snb.ca/content/snb/en/services/services_renderer.201294.Real_Property_Transfer_Tax.html · https://www.ratehub.ca/land-transfer-tax-new-brunswick | 2026 | medium |
| RPTT tax base (greater of consideration / assessed value) | modelled on price only | **Statute uses the greater of consideration or assessed value — model uses price only.** Minor: for arm's-length resales price normally exceeds assessment, so the model matches. It under-states tax on below-assessment or non-arm's-length transfers. | https://www2.snb.ca/content/snb/en/services/services_renderer.201294.Real_Property_Transfer_Tax.html | 2026 | medium |
| Property tax rate (`propTax`) | 0.0145 | **≈0.0136–0.0159 depending on municipality — plausible but NOT a province-wide figure.** Owner-occupied principal residences are **exempt from the provincial rate** and pay the municipal rate only. Municipal rates found: Moncton **$1,361.40 per $100,000 = 0.013614**; Fredericton **≈0.0147**; Saint John **≈0.0159**. The placeholder 0.0145 sits inside that band, near Fredericton. Outside a municipality (rural/LSD) the provincial rate of **$0.4115 per $100** applies instead. | https://www.cbc.ca/news/canada/new-brunswick/moncton-residential-property-tax-rates-nb-1.7561179 · https://www2.gnb.ca/content/gnb/en/departments/finance/taxes/real_property.html · https://millrate.ca/new-brunswick-property-tax | 2026 | medium |
| First-time-buyer rebate (`rebates`) | `none` | **`none` — CONFIRMED.** New Brunswick has no first-time-buyer Real Property Transfer Tax rebate or exemption. | https://www2.snb.ca/content/snb/en/services/services_renderer.201294.Real_Property_Transfer_Tax.html · https://wealthnorth.ca/mortgages/first-time-home-buyer-new-brunswick/ | 2026 | medium |
| Professional (`pro`) | lawyer | **lawyer — CONFIRMED** (NB conveyancing is lawyer-handled; the lawyer remits the RPTT on registration). | https://www.triolaw.ca/blog-post/how-land-transfer-tax-works-in-new-brunswick | 2026 | low |
| Benchmark house / condo / new build | 365 000 / 285 000 / 420 000 | **UNVERIFIED (all three)** — see "Benchmarks and fees" note below. | — | — | none |
| Fees — lawyer / title ins. / inspect / appraisal / status cert / moving / setup | 1 500 / 325 / 500 / 350 / 100 / 1 200 / 550 | **UNVERIFIED (all seven)** — see "Benchmarks and fees" note below. | — | — | none |
| Orgs — transfer authority | Service NB, RPTT Act | **Correct.** Service New Brunswick administers the *Real Property Transfer Tax Act* and collects on registration. | https://www2.snb.ca/content/snb/en/services/services_renderer.201294.Real_Property_Transfer_Tax.html | 2026 | medium |
| Orgs — rebate authority | Dept. of Finance and Treasury Board | **Correct** as the authority — but there is no NB first-time-buyer transfer-tax rebate for it to administer. | https://www2.gnb.ca/content/gnb/en/departments/finance/taxes/real_property.html | 2026 | medium |
| Orgs — market | CREA MLS® HPI | **Correct authority, figures not sourced from it.** | https://stats.crea.ca/en-CA/ | 2026-06 | medium |

---

## NEWFOUNDLAND AND LABRADOR (`nl.ts`)

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| Registry of Deeds fee — base (`base`) | 100 | **$100 — CONFIRMED.** | https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf · https://www.gov.nl.ca/gs/registries/deeds/deed-reg/ | 2026 | medium |
| Registry of Deeds fee — per unit (`per` / `unit`) | 0.40 per 100 | **$0.40 per each additional $100 or part of one — CONFIRMED** (statutory wording: "$100.00 plus forty cents for each additional one hundred dollars or part of one"). Note "or part of one" means the statute *rounds the part-unit up*; verify the engine's `perValue` handler ceilings rather than floors. | https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf | 2026 | medium |
| Registry of Deeds fee — exempt amount (`exempt`) | 500 | **$500 — CONFIRMED.** The $100 base covers the first $500 of value; the $0.40/$100 applies above that. | https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf | 2026 | medium |
| Registry of Deeds fee — maximum cap | **not modelled** | **$5,000 maximum fee payable — MISSING from the model.** Bites above ≈$1.225 M of value; irrelevant at the $335 K benchmark but wrong for high-value NL properties. The `PerValueTransferLine` type has `min` but no `max`, so this needs a type change to represent. | https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf · https://wowa.ca/calculators/newfoundland-land-transfer-tax | 2026 | medium |
| Registry of Deeds fee — mortgage registration | **not modelled** | **FINDING: the same tariff is charged a second time on registering the mortgage**, computed on the mortgage principal (`on: "loan"`), not just on the deed. A financed NL purchase therefore pays roughly *two* of these fees. The model has only one line, on `price`. Roughly a $1,000–$1,300 understatement at the benchmark. | https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf · https://wowa.ca/calculators/newfoundland-land-transfer-tax | 2026 | medium |
| Property tax rate (`propTax`) | 0.0083 | **UNVERIFIED.** Could not reach a City of St. John's or NL municipal source (stjohns.ca 404 / millrate.ca 403 / web-search budget exhausted). NL municipal mil rates are set annually per municipality and vary widely; 0.0083 is not attributable to any source found. Needs a human. | — | — | none |
| First-time-buyer rebate (`rebates`) | `none` (noTax) | **`none` — CONFIRMED.** No first-time-buyer rebate or exemption from the NL registration fee. The only exemptions are for registrations on behalf of the Crown or a non-profit airport authority. `noTax: true` is also correct in substance — this is a *registration fee*, not a tax. | https://www.gov.nl.ca/gs/registries/deeds/deed-reg/ · https://wowa.ca/calculators/newfoundland-land-transfer-tax | 2026 | medium |
| Professional (`pro`) | lawyer | **lawyer — CONFIRMED** (NL conveyancing and deed registration are lawyer-handled). | https://www.gov.nl.ca/gs/registries/deeds/deed-reg/ | 2026 | low |
| Benchmark house / condo / new build | 335 000 / 290 000 / 400 000 | **UNVERIFIED (all three)** — see "Benchmarks and fees" note below. | — | — | none |
| Fees — lawyer / title ins. / inspect / appraisal / status cert / moving / setup | 1 450 / 300 / 500 / 350 / 100 / 1 250 / 550 | **UNVERIFIED (all seven)** — see "Benchmarks and fees" note below. | — | — | none |
| Orgs — transfer authority | Registry of Deeds, Service NL | **Partly stale.** The Registry of Deeds is correct, but the administering department is now **Digital Government and Service NL** and the fee tariff is prescribed by the Minister of Government Services; registrations run through **CADO (Companies and Deeds Online)**. | https://www.gov.nl.ca/gs/registries/deeds/deed-reg/ · https://cado.eservices.gov.nl.ca/Deeds/DeedsCompliance.aspx | 2026 | medium |
| Orgs — rebate authority | NL Dept. of Finance | **Misattributed.** There is no NL rebate; and the levy is a registration fee under Government Services, not a Finance tax. | https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf | 2026 | medium |
| Orgs — market | CREA MLS® HPI | **Correct authority, figures not sourced from it.** | https://stats.crea.ca/en-CA/ | 2026-06 | medium |

---

## PRINCE EDWARD ISLAND (`pe.ts`)

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| Real Property Transfer Tax rate (`transfer[0].rate`) | 0.01 (1%) | **0.01 (1%) — CONFIRMED**, levied on the *greater of* consideration or assessed value. Note also a general exemption where that greater value is **≤ $30,000**, which is not modelled (immaterial for housing). | https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax · https://www.ratehub.ca/land-transfer-tax-prince-edward-island | 2026 | medium |
| First-time-buyer exemption — full exemption? | `fullExempt` | **Full exemption of the RPTT — CONFIRMED**, but only *below a ceiling* (next row). All purchasers on title must qualify as first-time buyers; buyer must be a Canadian citizen/PR and have either resided in PEI for the 6 months before purchase or filed PEI income tax in 2 of the previous 6 years. | https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax-first-time-home-buyers-exemption | 2026 | medium |
| First-time-buyer exemption — purchase-price ceiling | none modelled | **$200,000 — CORRECTION, materially wrong.** The exemption applies only where the greater of consideration/assessed value does **not exceed $200,000**. Above $200,000 the full 1% is payable with **no partial relief** — it is a cliff, not a taper. The placeholder's uncapped `fullExempt` therefore zeroes the RPTT for every realistic PEI purchase. At the modelled `bench.house` of $388,000 the real tax is **$3,880** and the model reports **$0**. See "Discrepancies" below. | https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax-first-time-home-buyers-exemption · https://wowa.ca/calculators/pei-land-transfer-tax | 2026 | medium |
| Property tax rate (`propTax`) | 0.0105 | **UNVERIFIED — likely too low.** PEI property tax is provincial + municipal. WOWA lists **Charlottetown at 1.670%**, but does not state whether that is the owner-occupied or non-owner-occupied total. PEI's provincial residential rate is $1.50 per $100 with a provincial tax credit for owner-occupied non-commercial property that removes roughly two-thirds of it; the municipal rate is levied on top. 0.0105 is not attributable to a source found and is below every figure located. Needs a human. | https://wowa.ca/taxes/atlantic-property-tax | 2025/2026 | low |
| Professional (`pro`) | lawyer | **lawyer — CONFIRMED** (PEI conveyancing is lawyer-only). | https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax | 2026 | low |
| Benchmark house / condo / new build | 388 000 / 320 000 / 440 000 | **UNVERIFIED (all three)** — see "Benchmarks and fees" note below. | — | — | none |
| Fees — lawyer / title ins. / inspect / appraisal / status cert / moving / setup | 1 400 / 300 / 500 / 350 / 100 / 1 200 / 550 | **UNVERIFIED (all seven)** — see "Benchmarks and fees" note below. | — | — | none |
| Orgs — transfer authority | PEI Dept. of Finance, RPTT Act | **Correct in substance; name is stale.** The RPTT is administered by **Taxation and Property Records**, now under the Department of **Finance and Municipal Affairs**. | https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax | 2026 | medium |
| Orgs — rebate authority | PEI Dept. of Finance | **Correct** (same office administers the first-time-buyer exemption). | https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax | 2026 | medium |
| Orgs — market | CREA MLS® HPI | **Correct authority, figures not sourced from it.** | https://stats.crea.ca/en-CA/ | 2026-06 | medium |

---

## Benchmarks and fees — a blanket note

No `bench.*`, `rent`, `yoy`, or `fees.*` figure in any of the four jurisdictions could be tied to a
source. Two separate reasons, and they are different in kind:

- **Benchmarks.** CREA's public stats portal publishes national aggregates; the Atlantic
  regional/board-level MLS® HPI series were not reachable within this session's search budget. So
  the house and condo numbers are *unverified but sourceable* — a human with CREA board data can
  settle them. The **new-build** numbers are worse: CREA's HPI has **no new-construction series**,
  so `bench.newbuild` cannot be sourced from the cited authority at all and needs a different
  source (CMHC absorbed-unit prices, or StatCan's New Housing Price Index applied to a base).
- **Fees.** Lawyer, title insurance, inspection, appraisal, status-certificate, moving, and
  utility-setup costs are private-market prices with no authoritative publisher. They are also
  suspiciously *smooth* across the four records — each Atlantic jurisdiction is a small constant
  offset from the next, which is the signature of hand-tuned placeholders rather than survey data.
  Treat every one as a modelling assumption, not a fact, and consider surfacing them as
  user-editable ranges rather than point estimates.

## Discrepancies that change money materially

1. **PEI first-time-buyer exemption has a $200,000 ceiling that the model omits — biggest
   money-affecting error found.** `pe.ts` encodes `kind: "fullExempt"` with no cap. The real
   exemption applies only where the greater of consideration or assessed value is **≤ $200,000**,
   and it is a **cliff** — one dollar over and the full 1% is payable, with no partial relief. Since
   PEI's own modelled benchmark house is $388,000, **every realistic PEI first-time purchase in the
   app currently shows $0 transfer tax when the true amount is roughly $3,880**. The engine's
   `FullExemptRebate` type has no `cap` field, so this is not a data edit — it needs either a
   `cap`-bearing variant or reuse of `CapRebate`/`ExemptBandRebate` semantics with a hard cliff.
2. **NL charges the registration fee twice — once on the deed, once on the mortgage — and only one
   is modelled.** `nl.ts` has a single `perValue` line `on: "price"`. The tariff is applied again to
   the mortgage principal. On a $335,000 purchase with 20% down the missing mortgage-side fee is
   roughly **$1,170**, i.e. the modelled NL closing cost is understated by close to half of this
   line item. Fixing it is additive (a second `TransferLine` with `on: "loan"`), so it fits the
   existing schema.
3. **NS non-resident Provincial Deed Transfer Tax (10%) is entirely absent.** Not a bug for the
   default resident buyer, but it is the single largest closing cost in Nova Scotia for anyone who
   does not live there — on a $585,000 Halifax house it is **$58,500**, on top of the $8,775
   municipal DTT. The 2026-08-07 amendments loosened the *administration* (proof-of-residency window
   6 mo → 1 yr, refund window 1 yr → 2 yr) but left the rate at 10%. Because it turns on buyer
   residency rather than property, it needs an input flag before it can be modelled — worth deciding
   deliberately rather than leaving silently unhandled.
4. **NL registration fee has no maximum in the model.** The statutory cap is **$5,000**, reached at
   roughly $1.225 M of value. Immaterial at the benchmark, materially wrong above it —
   `PerValueTransferLine` has `min` but no `max`.
5. **NL per-unit rounding.** The statute reads "forty cents for each additional one hundred dollars
   **or part of one**" — the partial unit rounds *up*. If the engine floors the unit count, every NL
   figure is understated by up to $0.40. Trivial in dollars, but it is a correctness bug worth a
   test.
6. **Halifax `propTax` is 0.6% high** (0.01105 modelled vs ≈0.01098 for FY2026-27). Not material on
   its own — flagged only because it is the one property-tax rate of the four that *can* be
   reconciled, which makes the other three's lack of provenance more conspicuous.

## Unverifiable / needs a human

- **NL `propTax` (0.0083)** — no source found; St. John's and millrate.ca both blocked, search budget
  exhausted. Nothing supports this number.
- **PEI `propTax` (0.0105)** — no source found and **probably too low**. PEI bills a provincial rate
  plus a municipal rate; the only figure located (Charlottetown 1.670%) is well above the
  placeholder, though it is unclear whether that is the owner-occupied rate or the
  non-owner-occupied one. The PEI owner-occupied provincial tax credit is the deciding factor and
  needs to be read directly.
- **All `bench.*`, `rent`, `yoy`, and `fees.*`** — see the blanket note above. `bench.newbuild` in
  particular cannot come from the cited source and needs a different authority chosen first.
- **Halifax municipal DTT rate** — confirmed at 1.5% today, but HRM council has an active staff
  request to explore raising it. This one needs a re-check date, not just a value.
- Every "medium" confidence figure below rests on an authoritative-domain *search snippet* rather
  than a fetched page: halifax.ca, novascotia.ca, princeedwardisland.ca, and stjohns.ca all returned
  403/404 to direct fetches. A human should open the primary pages to promote these to high.

## Modelling limitations (structural, not data errors)

- **`nb`, `nl`, and `pe` are province-wide records carrying a single `propTax`, but property tax in
  all three is set per municipality.** This is a real modelling limitation, not a stale number:
  - **NB** — verified municipal rates span **0.01361 (Moncton) to 0.0159 (Saint John)**, with
    Fredericton ≈0.0147. That is a **~17% spread**, and it is compounded by a structural rule the
    model does not capture at all: owner-occupied principal residences are **exempt from the
    provincial rate** and pay municipal only, while property outside a municipality instead pays the
    provincial **$0.4115 per $100**. A single NB number cannot be right for both cases.
  - **PE** — Charlottetown, Summerside, and rural PEI differ, and PEI layers a provincial rate plus
    an owner-occupied provincial tax credit on top of the municipal rate. A flat `propTax` collapses
    a two-tier system with a means-like credit into one scalar.
  - **NL** — mil rates are set annually by each municipality and diverge sharply between St. John's,
    the northeast Avalon towns, and rural NL.
  These three records also carry `city: null, cityData: false`, so the UI cannot currently disclose
  *which* municipality the rate is meant to represent. Whatever the number becomes, it should be
  labelled (e.g. "modelled on Moncton") rather than presented as a provincial fact.
- **Halifax is the opposite case and is handled better** — it is a city record, but even within HRM
  the urban general rate ($0.687 base) and the suburban/rural rate ($0.654 base) differ, so a rural
  HRM buyer is over-charged by the model.
- **NB's RPTT base** is the *greater of* consideration or assessed value; the model computes on price
  alone. Harmless for arm's-length resales, wrong for below-assessment and family transfers. Same
  wording applies to PEI's RPTT and to the NS non-resident PDTT.
- **The NS "First-Time Home Buyers Rebate" is an HST rebate on new construction (up to $3,000), not a
  deed transfer rebate.** `halifax.ts` correctly records `none` for the transfer rebate, but the
  $3,000 new-build HST rebate is not modelled anywhere — a genuine missing credit for NS buyers of
  new homes, and easy to confuse with the transfer-tax rebate the field name implies.
