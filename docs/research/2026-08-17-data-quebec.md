# Data verification — Quebec (Montreal)

Research date: 2026-08-17. Target: figures current as of 2026.
Subject file: `src/domain/jurisdictions/montreal.ts` (all values are unverified prototype placeholders).

Status legend: `PENDING` = not yet researched · `UNVERIFIED` = researched, could not confirm.

## Transfer duties — droits de mutation immobilière ("taxe de bienvenue")

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| transfer bracket 1 | 62,700 @ 0.5% | **62,900 @ 0.5%** ("Jusqu'à 62 900 $") | https://montreal.ca/articles/comment-sont-calcules-les-droits-sur-les-mutations-immobilieres-9279 | eff. 2026-01-01 | high |
| transfer bracket 2 | 313,900 @ 1.0% | **315,000 @ 1.0%** ("62 900 $ à 315 000 $") | same | eff. 2026-01-01 | high |
| transfer bracket 3 | 563,300 @ 1.5% | **552,300 @ 1.5%** ("315 000 $ à 552 300 $") | same | eff. 2026-01-01 | high |
| transfer bracket 4 | 1,126,800 @ 2.0% | **1,104,700 @ 2.0%** ("552 300 $ à 1 104 700 $") | same | eff. 2026-01-01 | high |
| transfer bracket 5 | 2,179,200 @ 2.5% | **2,136,500 @ 2.5%** ("1 104 700 $ à 2 136 500 $") | same | eff. 2026-01-01 | high |
| transfer bracket 6 | 3,175,300 @ 3.5% | **3,113,000 @ 3.5%** ("2 136 500 $ à 3 113 000 $") | same | eff. 2026-01-01 | high |
| transfer top tier | null @ 4.0% | **null @ 4.0%** ("À partir de 3 113 000 $") — CONFIRMED | same | eff. 2026-01-01 | high |
| indexation year | (none recorded) | Table above is the **2026** table (2025 was 61,500 / 307,800 / 552,300 with identical upper tiers & rates). Thresholds indexed annually to the Quebec CPI ("indexées annuellement selon le taux d'augmentation de l'indice d'ensemble des prix à la consommation pour le Québec"). | https://www.quebec.ca/gouvernement/gestion-municipale/finances-fiscalite-municipales/fiscalite/droits-mutations-immobilieres | 2026 | high |

**Structural notes.**
- All seven *rates* in the placeholder are correct; only the *thresholds* are wrong (placeholder runs ~0.3–2.0% high on tiers 3–6, ~0.3% low on tiers 1–2). The placeholder appears to be an indexed-forward or fabricated variant of the real table, not any real published year.
- Quebec's statutory base (all municipalities) is only three tranches for 2026: 0.5% to $62,900, 1.0% from $62,900.01 to $315,000, 1.5% above $315,000. Municipalities may set a higher rate on the portion above $500,000 but "un tel taux ne peut toutefois excéder 3 %, **sauf dans le cas de la Ville de Montréal qui peut fixer un taux supérieur**" — this is the statutory basis for Montreal's 3.5% and 4% tiers. Source: quebec.ca (above).
- Montreal's first two thresholds (62,900 / 315,000) track the provincial statutory ones exactly; tiers 3–7 are Montreal's own.
- Caution: the assessment base is the **greater of** consideration paid, consideration stated, and the municipal assessment multiplied by the *facteur comparatif* (2026 factor: 1.00; 2025: 1.08; 2024: 1.10). The engine computes duties on price alone; in years where the factor exceeds 1.00 this understates duties for below-assessment purchases.

