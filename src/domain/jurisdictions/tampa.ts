import type { BracketTable, Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

/**
 * Tampa (Hillsborough County), Florida — the first record in a THIRD US state (Texas: Houston,
 * Austin; Washington: Seattle). Every figure's provenance cites the item number (A2, B1, D5, ...)
 * in `docs/superpowers/research/2026-10-25-us-florida-tampa-figures.md`; section D of that
 * dossier is the modelling spec for this file.
 *
 * Florida-specific shape decisions:
 * - Documentary stamp tax on the DEED is the seller's by the standard contract (dossier A5), so the
 *   buyer's stack carries it as a $0 explained line and the seller's side is `saleTax`, as
 *   Seattle's REET is. The mortgage's two taxes (doc stamps on the note, intangible tax) are the
 *   buyer's and are real `perValue` lines on the loan.
 * - Homestead exemption: $25,000 on every levy plus an additional indexed amount on NON-school
 *   levies only. `appliesToRate` slices must be exclusive, so the exemptions are split by SLICE
 *   (school / non-school), not by exemption (dossier D2).
 * - Amendment 3 (2026-11-03 ballot) would change the homestead exemption from 2027; it is pending
 *   and NOT modelled.
 */

const HCPA_MILLAGE = "Hillsborough County Property Appraiser, \"Final 2025\" millage sheet (City of Tampa district TA)";
const HCPA_MILLAGE_URL = "https://www.hcpafl.org/Portals/HCPAFL/pdfs/2025FinalMillage.pdf?ver=2025-10-06-114623-490";
const STAR = "Hillsborough STAR (Stellar MLS data, Florida Realtors), \"Hillsborough County Monthly Statistics,\" August 2026 (released 2026-09-16)";
const STAR_URL = "https://pinellasrealtor.org/wp-content/uploads/2026/09/Hillsborough-STAR-Monthly-Statistics-August-2026.pdf";
const HUD_FMR = "HUD, FY2027 Fair Market Rents, Tampa-St. Petersburg-Clearwater, FL MSA";
const HUD_FMR_URL = "https://www.huduser.gov/portal/datasets/fmr/fmr2027/FY2027_FMR_Schedule.pdf";
const FL_DOR_HOMESTEAD = "Florida Department of Revenue, \"Additional Homestead Exemption Adjustment,\" revised January 2026";
const FL_DOR_HOMESTEAD_URL = "https://www.floridarevenue.com/property/Documents/cpi_homestead_exemption.pdf";
const FL_STAT_201_02 = "Florida Legislature, Fla. Stat. s.201.02 (documentary stamp tax on deeds), 2026";
const FL_STAT_201_02_URL = "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.02.html";
const FL_STAT_201_08 = "Florida Legislature, Fla. Stat. s.201.08 (documentary stamp tax on notes and mortgages), 2026";
const FL_STAT_201_08_URL = "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.08.html";
const FL_STAT_199_133 = "Florida Legislature, Fla. Stat. s.199.133 (nonrecurring intangible tax), 2026";
const FL_STAT_199_133_URL = "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0199/Sections/0199.133.html";
const FR_BAR = "Florida Realtors and The Florida Bar, \"AS IS\" Residential Contract for Sale and Purchase (ASIS-7, Rev. 7/24), paragraph 9";
const FR_BAR_URL =
  "https://www.floridarealtors.org/sites/default/files/2024-12/AS%20IS%20Residential%20Contract%20for%20Sale%20and%20Purchase%20(FloridaRealtors-FloridaBar-ASIS-7)%20Redline%20(1).pdf";
const OIR_TITLE = "Florida Office of Insurance Regulation, Fla. Admin. Code r. 69O-186.003 and 69O-186.005 (promulgated title insurance rates)";
const OIR_TITLE_URL = "https://www.flrules.org/gateway/ruleNo.asp?id=69O-186.003";
const HILLS_CLERK = "Hillsborough County Clerk of Court & Comptroller, \"Fees and Fines\" (recording services)";
const HILLS_CLERK_URL = "https://hillsclerk.com/about-us/fees-and-fines";
const CITIZENS =
  "Citizens Property Insurance Corporation, \"Recommended Rate Filing Executive Summary,\" 2025-12-10 (Exhibit 4, multiperil HO-3, Hillsborough)";
const CITIZENS_URL =
  "https://www.citizensfla.com/documents/20702/39142684/20251210+03Ba+2026+Recommended+Rate+Filing-+combined.pdf/d22e03e1-d36e-3574-cbf5-278d80043b2f?t=1765369714748";

/**
 * Florida's PROMULGATED owner's title-insurance premium, Fla. Admin. Code r. 69O-186.003(1)(a),
 * as marginal bands for `bracketTax()`: $5.75 per $1,000 to $100,000, +$5.00 to $1M, +$2.50 to
 * $5M, +$2.25 to $10M, +$2.00 above. Rates are FRACTIONS of liability (0.00575 = $5.75 per
 * $1,000). The record's `fees.titleIns` is NOT this premium (the Hillsborough seller customarily
 * pays the owner's policy); the table is exported for tests only, as Houston's TX table is.
 */
export const FL_TITLE_INSURANCE_BRACKETS: BracketTable = [
  [100000, 0.00575],
  [1000000, 0.005],
  [5000000, 0.0025],
  [10000000, 0.00225],
  [null, 0.002],
];

const fees: JurisdictionFees = {
  // The buyer's own closing-services fee (FR/BAR para. 9: each party bears its own). Midpoint of the
  // $300-$800 range lender and realtor blogs cite; not promulgated (dossier A9, D5).
  lawyer: 550,
  // The buyer's lender's-policy costs, since the Hillsborough seller customarily pays the owner's
  // policy (dossier D5): $25 simultaneous-issue lender's policy + Florida Form 9 at 10% of
  // ($2,174.50 owner's premium + $25) = $219.95, rounded to $220 + ALTA 8.1 at the $25 rule
  // minimum = $270. Owner's premium at $419,900: 100 x $5.75 + 319.9 x $5.00 = $2,174.50.
  titleIns: 270,
  inspect: 450,
  appraisal: 600,
  // FR/BAR lists survey as a BUYER cost; no Florida fee schedule exists, so Houston's default.
  survey: 500,
  // Hillsborough Clerk: $10.00 first page + $8.50 each additional page. A 3-page deed
  // ($10 + 2 x $8.50 = $27.00) plus an 18-page mortgage ($10 + 17 x $8.50 = $154.50) = $181.50.
  recording: 181.5,
  moving: 1500,
  setup: 250,
};

export const tampa: Jurisdiction = {
  id: "tampa",
  country: "us",
  state: "FL",
  city: "tampa",
  cityData: true,
  verified: "2026-10-25",
  pro: "titleCompany",
  // HUD FY2027 metro-wide 2BR FMR, Tampa-St. Petersburg-Clearwater MSA (dossier B3).
  rent: 1917,
  rentBasis: "fmr2br",
  // Hillsborough single-family median -0.8% YoY (Aug 2026 $419,900 vs $423,450), the same table
  // `bench.house` reads (dossier B2). A FRACTION.
  yoy: -0.008,
  bench: {
    // MEDIANS (Hillsborough STAR also prints averages), Hillsborough COUNTY, not City of Tampa.
    house: 419900,
    condo: 279000,
  },
  propTax: {
    // 2025 FINAL millage, City of Tampa district TA: 19.8428 mills = $19.8428 per $1,000 of taxable
    // value = a FRACTION of 0.0198428 (19.8428 / 1,000; per $1,000, NOT per $100 as in Texas).
    effective: 0.0198428,
    publishedRate: 0.0198428,
    // The full price is taxed: an appraiser's just value may sit below it (s.193.011(8), dossier
    // B6), which can only overstate the bill.
    assessmentRatio: 1,
    basis: "market",
    // Slices are EXCLUSIVE and sum to `effective` (6.3400 + 13.5028 = 19.8428 mills). Florida's first
    // $25,000 applies to every levy and the additional indexed amount ($26,411 in 2026) to NON-school
    // levies only, so the school slice carries $25,000 and the non-school slice $25,000 + $26,411.
    exemptions: [
      {
        kind: "flatAmount",
        amount: 25000,
        // School slice: 6.3400 mills = 0.0063400 as a fraction (Local 3.2480 + State 3.0920).
        appliesToRate: 0.00634,
        note: "The first $25,000 of homestead exemption applies to the school levy, the only exemption school taxes get (Constitution Art. VII s.6(a)(1)a).",
      },
      {
        kind: "flatAmount",
        amount: 51411,
        // Non-school slice: 13.5028 mills = 0.0135028 as a fraction.
        appliesToRate: 0.0135028,
        note: "Every other levy gets the first $25,000 plus the additional exemption, $26,411 for 2026 (DOR's inflation-indexed amount): $51,411 in total. The additional amount is really a band on value above $50,000; modelled flat, which only matters below $76,411.",
      },
    ],
  },
  // Buyer side, tier "provincial" = state. The deed's documentary stamp tax is the SELLER's by the
  // standard contract (dossier A5), shown as an explained $0 line. The mortgage's two taxes are the
  // buyer's: documentary stamps $0.35 per $100 or fraction of the loan (no cap on a recorded
  // mortgage, A3) and the 2-mill intangible tax per dollar (A4).
  transfer: [
    { kind: "fixed", key: "li_docStampsDeed", ex: "ex_docStampsDeedSeller", tier: "provincial", amount: 0 },
    { kind: "perValue", key: "li_docStampsNote", ex: "ex_flLoanTaxes", tier: "provincial", base: 0, per: 0.35, unit: 100, on: "loan" },
    { kind: "perValue", key: "li_intangibleTax", ex: "ex_flLoanTaxes", tier: "provincial", base: 0, per: 0.002, unit: 1, on: "loan" },
  ],
  // The SELLER's deed stamps at the horizon: $0.70 per $100 = 0.007 of the price. `flat` drops the
  // statute's round-up to the next $100, an error of at most $0.70 (dossier D4).
  saleTax: [{ kind: "flat", key: "li_docStampsDeed", ex: "ex_docStampsDeedSeller", tier: "provincial", rate: 0.007 }],
  premiumTax: null,
  rebates: [],
  taxTime: [],
  fees,
  // Citizens Property Insurance average HO-3 premium, Hillsborough (dossier A10, D6).
  insurance: 2918,
  orgs: {
    transfer: "Florida Department of Revenue",
    muni: "Hillsborough County Property Appraiser · Hillsborough County Clerk of Court & Comptroller · City of Tampa · Florida Department of Revenue",
    market: "Hillsborough STAR (Stellar MLS, Florida Realtors)",
  },
  provenance: {
    ...feesProvenance(fees),
    "fees.lawyer": {
      conf: "assumption",
      note: "$550 is the midpoint of the $300-$800 range lender and realtor blogs cite for a Tampa-area closing-services fee (dossier A9, D5). Florida does not promulgate it: only the title risk premium is regulated, and each party bears its own closing-services fee (FR/BAR contract para. 9).",
      summary: "$550 is a default we chose, the midpoint of the $300 to $800 that Tampa-area blogs quote for a buyer's closing-services fee. Florida regulates only the title premium, not this fee.",
    },
    "fees.titleIns": {
      conf: "assumption",
      asOf: "2002-01-27",
      src: OIR_TITLE,
      url: OIR_TITLE_URL,
      note: "$270 is the buyer's lender-side title cost at the $419,900 benchmark (dossier D5): $25 simultaneous-issue lender's policy (69O-186.003(5)(a)) + Florida Form 9 at $220 (10% of the $2,174.50 owner's premium plus $25) + ALTA 8.1 at the $25 rule minimum. The Hillsborough seller customarily pays the owner's policy (medium, one law-firm article). Which endorsements a lender requires is not published, and the rule is ambiguous on whether its $100 per-endorsement maximum bounds Form 9; the 10% reading is the higher one. A flat figure that does not scale with price.",
      summary: "$270 for the lender's side of title insurance: a $25 lender's policy, about $220 for the Florida Form 9 endorsement and $25 for one more. The Tampa-area seller customarily pays the owner's policy. Which endorsements a lender requires is not published, so this is an estimate.",
    },
    "fees.inspect": {
      conf: "assumption",
      note: "$450 — the same nationwide modelling default the other US records carry; inspection fees are not state-specific and were not researched here.",
      summary: "$450 is a default we chose, the same one used for the other US cities. Nobody publishes one.",
    },
    "fees.appraisal": {
      conf: "assumption",
      note: "$600 — the same modelling default Seattle carries; appraisal fees are lender-driven, not state-specific, and were not researched here.",
      summary: "$600 is a default we chose because lenders set appraisal fees and nobody publishes them.",
    },
    "fees.survey": {
      conf: "assumption",
      asOf: "Rev. 7/24",
      src: FR_BAR,
      url: FR_BAR_URL,
      note: "$500 — Houston's default. The Florida contract lists the survey as a BUYER cost (para. 9(b), dossier A5, D5) but no Florida fee schedule exists, so the amount is an assumption.",
      summary: "The standard Florida contract makes the survey a buyer cost, but nobody publishes a price. $500 is a default we chose.",
    },
    "fees.recording": {
      conf: "assumption",
      asOf: "2026-10-25",
      src: HILLS_CLERK,
      url: HILLS_CLERK_URL,
      note: "Hillsborough's Clerk charges $10.00 for the first page and $8.50 for each additional page (dossier B4, read directly, high). $181.50 models a 3-page deed ($27.00) plus an 18-page mortgage ($154.50); the page counts are this record's own estimate carried over from Seattle, so the combined figure is graded assumption even though the per-page fees are high.",
      summary: "Hillsborough's Clerk charges $10.00 to record the first page and $8.50 for each additional one. $181.50 is our estimate for a 3-page deed plus an 18-page mortgage; the page counts are our assumption.",
    },
    "fees.moving": {
      conf: "assumption",
      note: "$1,500 — the same modelling default the other US records carry; no Tampa mover cost was researched, and no authority publishes one.",
      summary: "$1,500 is a default we chose. Nobody publishes a Tampa moving cost.",
    },
    "fees.setup": {
      conf: "assumption",
      note: "$250 — the same modelling default the other US records carry; Tampa utility account-opening charges were not researched.",
      summary: "$250 is a default we chose for utility account setup. We did not research Tampa's own utility charges.",
    },
    insurance: {
      conf: "medium",
      asOf: "2025-04-30 (in force)",
      src: CITIZENS,
      url: CITIZENS_URL,
      note: "$2,918/year is Citizens Property Insurance's average multiperil HO-3 premium for Hillsborough County across 22,882 policies in force on 2025-04-30 (dossier A10, D6). Citizens-only — the insurer of last resort, not a market average — and it predates the July 2026 rate change. It INCLUDES wind and EXCLUDES flood, which is a separate policy. For context, the Office of Insurance Regulation's statewide admitted-market average including wind is $3,736-$3,757.",
      summary: "$2,918 a year is the average premium Citizens, Florida's insurer of last resort, charged for a standard homeowners policy in Hillsborough County in April 2025. It covers wind but not flood, and is not a market average.",
    },
    "transfer.0": {
      conf: "medium",
      asOf: "Rev. 7/24",
      src: FR_BAR,
      url: FR_BAR_URL,
      note: "$0 to the buyer by design. The documentary stamp tax on the deed is $0.70 per $100 of the price (Fla. Stat. s.201.02(1)(a), dossier A2, high), but the standard Florida purchase contract has the SELLER pay it (para. 9(a), dossier A5). Who pays is a contract allocation, not statute, and the parties may change it. Graded medium because the contract was read as the 12/2024 redline; the current revision was not readable. The seller's side is `saleTax` on this record and Rent vs Buy deducts it at the sale.",
      summary: "You pay $0 in deed stamp tax when buying: the standard Florida contract makes the seller pay it, though buyer and seller can agree otherwise. Rent vs Buy deducts it when you sell. We read an earlier edition of the contract, not the newest.",
    },
    "transfer.1": {
      conf: "high",
      asOf: "2026",
      src: FL_STAT_201_08,
      url: FL_STAT_201_08_URL,
      note: "Documentary stamp tax on the mortgage: 35 cents on each $100 or fraction thereof of the debt (s.201.08(1)(b), dossier A3), as 0.35 per unit of 100 rounded up. The $2,450 cap sits in the paragraphs for stand-alone and retail-charge notes, not the one for recorded mortgages, so none is applied (a reading of the statute's structure). The buyer's, per the contract's \"taxes and recording fees on notes and mortgages\" (dossier A5).",
      summary: "Florida charges 35 cents per $100 of your mortgage, rounded up to the next $100. The $2,450 cap applies to other kinds of notes, not to a recorded home mortgage. The standard contract puts it on the buyer.",
    },
    "transfer.2": {
      conf: "high",
      asOf: "2026",
      src: FL_STAT_199_133,
      url: FL_STAT_199_133_URL,
      note: "One-time nonrecurring intangible tax of 2 mills per dollar, as a fraction 0.002 of the mortgage-secured note (s.199.133(1), dossier A4). Per dollar, with no rounding to $100. The buyer's, on the same contract line as the mortgage stamps (dossier A5).",
      summary: "A one-time Florida tax of $2 per $1,000 borrowed, or 0.2% of your mortgage. The standard contract puts it on the buyer.",
    },
    "saleTax.0": {
      conf: "high",
      asOf: "2026",
      src: FL_STAT_201_02,
      url: FL_STAT_201_02_URL,
      note: "Documentary stamp tax on the SELLER's deed: 70 cents on each $100 of consideration (s.201.02(1)(a), dossier A2), as 0.007 of the sale price. Modelled flat, which drops the statute's round-up to the next $100: at most $0.70 on any sale.",
      summary: "When you sell, Florida's deed stamp tax is 70 cents per $100 of the price, 0.7%, and the seller pays it. The real tax rounds up to the next $100; we don't, a difference of under a dollar.",
    },
    "propTax.effective": {
      conf: "high",
      asOf: "2025 final millage (tax year 2025)",
      src: HCPA_MILLAGE,
      url: HCPA_MILLAGE_URL,
      note: "19.8428 mills = $19.8428 per $1,000 of taxable value, i.e. a fraction of 0.0198428 (dossier B1): county 6.0795 + school 6.3400 + Port 0.0737 + HART 0.5000 + Children's Board 0.4589 + SWFWMD 0.1831 + City of Tampa 6.2076, cross-footed. This is the 2025 FINAL rate: the 2026 sheet is not yet posted, and the City (6.2076) and SWFWMD (0.1831) 2026 rates are unchanged. District TA only; other cities and unincorporated areas differ. The full price is taxed (assessment ratio 1), which errs high because an appraiser's just value can sit below the price after costs of sale (s.193.011(8), dossier B6).",
      summary: "Tampa's 2025 final property tax rate: $19.8428 per $1,000 of taxable value, summed from the county, school, transit, port, water district, Children's Board and City levies. The 2026 sheet isn't posted yet. We tax the full price, which can only overstate the bill.",
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2025 final millage (tax year 2025)",
      src: HCPA_MILLAGE,
      url: HCPA_MILLAGE_URL,
      note: "Same as propTax.effective, 0.0198428 as a fraction (19.8428 mills): the record taxes the full price, so the published and effective rates are one number (dossier D1).",
      summary: "The same rate, $19.8428 per $1,000, since the full price is taxed.",
    },
    "propTax.exemptions": {
      conf: "high",
      asOf: "2026-01 (DOR indexed amount)",
      src: FL_DOR_HOMESTEAD,
      url: FL_DOR_HOMESTEAD_URL,
      note: "Florida's homestead exemption is $25,000 on every levy plus an additional amount on non-school levies only, indexed to inflation: $26,411 for 2026 (dossier A6). Slices are exclusive, so the school slice (6.3400 mills) takes $25,000 and the non-school slice (13.5028 mills) takes $25,000 + $26,411 = $51,411. The additional exemption is really a band on value above $50,000, modelled flat (it matters only below $76,411). Jan-1 rule: only the owner on January 1 qualifies, so a first-year bill is the prior owner's and homestead starts the next January, after reassessment to just value. Save Our Homes caps FUTURE growth only, not the first assessed value. Amendment 3 on the 2026-11-03 ballot would raise the non-school amount from 2027; it is pending and NOT modelled.",
      summary: "Florida exempts the first $25,000 of a home's value from every tax and, for non-school taxes, an additional $26,411 in 2026. Only the owner on January 1 qualifies, so your first bill is usually the previous owner's. A November 3 ballot measure on the exemption isn't counted.",
    },
    "propTax.exemptions.0": {
      conf: "high",
      asOf: "2026",
      src: "Florida Constitution, Art. VII s.6(a)(1)a and Fla. Stat. s.196.031(1)(a)",
      url: "http://www.leg.state.fl.us/statutes/index.cfm?Mode=Constitution&Submenu=3&Tab=statutes",
      note: "School slice: the first $25,000 of assessed value is exempt from every levy, school taxes included (dossier A6; DOR guide PT-113).",
      summary: "The first $25,000 of exemption is the only one school taxes get.",
    },
    "propTax.exemptions.1": {
      conf: "high",
      asOf: "2026-01 (DOR indexed amount)",
      src: "Florida Department of Revenue, guide PT-113 (R. 08/25), homestead exemption",
      url: "https://floridarevenue.com/property/Documents/pt113.pdf",
      note: "Non-school slice: $25,000 + the 2026 indexed additional $26,411 = $51,411 (dossier A6, D2), on levies other than school district levies.",
      summary: "Every other tax gets that $25,000 plus the extra indexed amount.",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-08",
      src: STAR,
      url: STAR_URL,
      note: "MEDIAN, not an average: Hillsborough COUNTY single-family median sale price $419,900, August 2026, -0.8% from $423,450 (dossier B2). County, not City of Tampa: no REALTOR association publishes a city figure. Fetched directly from the publisher's PDF.",
      summary: "The August 2026 median price for a single-family home in Hillsborough County, $419,900, down 0.8% on a year earlier, from Hillsborough STAR. A median, covering the county rather than just Tampa.",
    },
    "bench.condo": {
      conf: "high",
      asOf: "2026-08",
      src: STAR,
      url: STAR_URL,
      note: "MEDIAN, not an average: Hillsborough COUNTY townhouse and condo median sale price $279,000, August 2026, +2.2% from $273,000 (dossier B2). Fetched directly from the publisher's PDF.",
      summary: "The August 2026 median price for a Hillsborough County townhouse or condo, $279,000, up 2.2% on a year earlier.",
    },
    rent: {
      conf: "high",
      asOf: "2026-10-01",
      src: HUD_FMR,
      url: HUD_FMR_URL,
      note: "HUD FY2027 Fair Market Rent, 2-bedroom, metro-wide for the Tampa-St. Petersburg-Clearwater, FL MSA: $1,917 (dossier B3), read directly off HUD's national FY2027 schedule PDF. The area is Small-Area-FMR mandatory; the metro-wide row is used, as for Houston and Seattle. It spans Hernando, Hillsborough, Pasco and Pinellas counties.",
      summary: "HUD's FY2027 Fair Market Rent for a two-bedroom in the Tampa-St. Petersburg-Clearwater area, $1,917. As elsewhere, we use the metro-wide figure rather than a ZIP-code one.",
    },
    yoy: {
      conf: "high",
      asOf: "2026-08",
      src: STAR,
      url: STAR_URL,
      note: "Hillsborough single-family median -0.8% year over year, as a fraction -0.008 (dossier B2) — the same table bench.house reads.",
      summary: "The Hillsborough County single-family median price fell 0.8% year over year (August 2026), from the same table as the price above.",
    },
    "orgs.transfer": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution.", summary: "Not a figure: this only names the organisations cited as sources." },
    "orgs.muni": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution.", summary: "Not a figure: this only names the organisations cited as sources." },
    "orgs.market": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution.", summary: "Not a figure: this only names the organisations cited as sources." },
  },
};
