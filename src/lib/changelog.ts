import type { Country, Locale } from "@/i18n/countries";
import { localeProfile } from "@/lib/locales";
import type { RouteKey } from "@/lib/routes";

/**
 * What a reader would notice changed, newest first. Reader-visible changes only: a figure that
 * moved, a page that appeared, wording that was wrong. Never a refactor, a test or a CI change.
 *
 * ADDING AN ENTRY is one object here plus its message keys in all four `messages/*.json` under
 * the `"Changelog"` namespace (each item's `key`, and the release's `summary`). `changelog.test.ts` fails if a
 * key is missing from any catalogue, a link points at a route the release's countries do not
 * have, or a hash is not a registered section id of that route.
 *
 * Two releases may share a date (a day's work sorts into themes); the array order is the order
 * they are shown in, and dates never increase down the list.
 */
export interface ChangelogItem {
  /** Message key under `Changelog`. One short plain sentence. */
  key: string;
  /** The page, and optionally the section, this change is about. `hash` is a section id. */
  href?: { pathname: RouteKey; hash?: string };
}

export interface Release {
  /** Stable slug. Never reused, never edited after publishing. */
  id: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Which markets this concerns. */
  countries: readonly Country[];
  /** Jurisdiction ids it affects. Absent = everyone in `countries`. */
  jurisdictions?: readonly string[];
  /** Message key under `Changelog`: the release in a few words (<= ~60 characters), for the footer. */
  summary: string;
  items: readonly ChangelogItem[];
}