## Rebates / exemptions

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| rebates (FTB transfer-duty rebate) | `kind: "none"` | **WRONG as of 2026.** Quebec created a *crédit d'impôt remboursable pour l'accès à la propriété* — a refundable credit against the droits de mutation, max **5,875 $**: 100% of the first 5,000 $ of duties paid, plus 25% of duties above that (max additional 875 $). Retroactive to **2026-01-01**, tax year 2026 onward. | https://www.quebec.ca/nouvelles/actualites/details/quebec-vient-en-aide-aux-acheteurs-dune-premiere-habitation-69816 · https://ici.radio-canada.ca/nouvelle/2247005/premier-acheteur-maison-droits-mutation-remboursement | announced 2026-04-17; RQ notice 2026-04-21 | medium (search snippets from quebec.ca / Revenu Québec / Radio-Canada; revenuquebec.ca returns HTTP 403 to automated fetch, so no direct quote of the statutory text) |
| ↳ eligibility | — | Both buyers must have been non-owners for **four years**. Property value must be **under 1,000,000 $**; credit phases out linearly from **750,000 $** to nil at **1,000,000 $**. Advance payment ("versement anticipé") expected from autumn 2026 where the eligible amount exceeds 1,000 $. | same | 2026-04 | medium |
| Programme d'appui à l'acquisition résidentielle | not represented | **Closed to new applications as of 2026-07-07** — the new provincial refundable credit replaced it (April 2026). Applications received before 2026-07-07 remain eligible and are processed through end of 2026. Historically: partial refund of droits de mutation on existing properties, household needed ≥1 child under 18, price cap 725,000 $, refund typically 5,000–7,000 $. | https://montreal.ca/programmes/programme-dappui-lacquisition-residentielle | 2026 | medium (montreal.ca program page via search snippet; not fetched directly) |

