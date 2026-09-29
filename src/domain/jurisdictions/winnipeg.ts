import type { Jurisdiction, JurisdictionFees, Provenance, TaxArea } from "../types";
import { feesProvenance } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1800, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1500, setup: 300 };

/**
 * Winnipeg's eight school divisions, 2026. Each levies its own school mill rate on top of the one
 * municipal rate (13.372); residential property pays no Education Support Levy. The reader picks
 * theirs (`withTaxArea` in ./index.ts); the record's own rates below are Winnipeg School
 * Division's, the default. Division scolaire franco-manitobaine does not appear: the City's table
 * lists exactly these eight levying divisions.
 */
const MILL_RATES_URL = "https://assessment.winnipeg.ca/Asmttax/pdfs/rates/HistoricalCombinedMillRates.pdf";
const MUNICIPAL_MILLS = 13.372;
const PORTION = 0.45;
const DIVISIONS: readonly (readonly [id: string, name: string, schoolMills: number])[] = [
  ["winnipeg-sd", "Winnipeg", 15.994],
  ["louis-riel", "Louis Riel", 14.653],
  ["pembina-trails", "Pembina Trails", 11.851],
  ["river-east-transcona", "River East Transcona", 13.368],
  ["st-james-assiniboia", "St. James-Assiniboia", 13.848],
  ["seven-oaks", "Seven Oaks", 16.158],
  ["seine-river", "Seine River", 14.156],
  ["interlake", "Interlake", 12.236],
];
const combinedMills = (school: number) => Math.round((MUNICIPAL_MILLS + school) * 1000) / 1000;
const TAX_AREAS: readonly TaxArea[] = DIVISIONS.map(([id, , school]) => ({
  id,
  publishedRate: combinedMills(school) / 1000,
  effective: (combinedMills(school) / 1000) * PORTION,
  schoolEffective: (school / 1000) * PORTION,
}));
const areaProvenance: Record<string, Provenance> = Object.fromEntries(
  // Keyed by the field path, index-based like `transfer.1.amount`, so the provenance test can
  // resolve it; `withTaxArea` reads the chosen division's entry by the same path.
  DIVISIONS.map(([, name, school], i) => [
    `propTax.areas.list.${i}.publishedRate`,
    {
      conf: "high",
      // One document title for all eight, so /sources folds them into one citation with a line
      // per division instead of eight near-identical rows.
      src: "City of Winnipeg Assessment and Taxation, 2026 Combined Mill Rates by School Division",
      asOf: "2026",
      url: MILL_RATES_URL,
      note: `${name} School Division: ${combinedMills(school).toFixed(3)} mills = municipal ${MUNICIPAL_MILLS.toFixed(3)} + school ${school.toFixed(3)}.`,
    },
  ]),
);

