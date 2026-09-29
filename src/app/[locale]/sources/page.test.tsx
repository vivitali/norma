import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { SourcesContent } from "@/components/sources-content";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

// Read from the project root: Vite rewrites import.meta.url during transform.
const source = readFileSync("src/app/[locale]/sources/page.tsx", "utf8");

describe("/sources route", () => {
  it("calls setRequestLocale, or it silently becomes dynamic", () => {
    // The exact omission that costs a prerender. scripts/verify-prerender
    // catches it too, but only after a full build; this fails in two seconds.
    expect(source).toContain("setRequestLocale(locale)");
  });

  it("does not reach for useSearchParams", () => {
    expect(source).not.toContain("useSearchParams");
  });
});

const render = (locale: Locale = "en-CA") =>
  renderWithIntl(
    <JurisdictionProvider>
      <SourcesContent />
    </JurisdictionProvider>,
    { locale },
  );

const openEverySection = async (user: ReturnType<typeof userEvent.setup>) => {
  for (const button of screen.getAllByRole("button", { expanded: false })) {
    if (button.hasAttribute("aria-controls")) await user.click(button);
  }
};

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("SourcesContent", () => {
  it("explains both marks, at the ids the marks link to", () => {
    render();
    expect(document.getElementById("rule")).toBeInTheDocument();
    expect(document.getElementById("estimate")).toBeInTheDocument();
  });

  it("teaches every confidence mark, including the two that are not failures", () => {
    // "Assumption" and "Not published" MUST read differently: one is a default we
    // chose, the other is a quantity nobody publishes and we refuse to invent.
    // The whole provenance design turns on the distinction being legible.
    render();
    // Scoped to the legend: the same words are marks on the entries themselves,
    // which is the point of teaching them here.
    const legend = within(screen.getByRole("region", { name: "What the confidence marks mean" }));
    for (const label of ["Confirmed", "Probable", "Weak", "Assumption", "Not published"]) {
      expect(legend.getByText(label)).toBeVisible();
    }
    expect(legend.getByText(/we chose a default and say so/)).toBeVisible();
    expect(legend.getByText(/we will not invent one/)).toBeVisible();
  });

  it("counts the coverage rather than asserting it", () => {
    // The standing footer line claims most figures now name a published source.
    // The count that has to hold for that is on the page, derived from the same
    // records — not a number anybody typed.
    render();
    expect(
      screen.getByText(/Across 14 jurisdictions and the federal rules, \d+ figures/),
    ).toBeVisible();
  });

  it("groups the inventory by the kind of figure, federal first", () => {
    render();
    const names = [
      "Federal rules",
      "Transfer tax and registration",
      "Rebates and credits",
      "Property tax",
      "Prices and rents",
      "Professional and moving costs",
    ];
    for (const name of names) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("opens exactly one group on arrival, and it is a jurisdiction group", () => {
    // The gesture is performed once for the reader, on whatever this
    // jurisdiction is worst at — an inventory that greets you with its best work
    // is doing the opposite of its job.
    render();
    const open = screen.getAllByRole("button", { expanded: true });
    expect(open).toHaveLength(1);
    expect(open[0].textContent).not.toMatch(/Federal rules/);
  });

  it("names real documents, with their dates and their links", async () => {
    const user = userEvent.setup();
    render();
    await openEverySection(user);
    // Federal: read off OSFI and CMHC, which the old page could only claim the
    // SHAPE of its rules followed.
    expect(screen.getByText(/OSFI, Minimum qualifying rate for uninsured mortgages/)).toBeVisible();
    expect(screen.getByText(/CMHC, Calculating GDS \/ TDS/)).toBeVisible();
    // Winnipeg, the default jurisdiction: the mill rate, its date, and its PDF.
    const mill = screen.getByRole("link", {
      name: /City of Winnipeg Assessment and Taxation, 2026 Combined Mill Rates/,
    });
    expect(mill).toHaveAttribute("href", expect.stringContaining("assessment.winnipeg.ca"));
    expect(mill).toHaveAttribute("rel", "noreferrer");
    // The board's August 2026 release, re-verified 2026-09-28.
    expect(screen.getAllByText(/as of August 2026/).length).toBeGreaterThan(0);
  });

  it("names the FIGURE each document backs, with its value, not only the document", async () => {
    const user = userEvent.setup();
    render();
    await openEverySection(user);
    const fees = document.getElementById("fees-panel")!;
    // Winnipeg's lawyer fee default, with the number it is.
    expect(within(fees).getByText(/Real estate lawyer fees and disbursements/)).toBeVisible();
    expect(within(fees).getByText(/\$1,800/)).toBeVisible();
    const propTax = document.getElementById("propTax-panel")!;
    expect(within(propTax).getAllByText(/Property tax rate/).length).toBeGreaterThan(0);
    expect(within(propTax).getByText(/1\.32%/)).toBeVisible();
    // A schedule gets a label and no single number.
    const charges = document.getElementById("charges-panel")!;
    expect(within(charges).getAllByText(/land transfer tax/i).length).toBeGreaterThan(0);
  });

  it("renders backticked names as plain text and keeps series ids in <code>", async () => {
    const { renderNote } = await import("@/components/sources-content");
    const { container } = renderWithIntl(
      <p>{renderNote("Uses `bench` and `propTax.effective`, series BROKER_AVERAGE_5YR_VRM.")}</p>,
    );
    expect(container.textContent).toBe("Uses bench and propTax.effective, series BROKER_AVERAGE_5YR_VRM.");
    const codes = [...container.querySelectorAll("code")].map((c) => c.textContent);
    expect(codes).toEqual(["propTax.effective", "BROKER_AVERAGE_5YR_VRM"]);
    expect(container.querySelector("code")!.className).toContain("[overflow-wrap:anywhere]");
  });

  it("uses no text below 11.5px", () => {
    const content = readFileSync("src/components/sources-content.tsx", "utf8");
    expect(content).not.toMatch(/text-\[(10|10\.5|11)px\]/);
  });

  it("uses the tool pages' geometry and hairlines, not cards", () => {
    render();
    const main = document.getElementById("main")!;
    expect(main.className).toContain("max-w-[1100px]");
    expect(main.className).toContain("px-5");
    expect(main.className).toContain("sm:px-10");
    expect(main.querySelector(".bg-card")).toBeNull();
  });

  it("agrees with its noun in Ukrainian: one/few/many for the figure count", async () => {
    const { default: uk } = await import("../../../../messages/uk.json");
    const { createTranslator } = await import("next-intl");
    const t = createTranslator({ locale: "uk", messages: uk, namespace: "Sources" } as never) as unknown as (
      key: string,
      values: Record<string, number>,
    ) => string;
    const at = (total: number) =>
      t("coverage", { jurisdictions: 15, total, sourced: 5, assumed: 3, unknown: 2 });
    expect(at(1)).toContain("має 1 цифра");
    expect(at(3)).toContain("мають 3 цифри");
    expect(at(301)).toContain("має 301 цифра");
    expect(at(305)).toContain("мають 305 цифр");
    expect(at(312)).toContain("мають 312 цифр");
  });

  it("shows the reader summary, not the maintainer note, under a figure", async () => {
    const user = userEvent.setup();
    render();
    await openEverySection(user);
    expect(screen.getByText(/The default is Winnipeg School Division, at 29\.366 mills/)).toBeVisible();
    // Eight divisions share the one document, so they fold into its row, a line each — and the
    // levy sentence is said once, on the default, not repeated per division.
    expect(screen.getByText(/^Pembina Trails School Division: 25\.223 mills/)).toBeVisible();
    expect(screen.getAllByText(/no Education Support Levy/i)).toHaveLength(1);
    // The note carries the verification trail (a stale PDF footer, the cross-check that dismissed
    // it). It stays in src/domain for the next person to verify; a reader never needed it.
    expect(screen.queryByText(/DEFAULT DIVISION/)).toBeNull();
    expect(screen.queryByText(/page footer still reads/)).toBeNull();
  });

  it("shows a gap as a gap, not as a missing row", async () => {
    // Yukon publishes no benchmark price at all. That must be visible ON the
    // page — an absent row would read as an oversight, and inventing a number is
    // the one thing this product exists not to do.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "yt" }));
    const user = userEvent.setup();
    render();
    await openEverySection(user);
    const market = document.getElementById("market-panel")!;
    expect(within(market).getAllByText("Not published").length).toBeGreaterThan(0);
    expect(within(market).getByText(/Nobody publishes a benchmark house price for Yukon/)).toBeVisible();
  });

  it("marks the fee defaults as ours, everywhere", async () => {
    const user = userEvent.setup();
    render();
    await openEverySection(user);
    const fees = document.getElementById("fees-panel")!;
    expect(within(fees).getAllByText("Assumption").length).toBeGreaterThan(0);
    expect(within(fees).getAllByText(/so this is a typical figure for the region/).length).toBeGreaterThan(0);
  });

  it("says the figure disclosure in its mixed-state wording", () => {
    render();
    expect(
      screen.getByText(
        "Every figure that carries a sourcing record names where it came from: a dated published source, an estimate we disclose, or nothing at all where nothing is published.",
      ),
    ).toBeVisible();
    expect(screen.getByText(/Federal rules verified/)).toBeVisible();
    expect(screen.getByText(/Figures for Winnipeg verified/)).toBeVisible();
  });

  it("says the explanations are in English, rather than pretending otherwise", () => {
    // The summaries come out of src/domain in English. Left unexplained, a French
    // reader reads an English paragraph as a translation that failed.
    render("fr-CA");
    expect(screen.getByText(/explication du chiffre en langage simple, en anglais/)).toBeVisible();
  });

  it("gives the French jurisdiction name its article after a preposition", () => {
    // "Pour Yukon" is not French. The six records with no city — nt, nu, yt, nb, nl,
    // pe — all take an article in French and the article is not derivable from the
    // spelling, so it is data: Jurisdictions.at.<id> is the name as it appears after
    // a preposition, and every "for {place}" surface reads that and not the bare name.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "yt" }));
    render("fr-CA");
    expect(screen.getByText("Pour le Yukon")).toBeVisible();
    expect(screen.queryByText("Pour Yukon")).not.toBeInTheDocument();
  });

  it("gives a province the same article, and a city none", () => {
    // Two records, because a per-territory special case would pass on Yukon and
    // still ship "pour Nouveau-Brunswick" — and because the eight city records
    // must NOT gain an article they do not take.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nb" }));
    render("fr-CA");
    expect(screen.getByText("Pour le Nouveau-Brunswick")).toBeVisible();
    cleanup();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "winnipeg" }));
    render("fr-CA");
    expect(screen.getByText("Pour Winnipeg")).toBeVisible();
  });

  it("renders no raw message key in French, with every group open", async () => {
    const user = userEvent.setup();
    render("fr-CA");
    await openEverySection(user);
    expect(document.body.textContent).not.toMatch(/Sources\.[a-zA-Z]/);
    expect(document.body.textContent).not.toMatch(/\bundefined\b|NaN/);
  });
});