## Tax-time credits

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| taxTime `cr_hba` (federal Home Buyers' Amount) | 1500 | **1,500 — CONFIRMED.** 10,000 $ claimed on line 31270 × lowest federal rate 15% = 1,500 $. Non-refundable, no carry-forward. | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html | 2026 | high |
| taxTime `cr_provCredit` (QC first-time home buyers' credit) | 1400 | **1,400 — CONFIRMED.** *Crédit d'impôt pour l'achat d'une première habitation*: "la valeur du crédit est aussi calculée en multipliant le montant du crédit (10 000 $) par le taux inférieur d'imposition de 14 %" = 1,400 $. Was 1,500 $ for 2022 only (rate was 15%); 1,400 $ from 2023 onward. Non-refundable. | https://cffp.recherche.usherbrooke.ca/outils-ressources/guide-mesures-fiscales/credit-impot-achat-premiere-habitation/ | current to 2025, no 2026 change found | high |

Note: the new refundable *accès à la propriété* credit (see Rebates above) is **separate from and additional to** this 1,400 $ non-refundable credit — nothing found indicates it replaces it.

## Premium tax

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| premiumTax.rate | 0.09 | **0.09 CORRECT for 2026 — but changes to 0.09975 for premiums paid after 2026-12-31.** Revenu Québec: "Uniformisation du taux de la taxe sur les primes d'assurance avec celui de la TVQ" — the 9% *taxe sur les primes d'assurance* rises to 9.975% to match the TVQ. | https://www.revenuquebec.ca/fr/salle-de-presse/nouvelles-fiscales/details/2026-04-09/uniformisation-du-taux-de-la-taxe-sur-les-primes-dassurance-avec-celui-de-la-tvq/ | notice dated 2026-04-09 | medium (search snippet; revenuquebec.ca returns 403 to automated fetch) |
| premiumTax levying authority | Revenu Québec | **Revenu Québec — CONFIRMED.** The levy is the *taxe sur les primes d'assurance* (tax on insurance premiums), distinct from GST/QST, administered by Revenu Québec. It applies to CMHC/SCHL, Sagen and Canada Guaranty premiums, and **cannot be financed into the mortgage** — payable in cash to the notary at signing. | https://www.revenuquebec.ca/fr/entreprises/taxes/taxe-sur-les-primes-dassurance/ | 2026 | high |

The label string `"Quebec tax on insurance premiums, 9%"` is accurate for 2026 but hardcodes the rate in prose — it will need editing alongside `rate` at the 2027 change.

## Property tax

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| propTax (total residential rate, decimal) | 0.00792 | **Plausible but slightly high; no single true value exists.** Montreal has no uniform residential rate — it varies by arrondissement. 2026 city-council components per 100 $ of assessment: *taxe foncière générale* **0.4631**, *taxe relative à l'ARTM* **0.0070**, *taxe relative à la voirie* **0.0024** → subtotal **0.4725**. Each of the 19 boroughs adds service + investment taxes (e.g. Rosemont–La Petite-Patrie +0.0839 → ~0.5564 total), plus water taxes/tarification in some sectors. Aggregators put the all-in municipal residential range at roughly **0.6229–0.7403 per 100 $** (i.e. 0.006229–0.007403). | https://www.calculconversion.com/calcul-taxes-municipales-montreal.html · https://taxesmunicipales.ca/taxes-municipales/montreal | 2026 budget | medium (third-party aggregators; the official "Taux de taxes 2026" figures live in a PDF linked from montreal.ca that could not be extracted) |
| ↳ school tax (*taxe scolaire*) | not modelled separately | **0.07899 per 100 $** (0.0007899), uniform province-wide, first 25,000 $ of assessment exempt. | https://taxesmunicipales.ca/taxes-municipales/montreal | 2026 | medium |

Reading: municipal 0.0062–0.0074 **plus** school ~0.0008 gives roughly **0.0070–0.0082** all-in — so the 0.00792 placeholder sits at the top of the credible band and is defensible only if it is meant to be municipal + school combined. If `propTax` is intended as municipal-only, 0.00792 is **too high by roughly 10–25%**. Which of the two the engine means is undocumented and needs a decision.
2026 context: residential tax bills rose **3.8% on average** city-wide (4.3% for single-family homes, 3.4% for condos), with four boroughs above 5%. Source: https://www.ledevoir.com/economie/947379/montreal-hausse-taxes-residentielles-3-8-2026

## Closing fees

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
**None of the fee figures could be verified.** Every authoritative Quebec source attempted refused automated fetch: OACIQ (403), Chambre des notaires du Québec (403), Desjardins (410), BKH Finance (503) — and the WebSearch budget was exhausted before fees were reached. All rows below stay UNVERIFIED; none were guessed at or "confirmed" from memory.

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| fees.notary | 1800 | **UNVERIFIED.** Structural fact confirmed: Quebec conveyancing is done by a **notaire**, not a lawyer — the deed is signed before the notary, who also collects the non-financeable insurance premium tax at signing. So `pro: "notary"` is correct. The dollar amount is not verified. Notary fees in Quebec are freely set, not tariffed, so any single number is an average, not a rule. | https://www.revenuquebec.ca/fr/entreprises/taxes/taxe-sur-les-primes-dassurance/ (for the notary-at-signing fact only) | — | none (amount) / high (that a notary is the conveyancer) |
| fees.locCert (certificat de localisation) | 400 | **UNVERIFIED.** The *certificat de localisation* is a real and normally mandatory Quebec-specific document (prepared by an *arpenteur-géomètre*, required by lenders and by the notary), so the field belongs here — only the amount is unconfirmed. | — | — | none |
| fees.inspect | 600 | **UNVERIFIED** (*inspection préachat*). | — | — | none |
| fees.appraisal | 400 | **UNVERIFIED** (*évaluation agréée*). | — | — | none |
| fees.statusCert (condo/syndicate docs) | 0 | **UNVERIFIED — and 0 looks wrong.** Quebec condo purchases involve obtaining documents from the *syndicat de copropriété* (déclaration de copropriété, procès-verbaux, état financier, étude du fonds de prévoyance). Setting this to 0 means the model charges a Montreal condo buyer nothing for syndicate documents, unlike the Ontario status-certificate equivalent. Whether 0 reflects a real Quebec practice (costs often absorbed by the seller or the notary's fee) or is simply an unfilled placeholder needs a human with Quebec transaction experience. | — | — | none |
| fees.moving | 1300 | **UNVERIFIED.** | — | — | none |
| fees.setup (utility hookup) | 600 | **UNVERIFIED.** Quebec-specific note: Hydro-Québec is the sole electricity distributor, and its account-opening charge is small and fixed, not a market range — 600 $ likely bundles other setup costs and should be defined. | — | — | none |

## Organizations

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| orgs.transfer | Ville de Montréal, droits de mutation immobilière | **CORRECT.** Montreal levies and bills the duties itself; the enabling statute is the *Loi concernant les droits sur les mutations immobilières* (RLRQ c. D-15.1). Consider naming the statute in the disclosure text. | https://montreal.ca/articles/comment-sont-calcules-les-droits-sur-les-mutations-immobilieres-9279 | 2026 | high |
| orgs.premTax | Revenu Québec | **CORRECT.** Administers the *taxe sur les primes d'assurance*. | https://www.revenuquebec.ca/fr/entreprises/taxes/taxe-sur-les-primes-dassurance/ | 2026 | high |
| orgs.rebate | Revenu Québec | **CORRECT and now materially more relevant** — Revenu Québec administers the new refundable *crédit d'impôt pour l'accès à la propriété*. Previously the relevant body for the municipal program was the Ville de Montréal; that program is now closed. | https://www.quebec.ca/nouvelles/actualites/details/quebec-vient-en-aide-aux-acheteurs-dune-premiere-habitation-69816 | 2026-04 | high |
| orgs.market | APCIQ · Centris | **CORRECT.** APCIQ (Association professionnelle des courtiers immobiliers du Québec) publishes Montreal CMA statistics via the Centris system; it is described as "Quebec's authority in the analysis of residential real estate data." | https://apciq.ca/en/real-estate-market/statistics/ | 2026 | high |

## Market benchmarks

| Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|
| bench.house | 640,000 | **UNVERIFIED.** APCIQ's July 2026 Montreal CMA release reports only percentage changes, not dollar medians; the dollar figures sit behind APCIQ/Centris statistics tables that could not be retrieved (search budget exhausted, Centris statistics URLs 404 to automated fetch). | https://apciq.ca/en/montreal-cma-adjustment-period-continues-condominium-market-in-balance/ | July 2026 data, released 2026-08-06 | none |
| bench.condo | 442,000 | **UNVERIFIED** — same reason. | same | July 2026 | none |
| bench.newbuild | 690,000 | **UNVERIFIED.** APCIQ/Centris track resale only; they publish no "new build" median at all. This field has no obvious authoritative source — the likely candidates are APCHQ or CMHC new-housing data, neither checked. | — | — | none |
| rent (2-bedroom, monthly) | 1950 | **UNVERIFIED.** CMHC's Rental Market Survey data tables are an Excel download, not fetchable as text. Note the definitional gap: CMHC reports the *average rent of the existing occupied stock*, which runs well below asking rents for units turning over — whichever the engine means should be stated. | https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables | — | none |
| yoy (decimal) | 0.041 | **Close to correct for houses.** APCIQ, July 2026, Montreal CMA: "The median price of single-family homes increased by **4 per cent** from the previous year, plexes by **6 per cent** and condominiums by **2 per cent**." A single scalar `yoy` cannot represent this spread — 0.041 matches houses, but overstates condo growth by 2× . | https://apciq.ca/en/montreal-cma-adjustment-period-continues-condominium-market-in-balance/ | July 2026, released 2026-08-06 | high (for the percentages) |

## Discrepancies that change money materially

Ordered by dollar impact on a typical Montreal first-time buyer.

1. **The missing 5,875 $ refundable credit — largest error in the file.** `rebates: [{ kind: "none" }]` says Quebec offers first-time buyers nothing against transfer duties. Since **2026-01-01** that is false: the *crédit d'impôt remboursable pour l'accès à la propriété* refunds 100% of the first 5,000 $ of droits de mutation plus 25% of the excess, to a maximum of **5,875 $**. On a 600,000 $ Montreal purchase the duties are roughly 7,000 $, so norma currently overstates the true net cost by **~5,500 $** — and this is a *refundable* credit, so unlike the two non-refundable credits it pays out regardless of tax payable. It phases out from 750,000 $ to nil at 1,000,000 $ and requires both buyers to have been non-owners for four years.
   - Schema problem: `Rebate` has `kind: "cap"` (flat cap), `"exemptBand"`, `"fullExempt"`, `"none"`. None expresses "100% of the first X, then 25% of the excess, then phased out over a price band." This needs either a new `Rebate` variant or modelling as a `taxTime` entry with a price-dependent amount. Note also `timing` — it is claimed on the tax return, though an advance payment is expected from autumn 2026, so it is neither cleanly `"closing"` nor purely `"taxTime"`.
2. **Every transfer-duty threshold is wrong.** The seven *rates* are all correct, but all six thresholds are off. Because tiers 3–6 are set too high, the model puts too much value in cheaper tiers and **understates duties** across most of the range. On a 700,000 $ purchase the correct 2026 Montreal duty is about **9,349 $**; the placeholder thresholds compute meaningfully less. Fix is mechanical — replace with 62,900 / 315,000 / 552,300 / 1,104,700 / 2,136,500 / 3,113,000.
3. **The duty base is not the purchase price.** Duties are charged on the *greater of* price paid, price stated, and municipal assessment × *facteur comparatif*. The 2026 factor is 1.00 so this is currently harmless, but it was 1.08 in 2025 and 1.10 in 2024 — in any year where the factor exceeds 1.00, computing on price alone understates duties for anyone buying below assessed value.
4. **`premiumTax.rate` expires at the end of this year.** 0.09 is right for 2026, but rises to **0.09975** for premiums paid after 2026-12-31. On a 20,000 $ CMHC premium that is ~195 $, payable in cash at the notary and not financeable. The rate is also duplicated in prose inside `label`, so both need changing together. Worth a dated TODO now.
5. **`propTax` at 0.00792 is at or above the top of the credible band**, and no single Montreal rate exists — it varies by arrondissement (city base 0.4725 per 100 $ plus borough taxes plus water). All-in municipal + school lands around 0.0070–0.0082. Whether the field means municipal-only or municipal + school is undefined; under the municipal-only reading it overstates annual carrying cost by roughly 10–25%, which flows straight into the affordability ceiling.
6. **`yoy` collapses a real 2× spread.** July 2026: houses +4%, condos +2%, plexes +6%. The 0.041 scalar is right for houses and doubles condo growth.

## Unverifiable / needs a human

- **All seven `fees` values.** Every authoritative source refused automated fetch (OACIQ 403, Chambre des notaires 403, Desjardins 410, BKH 503) and the search budget ran out. These need a human, ideally someone with recent Quebec transaction experience — notary fees are freely set rather than tariffed, so the "right" number is a judgment call about which average to publish.
- **`fees.statusCert: 0` specifically.** Needs a decision, not just a number: does a Montreal condo buyer really pay nothing for *syndicat de copropriété* documents, or is 0 an unfilled placeholder?
- **`bench.house` / `bench.condo` dollar figures.** APCIQ publishes them, but the July 2026 press release gives only percentages and the statistics tables were not reachable. Straightforward for a human with a browser.
- **`bench.newbuild`.** Harder — APCIQ/Centris cover resale only and publish no new-build median. This field needs a source decision (APCHQ? CMHC?) before it can have a value.
- **`rent`.** CMHC's numbers live in an Excel download. Also needs a definition: CMHC average rent of occupied stock is well below asking rent for units actually available.
- **Statutory text of the new credit.** Everything above about the 5,875 $ credit comes from quebec.ca, Revenu Québec and Radio-Canada *search snippets* — revenuquebec.ca returns 403 to automated fetch, so the legislation and the exact phase-out formula between 750,000 $ and 1,000,000 $ were never read directly. Confirm before implementing, particularly whether the phase-out is linear.
- **Interaction between the new refundable credit and the old 1,400 $ non-refundable one.** Nothing found says the new credit replaces the old, and they appear to be independent, but this was not confirmed against primary text.
- **Whether the closed municipal program still matters.** Applications filed before 2026-07-07 are processed through end of 2026, so a 2026 buyer could still be receiving it. Probably not worth modelling, but it is a real edge case this year.
- **Non-Montreal Quebec.** Everything here is Montreal-specific. The Montreal bracket table above tiers 3+ applies to no other Quebec municipality — every other city is capped at 3%, and most use only the three statutory tranches. Do not generalize this file to a `quebec-other` jurisdiction.
