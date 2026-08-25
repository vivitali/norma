import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { CATALOGUES } from "@/test/catalogues";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import type { Locale } from "@/lib/locales";

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
  ["Affordability", AffordabilityPage],
  ["ClosingCosts", ClosingCostsPage],
  ["DownPayment", DownPaymentPage],
  ["RrspHbp", RrspHbpPage],
  ["Amortization", AmortizationPage],
  ["RentVsBuy", RentVsBuyPage],
  ["Scenarios", ScenariosPage],
  ["Sources", SourcesContent],
] as const;

const LOCALES = Object.keys(CATALOGUES) as Locale[];

/**
 * The namespaces every page reads, whatever page it is: the chrome, the shared input
 * controls, and the place-name tables.
 */
const SHARED = ["AppHeader", "Nav", "Jurisdictions", "Provinces", "Inputs", "Disclosure", "Provenance"];

/**
 * A raw message key on the page. next-intl renders `Amortization.altText` verbatim when
 * a message is missing OR when its ICU cannot be formatted, and neither throws.
 *
 * Scoped to the namespaces the page under test actually renders, rather than all
 * seventeen, and that is not merely tidiness. `/sources` prints the verification notes
 * out of `src/domain` verbatim, and one of them discusses a message key by name —
 * federal.ts explains that the HBP's 90-day constant cannot be corrected to CRA's 89
 * without also editing `Metadata.rrspHbp.description`. That sentence is English prose,
 * not a leaked key, and a catch-all pattern reads it as a failure.
 */
const rawKeyPattern = (namespace: string) =>
  new RegExp(`\\b(${[namespace, ...SHARED].join("|")})\\.[a-zA-Z_]+`);

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
  it.each(PAGES)("%s", async (namespace, Page) => {
    const user = userEvent.setup();
    renderWithIntl(
      <JurisdictionProvider>
        <Page />
      </JurisdictionProvider>,
      { locale },
    );

    const expandAll = screen.queryAllByRole("button", { expanded: false });
    for (const button of expandAll) await user.click(button);

    const text = document.body.textContent ?? "";
    expect(text, `${locale}: raw message key`).not.toMatch(rawKeyPattern(namespace));
    expect(text, `${locale}: unformatted value`).not.toMatch(GARBAGE);
  });
});