export const RELEASES: readonly Release[] = [
  {
    id: "2026-09-28-winnipeg",
    date: "2026-09-28",
    countries: ["ca"],
    jurisdictions: ["winnipeg"],
    summary: "sumWinnipegFees",
    items: [
      { key: "winnipegDivision", href: { pathname: "/affordability", hash: "comfort" } },
      { key: "winnipegTaxCredit", href: { pathname: "/affordability", hash: "comfort" } },
      { key: "winnipegSetupFee", href: { pathname: "/closing-costs", hash: "adjustments" } },
      { key: "winnipegPrices", href: { pathname: "/sources" } },
      { key: "winnipeg2027", href: { pathname: "/closing-costs", hash: "government" } },
      { key: "winnipegRegFee", href: { pathname: "/closing-costs", hash: "government" } },
    ],
  },
  {
    id: "2026-09-28-seattle",
    date: "2026-09-28",
    countries: ["us"],
    jurisdictions: ["seattle"],
    summary: "sumSeattle",
    items: [
      { key: "seattleAdded", href: { pathname: "/affordability" } },
      { key: "seattleSaleTax", href: { pathname: "/rent-vs-buy", hash: "wealth" } },
    ],
  },
  {
    id: "2026-09-28-clearer",
    date: "2026-09-28",
    countries: ["ca", "us"],
    summary: "sumClearer",
    items: [
      { key: "firstVisit" },
      { key: "adjustJump" },
      { key: "lowIncome", href: { pathname: "/affordability" } },
      { key: "mathReproduces", href: { pathname: "/affordability", hash: "math" } },
      { key: "closingLeads", href: { pathname: "/closing-costs" } },
      { key: "renewalControls", href: { pathname: "/amortization", hash: "renewal" } },
    ],
  },
  {
    id: "2026-09-28-tax-brackets",
    date: "2026-09-28",
    countries: ["ca"],
    summary: "sumTaxBrackets",
    items: [
      { key: "taxBrackets", href: { pathname: "/rrsp-hbp", hash: "refund" } },
      { key: "ukFont" },
    ],
  },
  {
    id: "2026-09-28-reading",
    date: "2026-09-28",
    countries: ["ca", "us"],
    summary: "sumReading",
    items: [
      { key: "sourcesReadable", href: { pathname: "/sources" } },
      { key: "keyboard" },
      { key: "clearNumbers" },
      { key: "homeExample", href: { pathname: "/" } },
    ],
  },
  {
    id: "2026-09-28-answers",
    date: "2026-09-28",
    countries: ["ca", "us"],
    summary: "sumAnswers",
    items: [
      { key: "lenderCap", href: { pathname: "/affordability" } },
      { key: "budgetLink", href: { pathname: "/affordability" } },
      { key: "rentDefault", href: { pathname: "/rent-vs-buy", hash: "verdict" } },
      { key: "noJump" },
      { key: "notFoundPage" },
      { key: "changelogPage", href: { pathname: "/changelog" } },
    ],
  },
  {
    id: "2026-09-28-rrsp-default",
    date: "2026-09-28",
    countries: ["ca"],
    summary: "sumRrspDefault",
    items: [{ key: "rrspDefault", href: { pathname: "/rrsp-hbp", hash: "refund" } }],
  },
  {
    id: "2026-09-28-costs-and-gap",
    date: "2026-09-28",
    countries: ["ca", "us"],
    summary: "sumCostsAndGap",
    items: [
      { key: "gapBand", href: { pathname: "/affordability", hash: "gap" } },
      { key: "closingWording", href: { pathname: "/closing-costs" } },
      { key: "dpNotEntered", href: { pathname: "/down-payment", hash: "waterfall" } },
      { key: "scenariosYourColumn", href: { pathname: "/scenarios", hash: "monthly" } },
    ],
  },
  {
    id: "2026-09-28-us-closing",
    date: "2026-09-28",
    countries: ["us"],
    summary: "sumUsClosing",
    items: [
      { key: "usWording", href: { pathname: "/closing-costs" } },
      { key: "loanTerm", href: { pathname: "/amortization" } },
    ],
  },
  {
    id: "2026-09-28-phones-and-fields",
    date: "2026-09-28",
    countries: ["ca", "us"],
    summary: "sumPhonesAndFields",
    items: [
      { key: "phoneHeader" },
      { key: "focusOutline" },
      { key: "numberFields", href: { pathname: "/amortization" } },
      { key: "secondApplicant", href: { pathname: "/affordability" } },
    ],
  },
  {
    id: "2026-09-07-us-wording",
    date: "2026-09-07",
    countries: ["us"],
    summary: "sumUsWording",
    items: [{ key: "usNoCanada" }],
  },
  {
    id: "2026-09-05-austin",
    date: "2026-09-05",
    countries: ["us"],
    jurisdictions: ["austin"],
    summary: "sumAustin",
    items: [{ key: "austin", href: { pathname: "/closing-costs" } }],
  },
  {
    id: "2026-09-05-us-launch",
    date: "2026-09-05",
    countries: ["ca", "us"],
    summary: "sumUsLaunch",
    items: [
      { key: "usMarket", href: { pathname: "/affordability" } },
      { key: "legalPages", href: { pathname: "/privacy" } },
    ],
  },
  {
    // Canada only: the /ca/ prefix was a migration Canadian readers lived through; US pages
    // launched under /us/ and never had the old addresses.
    id: "2026-09-05-addresses",
    date: "2026-09-05",
    countries: ["ca"],
    summary: "sumAddresses",
    items: [{ key: "countryAddresses" }],
  },
  {
    id: "2026-09-05-hbp-rule",
    date: "2026-09-05",
    countries: ["ca"],
    summary: "sumHbpRule",
    items: [{ key: "hbp89", href: { pathname: "/rrsp-hbp", hash: "rules" } }],
  },
  {
    id: "2026-08-29-model-fixes",
    date: "2026-08-29",
    countries: ["ca"],
    summary: "sumModelFixes",
    items: [
      { key: "renterCapital", href: { pathname: "/rent-vs-buy", hash: "wealth" } },
      { key: "rentComparable", href: { pathname: "/rent-vs-buy", hash: "verdict" } },
      { key: "hbpRefund", href: { pathname: "/rrsp-hbp", hash: "refund" } },
      { key: "showWork", href: { pathname: "/closing-costs", hash: "calc" } },
    ],
  },
  {
    id: "2026-08-28-down-payment",
    date: "2026-08-28",
    countries: ["ca"],
    summary: "sumDownPayment",
    items: [
      { key: "biggerDownPayment", href: { pathname: "/affordability" } },
      { key: "cashNeededAgrees", href: { pathname: "/down-payment", hash: "target" } },
    ],
  },
  {
    id: "2026-08-26-languages",
    date: "2026-08-26",
    countries: ["ca"],
    summary: "sumLanguages",
    items: [{ key: "ukSpanish", href: { pathname: "/" } }],
  },
  {
    id: "2026-08-25-transfer-tax",
    date: "2026-08-25",
    countries: ["ca"],
    jurisdictions: ["pe", "montreal", "yt", "nl"],
    summary: "sumTransferTax",
    items: [
      {
        key: "transferTaxCorrections",
        href: { pathname: "/closing-costs", hash: "government" },
      },
    ],
  },
  {
    id: "2026-08-25-verified",
    date: "2026-08-25",
    countries: ["ca"],
    summary: "sumVerified",
    items: [{ key: "verifiedFigures", href: { pathname: "/sources" } }],
  },
  {
    id: "2026-08-24-tool-pages",
    date: "2026-08-24",
    countries: ["ca"],
    summary: "sumToolPages",
    items: [
      { key: "toolPages", href: { pathname: "/closing-costs" } },
      { key: "frenchAddresses", href: { pathname: "/affordability" } },
    ],
  },
  {
    id: "2026-08-17-launch",
    date: "2026-08-17",
    countries: ["ca"],
    summary: "sumLaunch",
    items: [{ key: "launch", href: { pathname: "/affordability" } }],
  },
];

/** `2026-09-28` -> `20260928`. The form the reader's "last seen" is stored in. */
export function dateKey(iso: string): number {
  return Number(iso.replaceAll("-", ""));
}

/** Every release that concerns this country, newest first. */
export function releasesFor(country: Country): Release[] {
  return RELEASES.filter((r) => r.countries.includes(country));
}

/**
 * The newest release for this country that is relevant to this jurisdiction: one with no
 * `jurisdictions` (everyone) or one that names it. `undefined` when there is none.
 */
export function latestRelevant(country: Country, jurId: string): Release | undefined {
  return releasesFor(country).find((r) => !r.jurisdictions || r.jurisdictions.includes(jurId));
}

/** A release's date as the reader's locale writes it: "28 Sep 2026", "28 sept. 2026". */
export function formatReleaseDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeProfile(locale).intl, {
    day: "numeric",
    month: "short",
    year: "numeric",
    // The date is a calendar day, not an instant: never let the runtime's zone move it.
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
