import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { CATALOGUES, leafPaths, type Tree } from "@/test/catalogues";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { routing } from "@/i18n/routing";
import { countryOf, type Locale } from "@/i18n/countries";
import { ROUTE_COUNTRIES, type RouteKey } from "@/lib/routes";

import { HomeContent } from "@/components/home-content";
import { AppHeader } from "@/components/app-header";
import { ThemeProvider } from "@/components/theme-provider";
import AffordabilityPage from "./[locale]/affordability/page";
import ClosingCostsPage from "./[locale]/closing-costs/page";
import DownPaymentPage from "./[locale]/down-payment/page";
import RrspHbpPage from "./[locale]/rrsp-hbp/page";
import AmortizationPage from "./[locale]/amortization/page";
import RentVsBuyPage from "./[locale]/rent-vs-buy/page";
import ScenariosPage from "./[locale]/scenarios/page";
// The Sources ROUTE is a server component taking params; its body is this client
// component, which is what the route's own test renders too.
import { SourcesContent } from "@/components/sources-content";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const PAGES = [
  // Home first, and it is not a formality: it is the URL every inbound link lands on, and
  // the only page whose copy is also emitted as FAQPage structured data — so a message
  // that fails to format there reaches a machine that strips the surrounding context.
  // `home-content.test.tsx` renders it in en and fr only.
  ["Home", HomeContent],
  // The chrome. `AppHeader` and `Nav` are in SHARED below, but no page component here
  // mounts them, so without this entry those 17 keys were never rendered in uk or es at
  // all — the namespaces were exempted from the check by being named in it.
  ["AppHeader", AppHeader],
  ["Affordability", AffordabilityPage],
  ["ClosingCosts", ClosingCostsPage],
  ["DownPayment", DownPaymentPage],
  ["RrspHbp", RrspHbpPage],
  ["Amortization", AmortizationPage],
  ["RentVsBuy", RentVsBuyPage],
  ["Scenarios", ScenariosPage],
  ["Sources", SourcesContent],
] as const;

// A per-ROUTE check (this renders every page route) iterates the actual `Locale`
// pairs from routing.ts, not the language-keyed CATALOGUES registry: rendering
// "es" would ask renderWithIntl for a locale that does not exist since the CA
// route migration. See src/i18n/countries.ts and src/test/catalogues.ts.
const LOCALES = routing.locales;

/**
 * The route each page namespace above renders, for the ones ROUTE_COUNTRIES
 * restricts. Home, AppHeader and Sources are omitted deliberately: Home and
 * AppHeader are chrome rather than a single route, and every route in
 * ROUTE_COUNTRIES that DOES restrict something is covered by naming it here —
 * an entry missing from this map is simply assumed to exist in every country,
 * which is true of every route except RRSP-HBP today.
 *
 * This test mounts `page.tsx` directly rather than going through `layout.tsx`
 * (where `assertRouteAvailable` lives), so it never sees the 404 a real request
 * would get — it would otherwise crash instead, the way RRSP-HBP does reading
 * `rules.hbp` on `CountryRules` for `"us"`, which has no such field. Skipping
 * the pair here is the render test's analogue of the layout's guard.
 */
const PAGE_ROUTES: Partial<Record<string, RouteKey>> = {
  Affordability: "/affordability",
  ClosingCosts: "/closing-costs",
  DownPayment: "/down-payment",
  RrspHbp: "/rrsp-hbp",
  Amortization: "/amortization",
  RentVsBuy: "/rent-vs-buy",
  Scenarios: "/scenarios",
};

/**
 * The namespaces every page reads, whatever page it is: the chrome, the shared input
 * controls, and the place-name tables.
 */
const SHARED = [
  "AppHeader",
  "Countries",
  "Nav",
  "Jurisdictions",
  "Provinces",
  "Inputs",
  "Disclosure",
  "Provenance",
];

/**
 * The exact key paths that could leak on this page — not a pattern that looks like one.
 *
 * next-intl renders `Amortization.altText` verbatim when a message is missing OR when its
 * ICU cannot be formatted, and neither throws. The obvious check is a regex like
 * `/\b(Nav|Inputs|...)\.\w+/`, and it is worse than useless: `textContent` concatenates
 * adjacent elements with no separator, so a leaked key arrives glued to the text before
 * it — "AffordMath" + "Nav.menu" — and `\b` finds no boundary between `h` and `N`. That
 * version of this test passed with `Nav.menu` deleted from the catalogue.
 *
 * Matching the real key list instead is exact in both directions: every leak is caught
 * wherever it lands, and nothing that merely looks like a key is.
 *
 * Still scoped to the namespaces the page under test renders, for a reason the pattern
 * shares: `/sources` prints the verification notes out of `src/domain` verbatim, and one
 * of them (federal.ts, on the HBP's 89-day period and why the fix touched
 * `Metadata.rrspHbp.description` alongside the constant) names that key in prose. That is
 * English text, not a leaked key, and `Metadata` is not a namespace any page body renders.
 */
function leakableKeys(namespace: string): string[] {
  const tree = CATALOGUES.en as Tree;
  return [namespace, ...SHARED].flatMap((ns) =>
    ns in tree ? leafPaths(tree[ns] as Tree).map((path) => `${ns}.${path}`) : [],
  );
}

/** Rendered figures that are not numbers — a missing ICU argument shows up here too. */
const GARBAGE = /NaN|Infinity|\bundefined\b|\[object Object\]/;

beforeEach(() => window.localStorage.clear());

/**
 * Every page, in every locale, with every section open.
 *
 * The suite already renders each page in English and spot-checks French, which was
 * enough while French was the only translation and was written alongside the English.
 * It is not enough now. Two failures are invisible to every other test here:
 *
 * 1. **ICU that only one locale has.** Ukrainian has four plural categories where English
 *    has two, so several Ukrainian messages carry `{n, plural, one/few/many/other}` where
 *    the English carries a bare `{n}`. The placeholder-parity check in messages.test.ts
 *    sees the same argument NAME in both and passes. Only rendering it proves it formats.
 * 2. **A namespace that resolves for one locale and not another.** A missing message is
 *    not an exception — it is the key path, printed at whatever size the copy sat at.
 *
 * Sections are expanded first because a collapsed panel hides its own copy, which is
 * exactly where an unrendered key survives review.
 */
describe.each(LOCALES)("every page renders in %s", (locale) => {
  const country = countryOf(locale as Locale);
  // Skip a page whose route ROUTE_COUNTRIES excludes from this locale's country — the
  // real request 404s via `assertRouteAvailable` in the route's layout before this
  // component ever mounts (see PAGE_ROUTES above).
  const availablePages = PAGES.filter(([namespace]) => {
    const route = PAGE_ROUTES[namespace];
    return !route || ROUTE_COUNTRIES[route].includes(country);
  });

  it.each(availablePages)("%s", async (namespace, Page) => {
    const user = userEvent.setup();
    renderWithIntl(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>
      </ThemeProvider>,
      { locale },
    );

    const expandAll = screen.queryAllByRole("button", { expanded: false });
    for (const button of expandAll) await user.click(button);

    const text = document.body.textContent ?? "";
    const leaked = leakableKeys(namespace).filter((key) => text.includes(key));
    expect(leaked, `${locale}: message keys rendered verbatim`).toEqual([]);
    expect(text, `${locale}: unformatted value`).not.toMatch(GARBAGE);
  });
});
