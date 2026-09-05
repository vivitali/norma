import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

// No `statusCert`. The field is optional and Montreal carried it as `0`, which is falsy —
// so the engine's truthiness gate built no status-certificate line for a Montreal condo,
// while `feesProvenance()` derived from this literal still disclosed an `assumption`-grade
// modelling default for it on /sources. An absent field is the honest way to say a record
// carries no figure: the provenance entry goes with it, and the engine's gate is now
// `!= null` so a real 0 would render rather than vanish.
const fees: JurisdictionFees = { notary: 1800, locCert: 400, inspect: 600, appraisal: 400, moving: 1300, setup: 600 };

export const montreal: Jurisdiction = {
  id: "montreal",
  country: "ca",
  prov: "QC",
  city: "montreal",
  cityData: true,
  pro: "notary",
  rent: 1346,
  rentBasis: "apartment2br",
  yoy: 0.04,
  bench: { house: 650000, condo: 431500 },
  // 0.746922 $ per 100 $ of assessment: the unweighted mean of the 19 boroughs' all-in 2026
  // residential rates (0.667932) plus the province-wide school tax (0.07899). Ratio 1 because
  // Montreal's 2026 facteur comparatif — the City's own roll-to-market conversion — is 1.00.
  propTax: { effective: 0.0074692, publishedRate: 0.0074692, assessmentRatio: 1, basis: "market" },
  transfer: [
    {
      key: "li_dutiesMuni",
      ex: "ex_lttMuni",
      tier: "municipal",
      kind: "brackets",
      // 2026 table, indexed annually to the Quebec CPI. All seven rates were already correct;
      // every threshold was wrong. Montreal's first two thresholds track the provincial
      // statutory ones; tiers 3-7 are Montreal's own, which no other Quebec municipality
      // shares — the statute caps every other municipality at 3% above $500,000.
      brackets: [
        [62900, 0.005], [315000, 0.01], [552300, 0.015], [1104700, 0.02],
        [2136500, 0.025], [3113000, 0.035], [null, 0.04],
      ],
    },
  ],
  premiumTax: { rate: 0.09, label: "Quebec tax on insurance premiums, 9%" },
  rebates: [
    // Crédit d'impôt remboursable pour l'accès à la propriété, for homes acquired from
    // 2026-01-01. 100% of the first $5,000 of transfer duties plus 25% of the next $3,500,
    // maximum $5,875. Refundable and claimed on the return — hence taxTime, which keeps it
    // out of the cash needed at closing. There is deliberately no phase-out; see
    // TieredCapRebate in types.ts for why the $750,000 on the ministry's chart is not one.
    {
      key: "cr_qcAccess", ex: "ex_qcAccess", kind: "tieredCap",
      tiers: [[5000, 1], [null, 0.25]],
      cap: 5875,
      on: "li_dutiesMuni", timing: "taxTime", when: { ftb: true },
    },
  ],
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1400 },
    { key: "cr_provCredit", ex: "ex_hba", amount: 1400 },
  ],
  fees,
  orgs: {
    transfer: "Ville de Montréal, droits de mutation immobilière",
    premTax: "Revenu Québec",
    rebate: "Revenu Québec",
    market: "APCIQ · Centris",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.brackets": {
      conf: "high",
      src: "Ville de Montréal, « Comment sont calculés les droits sur les mutations immobilières », seuils à partir du 1er janvier 2026",
      asOf: "2026-01-01",
      url: "https://montreal.ca/articles/comment-sont-calcules-les-droits-sur-les-mutations-immobilieres-9279",
      note: "SCOPE: Ville de Montréal (agglomeration) only. Quebec's statutory schedule is three tranches — 0.5% / 1% / 1.5% — and a municipality may set a higher rate on the portion above $500,000, capped at 3% for everyone except Montreal. Tiers 3-7 here are Montreal's own and generalise to no other Quebec municipality. Thresholds are indexed annually to the Quebec CPI, so this table expires: the 2025 table began at 61,500 / 307,800. Verified against the City's own worked example, reproduced as a test — a $700,000 base gives 314.50 + 2,521.00 + 3,559.50 + 2,954.00 = $9,349.00. The duty base is the GREATER of consideration paid, consideration stipulated, and the roll value x the facteur comparatif (2026: 1.00; 2025: 1.08; 2024: 1.10); the engine computes on price alone, which is harmless only while the factor is 1.00.",
    },
    "rebates.0.tiers": {
      conf: "high",
      src: "Ministère des Finances du Québec, « Crédit d'impôt remboursable pour l'accès à la propriété — document explicatif »",
      asOf: "2026-01-01",
      url: "https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/Bulletins/FR/BI_Explication_technique.pdf",
      note: "Read in full, not from snippets: « 100 % des premiers 5 000 $ en droits de mutation payés; 25 % sur les 3 500 $ de droits de mutation payés qui excèdent ce premier 5 000 $ ». Applies to eligible homes acquired from 2026-01-01. Eligibility is four years of non-ownership by the buyer and spouse, not a price test.",
    },
    "rebates.0.cap": {
      conf: "high",
      src: "Ministère des Finances du Québec, same bulletin, TABLEAU 1",
      asOf: "2026-01-01",
      url: "https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/Bulletins/FR/BI_Explication_technique.pdf",
      note: "$5,875 maximum, and there is NO phase-out: the bulletin's « Admissibilité » section names no price ceiling and no reduction, and its own worked example has a Laval buyer at $616,000 paying $9,091 of duties and receiving the full $5,875 (65% of duties). The $750,000 on the ministry's chart is where the CAP is reached; the curve is flat above it. An earlier draft of this record specified phaseFrom 750,000 / phaseTo 1,000,000 — that provision does not exist. Advance payment starts October 2026 where the amount exceeds $1,000; deliberately not modelled, because the credit is still claimed on the return.",
    },
    "premiumTax.rate": {
      conf: "high",
      src: "Ministère des Finances du Québec, Budget 2025-2026, Renseignements additionnels, section A §3.1",
      asOf: "2026",
      url: "https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/Budget/2526/Budget2526_RenseignementsAdd.pdf",
      note: "« Le taux de cette taxe est actuellement de 9 % [...] la taxe sur les primes d'assurance au taux de 9,975 % s'appliquera aux primes d'assurance qui seront payées après le 31 décembre 2026. » So 0.09 is correct for 2026 and wrong from 2027-01-01, when it becomes 0.09975 to match the TVQ. The rate is duplicated in prose inside `label` — both need changing together, and a test asserts the label still says 9%. CMHC confirms only Ontario, Quebec and Saskatchewan tax the premium, and that the tax cannot be financed into the loan; the engine already marks the line cashOnly.",
    },
    "propTax.publishedRate": {
      conf: "assumption",
      src: "Ville de Montréal, « Taux de taxation 2026 » (2026_taux_taxes.pdf) · Comité de gestion de la taxe scolaire de l'île de Montréal, taux 2026-2027",
      asOf: "2026-01-01",
      url: "https://montreal.ca/articles/taux-de-taxes-pour-2026-106147",
      note: "Montreal publishes NO city-wide residential rate — it varies by borough. Every component here is official: city-level taxes applying to all residential property total 0.5556 per $100 (taxe foncière générale 0.4631 + ARTM 0.0070 + voirie 0.0024 + service de l'eau 0.0831), to which each borough adds its dettes des anciennes villes, services and investissements shares. The 19 boroughs' all-in residential rates run from 0.6229 (Ville-Marie) to 0.7403 (Anjou); their unweighted mean is 0.667932. The province-wide school tax of 0.07899 per $100 (set by the Ministère de l'Éducation, published in the Gazette officielle) is added on top, giving 0.746922 per $100 = 0.0074692. The ASSUMPTION is the aggregation — an unweighted borough mean including school tax — not the figures. Two known simplifications: the school tax exempts the first $25,000 of assessment, and Lachine adds a flat $57.91 per unit.",
    },
    "propTax.effective": {
      conf: "assumption",
      src: "Derived: propTax.publishedRate x propTax.assessmentRatio",
      asOf: "2026-01-01",
      note: "Equal to publishedRate because the ratio is 1. Carries the same assumption as publishedRate: no single Montreal residential rate exists, so this is the 19-borough mean plus school tax. The prototype's 0.00792 sat above the top of the credible band even including school tax.",
    },
    "propTax.assessmentRatio": {
      conf: "medium",
      src: "Ville de Montréal, facteur comparatif du rôle, 2026",
      asOf: "2026-01-01",
      url: "https://montreal.ca/articles/comment-sont-calcules-les-droits-sur-les-mutations-immobilieres-9279",
      note: "Quebec assesses on a three-year rôle d'évaluation foncière. The current roll covers 2026-2027-2028 and its reference date is 2024-07-01 — 18 months before it takes effect — so it is a base-year assessment, not a live one. The roll-to-market ratio IS published, as the facteur comparatif, and Montreal's for 2026 is 1.00: on the City's own reckoning the roll equals market value, which is why basis is `market` and the ratio is 1 rather than a guess. Two caveats a later revision should price in if a source appears: the 2026-2028 roll came in 12.6% above the previous one across the 19 boroughs, and Montreal spreads that increase over three years (mesure d'étalement), so the actual 2026 taxable base runs roughly 7% BELOW the roll value — this record therefore slightly overstates 2026 and 2027 tax. The facteur comparatif is also re-set annually (1.08 in 2025, 1.10 in 2024), so a ratio of 1 expires with the 2026 factor.",
    },
    "bench.house": {
      conf: "high",
      src: "QPAREB/APCIQ July 2026 statistics, Montreal CMA, single-family home MEDIAN price (not an MLS HPI benchmark)",
      asOf: "2026-07",
      url: "https://apciqca-152af.kxcdn.com/wp-content/uploads/sites/4/2026/08/stats-202607-en.pdf",
      note: "METRIC: a median, read off the July 2026 table ($650,000 vs $625,000 a year earlier). This is NOT the same quantity the other records hold — Toronto, Vancouver, Calgary and Ottawa carry quality-constant MLS HPI benchmarks and Winnipeg carries board averages. A median, an average and a benchmark are not interchangeable, and `bench` currently holds all three across the dataset. Switching Montreal to another metric to match is a product decision, not a data fix. SCOPE: Montreal CMA. The Island of Montreal alone is $817,500 — 26% higher.",
    },
    "bench.condo": {
      conf: "high",
      src: "QPAREB/APCIQ July 2026 statistics, Montreal CMA, condominium MEDIAN price",
      asOf: "2026-07",
      url: "https://apciqca-152af.kxcdn.com/wp-content/uploads/sites/4/2026/08/stats-202607-en.pdf",
      note: "METRIC: a median ($431,500 vs $425,000, +1.5%), same caveat as bench.house. SCOPE: Montreal CMA; the Island of Montreal is $480,000.",
    },
    "rent": {
      conf: "high",
      src: "CMHC Rental Market Survey, Montréal CMA, two-bedroom purpose-built, reliability code a",
      asOf: "2025-10",
      note: "The prototype's $1,950 was ~45% high. CMHC reports the average rent of the EXISTING OCCUPIED stock, which runs below asking rents for units actually turning over — the survey's own definition, and the reason this cannot be dated later than October 2025.",
    },
    "yoy": {
      conf: "high",
      src: "QPAREB/APCIQ July 2026, Montreal CMA single-family median, year over year",
      asOf: "2026-07",
      url: "https://apciqca-152af.kxcdn.com/wp-content/uploads/sites/4/2026/08/stats-202607-en.pdf",
      note: "Montreal is the one market of the eight in this dataset that is rising, and the sign is load-bearing for Rent vs Buy. A single scalar collapses a real spread: single-family +4%, plexes +6%, condominiums +2%.",
    },
    "taxTime.0.amount": {
      conf: "high",
      src: "Ministère des Finances du Québec, « Crédit d'impôt remboursable pour l'accès à la propriété — document explicatif », TABLEAU 1",
      asOf: "2026",
      url: "https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/Bulletins/FR/BI_Explication_technique.pdf",
      note: "The FEDERAL Home Buyers' Amount: $10,000 x the 2026 lowest federal rate of 14% = $1,400, replacing the prototype's $1,500 (which was the 15% figure). The bulletin lists the federal credit as $1,169 for a Quebec resident — $1,400 x 0.835 after the 16.5% Quebec abatement, which the bulletin states as an 11.69% effective rate. norma does not model the abatement, so it carries the gross $1,400; a Quebec filer's actual benefit is $1,169.",
    },
    "taxTime.1.amount": {
      conf: "high",
      src: "Ministère des Finances du Québec, same bulletin, TABLEAU 1 note (2)",
      asOf: "2026",
      url: "https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/Bulletins/FR/BI_Explication_technique.pdf",
      note: "Quebec's own crédit d'impôt non remboursable pour l'achat d'une première habitation: « un montant de 10 000 $ converti au premier taux d'imposition au Québec, soit 14 % » = $1,400. It was $1,500 for 2022 only, when the rate was 15%. Separate from and additional to the new refundable credit — the bulletin adds all three to a maximum of $8,444.",
    },
  },
};