export const winnipeg: Jurisdiction = {
  id: "winnipeg",
  country: "ca",
  prov: "MB",
  city: "winnipeg",
  cityData: true,
  verified: "2026-09-28",
  pro: "lawyer",
  rent: 1570,
  rentBasis: "apartment2br",
  yoy: 0.03,
  // AVERAGES, not MLS HPI benchmarks. The Winnipeg Regional Real Estate Board publishes no
  // benchmark at all; see the provenance notes, which are the disclosure and are under test.
  bench: { house: 439216, condo: 283715 },
  // Manitoba taxes a PORTIONED assessment: the residential class portion is 45%, and the mill
  // rates are applied to that, not to full value. 29.366 mills x 0.45 = 0.0132147 on market
  // value. The mill rate is the Winnipeg School Division's — one of eight; see provenance.
  propTax: {
    effective: 0.0132147,
    publishedRate: 0.029366,
    assessmentRatio: 0.45,
    basis: "portioned",
    areas: { default: "winnipeg-sd", list: TAX_AREAS },
    // Manitoba's Homeowners Affordability Tax Credit, 2026: the lesser of $1,600 and the gross
    // school taxes on a principal residence, applied on the tax bill. Capped against the default
    // division's school slice; `withTaxArea` swaps in the chosen division's.
    credit: { kind: "cappedAgainstSlice", amount: 1600, appliesToRate: (15.994 / 1000) * PORTION },
  },
  transfer: [
    {
      key: "li_lttProv",
      // Manitoba's own explanation: the standard one plus Bill 53's 2027 bare-trust tax, which a
      // reader who has heard "the land transfer tax changes in 2027" needs to see does not
      // touch an ordinary purchase. See the transfer.0.brackets provenance.
      ex: "ex_lttProvMb",
      tier: "provincial",
      kind: "brackets",
      brackets: [[30000, 0], [90000, 0.005], [150000, 0.01], [200000, 0.015], [null, 0.02]],
    },
    { key: "li_titleReg", ex: "ex_titleRegFlat", tier: "provincial", kind: "fixed", amount: 137 },
    // Winnipeg carried no mortgage registration line at all while Saskatoon and Calgary both
    // did, so every cross-city comparison was wrong in a systematic direction.
    { key: "li_mortReg", ex: "ex_titleRegFlat", tier: "provincial", kind: "fixed", amount: 137 },
  ],
  // Combined federal + provincial marginal rate, Manitoba 2026. The FALL above $400,000 is
  // real, not a transcription slip: Manitoba's basic-personal-amount clawback surcharge runs
  // from $200,001 and ends at $400,000. See types.ts — nothing reads this field yet.
  marginal: [
    [15780, 0], [16452, 0.108], [47000, 0.248], [58523, 0.2675], [100000, 0.3325],
    [117045, 0.379], [181440, 0.434], [200000, 0.4669], [258482, 0.4755],
    [400000, 0.5125], [null, 0.504],
  ],
  // Manitoba removed PST on CMHC premiums in 2020 — no premium-tax line renders here.
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_lttProv", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Manitoba Finance, Land Transfer Tax",
    rebate: "Manitoba Finance",
    market: "Winnipeg Regional Real Estate Board (WinnipegREALTORS®)",
  },
  provenance: {
    ...feesProvenance(fees),
    ...areaProvenance,
    "fees.setup": {
      conf: "assumption",
      note: "Derived, 2026-09-28: opening a Manitoba Hydro electricity or natural-gas account carries no published fee for a homeowner, and Manitoba Hydro takes security deposits only from new commercial customers. What a buyer can meet is contingent: Centra's gas reconnect fee ($70 + GST, if service was shut off) and optional furnace safety check ($50), per the Schedule of Sales and Transportation Services and Rates (Nov 1, 2025, PUB Order 138/25), plus a typical professional internet installation (~$150, Bell MTS's published standard fee, read from a search summary). ≈ $275, rounded up to $300 for an unconfirmed City water-account charge. The $3,000 this replaces matched no published charge and was very likely a dropped-zero typo of $300.",
    },
    "fees.statusCert": {
      conf: "assumption",
      note: "No statutory fee or cap: The Condominium Act, C.C.S.M. c. C170, s. 61 prescribes the status certificate (Form 8, M.R. 164/2014) and sets no fee; s. 53(3) allows only 'reasonable fees'. Market quotes run about $100–$200 (secondary).",
    },
    "propTax.publishedRate": {
      conf: "high",
      src: "City of Winnipeg Assessment and Taxation, 2026 Combined Mill Rates by School Division",
      asOf: "2026",
      url: MILL_RATES_URL,
      note: "DEFAULT DIVISION: Winnipeg School Division, 29.366 mills = the 2026 municipal rate (13.372) + the division's school rate (15.994); residential property pays no Education Support Levy (0.000 on the residential class). The reader can choose their own division — all eight are carried, from 25.223 mills (Pembina Trails) to 29.530 (Seven Oaks), about 14% apart. Caveat on the source: the PDF's page footer still reads 'Last updated: April 7, 2025' although its first table is headed 2026 MILL RATES; the City's property-tax-bills page independently confirms the 2026 municipal rate of 13.372 (+3.5% on 2025), so the footer is unmaintained, not the rates.",
    },
    "propTax.assessmentRatio": {
      conf: "high",
      src: "City of Winnipeg 2026 mill rate table, Portioned Percentage row: Residential Single-Family / Multi-Family / Condo = 45%, set by the Classification of Property and Portioned Values Regulation, M.R. 184/98, under The Municipal Assessment Act",
      asOf: "2026",
      url: "https://assessment.winnipeg.ca/Asmttax/pdfs/rates/HistoricalCombinedMillRates.pdf",
    },
    "propTax.effective": {
      conf: "high",
      src: "Derived: propTax.publishedRate x propTax.assessmentRatio",
      asOf: "2026",
      note: "0.029366 x 0.45 = 0.0132147 against market price, for the default division (each division's own rate is derived the same way). GROSS of the Homeowners Affordability Tax Credit, which propTax.credit nets off. Not modelled: the frontage levy, a separate line on the same bill at $6.95 per foot of frontage ($1.80 water main + $5.15 sewer main, City of Winnipeg Charter s. 432(1), last set 2023-04-20) — about $280–$350 a year on a 40–50 ft lot.",
    },
    "propTax.credit": {
      conf: "high",
      src: "Manitoba Municipal and Northern Relations, Bulletin #2026-08, Homeowners Affordability Tax Credit 2026; Manitoba Finance, Tax Assistance Office, HATC page",
      asOf: "2026-08",
      url: "https://www.gov.mb.ca/finance/tao/hatc.html",
      note: "'The amount of the HATC is the lesser of [$1,600 for 2026] and the gross school taxes on your principal residence', 'applied directly on municipal property tax statements'. Principal residences only — the case every page here models. A new owner declares their principal residence with the City (by March 15 for the following year's bill) or claims the credit on their income tax return. The cap binds above about $222,000 in Winnipeg School Division (1,600 / 0.0071973). Not modelled: the separate Seniors' School Tax Rebate. Unconfirmed: whether a condominium unit counts as a 'single residential dwelling' (the City's wording suggests it does). 2027: $1,700, reduced above $1,000,000 of assessment — re-check when the year rolls.",
    },
    "bench.house": {
      conf: "high",
      src: "Winnipeg Regional Real Estate Board, August 2026 market release, residential-detached AVERAGE price (not an MLS® HPI benchmark)",
      asOf: "2026-08",
      url: "https://www.winnipegregionalrealestatenews.com/market-statistics/market-releases/article/628/august-sees-the-highest-year-to-date-residential-detached-and-condominium-average-prices-on-record",
      note: "METRIC: an average. The board publishes averages and no MLS® HPI benchmark exists for Winnipeg — CREA's own board page for WRREB carries the release text and no HPI table. This is NOT the quantity Toronto, Vancouver, Calgary, Ottawa and Saskatoon hold (quality-constant MLS HPI benchmarks) nor the one Montreal holds (medians). An average is dragged by sales mix; a benchmark holds quality constant; a median is the middle sale. `bench` currently holds all three across the dataset, and choosing one metric for every record is a product decision, not a data fix. $439,216, released 2026-09-03 ('down 3% from last year'); it replaces July's $454,264, which matched that release to the dollar. A single month's average swings with sales mix — July to August moved $15,000.",
    },
    "bench.condo": {
      conf: "high",
      src: "Winnipeg Regional Real Estate Board, August 2026 market release, condominium AVERAGE price (not an MLS® HPI benchmark)",
      asOf: "2026-08",
      url: "https://www.winnipegregionalrealestatenews.com/market-statistics/market-releases/article/628/august-sees-the-highest-year-to-date-residential-detached-and-condominium-average-prices-on-record",
      note: "METRIC: an average — no MLS® HPI benchmark exists for Winnipeg, same caveat as bench.house. $283,715, +2% on August 2025, replacing July's $290,522.",
    },
    rent: {
      conf: "high",
      src: "CMHC Rental Market Survey, Winnipeg CMA, two-bedroom purpose-built apartment, reliability code a",
      asOf: "2025-10",
      note: "CMHC reports the average rent of the EXISTING OCCUPIED stock, which runs below asking rents for units actually turning over. October 2025 is the newest reference period CMHC publishes dollar levels for; the 2026 mid-year update is index-only.",
    },
    yoy: {
      conf: "medium",
      src: "Winnipeg Regional Real Estate Board, August 2026 market release: year-to-date (January–August) averages, detached $468,679 and condominium $288,834, each +3% on the same period of 2025",
      asOf: "2026-08",
      url: "https://www.winnipegregionalrealestatenews.com/market-statistics/market-releases/article/628/august-sees-the-highest-year-to-date-residential-detached-and-condominium-average-prices-on-record",
      note: "YEAR TO DATE, deliberately: the single-month figures disagree in sign (detached −3%, condo +2% in August; both +2% in July), and one field cannot hold two. The year-to-date change is the steadier measure and is the same for both. Whole percents, and a change in an AVERAGE, so part of any move is sales mix rather than price.",
    },
    marginal: {
      // An accounting firm's compilation, not CRA's or Manitoba's own bracket page: secondary.
      conf: "medium",
      src: "EY, Combined federal and provincial personal income tax rates — 2026, Manitoba (rates reflect budget proposals and news releases to 2026-01-15)",
      asOf: "2026-01-15",
      url: "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf",
      note: "Replaces a placeholder that was NON-MONOTONIC (bracket 2 sat below bracket 1, impossible for a progressive schedule) and used 2024 federal thresholds. The fall from 51.25% to 50.40% above $400,000 IS real: EY note 6 records that Manitoba's basic personal amount is clawed back on net income over $200,000 and fully eliminated at $400,000, adding ~0.85% between those points and dropping off above. Read by nothing today — marginalRate() is not yet ported — which is why this was corrected now rather than after it starts moving money.",
    },
    "transfer.0.brackets": {
      conf: "high",
      src: "Manitoba Finance, Land Transfer Tax",
      asOf: "2026",
      url: "https://www.gov.mb.ca/finance/other/print,landtransfertax.html",
      note: "Re-confirmed 2026-09-28 as an exact match to the published sliding scale. 2027: Bill 53, The Budget Implementation and Tax Statutes Amendment Act, 2026 (Royal Assent 2026-06-01, per MLT Aikins — the bill page leaves 'Assented to' blank) adds Part III.1, a tax on transfers of a BENEFICIAL interest in land (bare-trust arrangements) from 2027-01-01, using the same schedule. It does not change the rates or brackets for an ordinary registered purchase. Re-check when the 2027 budget lands.",
    },
    "transfer.1.amount": {
      conf: "high",
      src: "Teranet Manitoba, Land Titles Fees, item TR1 Transfer >30,000 Fee — $137.00 electronic, $144.00 paper",
      asOf: "2026-01-04",
      url: "https://teranetmanitoba.ca/wp-content/uploads/2025/09/2026-LTR-Fee-Schedule-Bareme-des-droits-LTR-2026-1.pdf",
      note: "130 -> 137. The record models ELECTRONIC registration, which is how a conveyance is filed in practice; paper is $144.",
    },
    "transfer.2.amount": {
      conf: "high",
      src: "Teranet Manitoba, Land Titles Fees, item MTGE Mortgage — $137.00 electronic, $144.00 paper",
      asOf: "2026-01-04",
      url: "https://teranetmanitoba.ca/wp-content/uploads/2025/09/2026-LTR-Fee-Schedule-Bareme-des-droits-LTR-2026-1.pdf",
      note: "A NEW line. Winnipeg charged no mortgage registration fee while Saskatoon and Calgary both did — an inconsistency between jurisdictions rather than a stale number, and so wrong in a systematic direction on every cross-city comparison. Flat in Manitoba, unlike Saskatchewan's stepped table and Alberta's per-value levy.",
    },
    "taxTime.0.amount": {
      conf: "high",
      src: "Federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal personal rate of 14%",
      asOf: "2026",
      url: "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf",
      note: "1500 -> 1400. The $1,500 it replaces was the same credit at a 15% lowest rate. Corroborated independently by Quebec's finance ministry, which lists the federal credit at $1,169 for a Quebec filer = $1,400 x 0.835 after the 16.5% abatement.",
    },
    premiumTax: {
      conf: "high",
      src: "Manitoba Finance, Taxation Division, Bulletin No. 061 (revised July 2020) and Notice RST 20-04: mortgage insurance and title insurance are exempt from RST from 2020-07-01",
      asOf: "2020-07",
      note: "null is correct: no provincial sales tax on the mortgage default insurance premium in Manitoba. The same exemption covers title insurance, so fees.titleIns carries no RST either.",
    },
  },
};
