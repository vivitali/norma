import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
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

const render = (locale: "en" | "fr" = "en") =>
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
    expect(screen.getAllByText(/as of 2026-07/).length).toBeGreaterThan(0);
  });

  it("shows the note, which is usually the most useful sentence about a figure", async () => {
    const user = userEvent.setup();
    render();
    await openEverySection(user);
    expect(screen.getByText(/29.366 = the 2026 municipal mill rate/)).toBeVisible();
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
    expect(within(market).getByText(/No MLS® HPI covers Yukon/)).toBeVisible();
  });

  it("marks the fee defaults as ours, everywhere", async () => {
    const user = userEvent.setup();
    render();
    await openEverySection(user);
    const fees = document.getElementById("fees-panel")!;
    expect(within(fees).getAllByText("Assumption").length).toBeGreaterThan(0);
    expect(within(fees).getByText(/firms set their own/)).toBeVisible();
  });

  it("says the figure disclosure in its mixed-state wording", () => {
    render();
    expect(
      screen.getByText(
        "Every figure that carries a sourcing record names where it came from: a dated published source, an estimate we disclose, or nothing at all where nothing is published.",
      ),
    ).toBeVisible();
    expect(screen.getByText(/Rules last verified/)).toBeVisible();
  });

  it("says the notes are kept in English, rather than pretending otherwise", () => {
    // The notes come out of src/domain verbatim. Left unexplained, a French
    // reader reads an English paragraph as a translation that failed.
    render("fr");
    expect(screen.getByText(/conservées en anglais/)).toBeVisible();
  });

  it("gives the French jurisdiction name its article after a preposition", () => {
    // "Pour Yukon" is not French. The six records with no city — nt, nu, yt, nb, nl,
    // pe — all take an article in French and the article is not derivable from the
    // spelling, so it is data: Jurisdictions.at.<id> is the name as it appears after
    // a preposition, and every "for {place}" surface reads that and not the bare name.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "yt" }));
    render("fr");
    expect(screen.getByText("Pour le Yukon")).toBeVisible();
    expect(screen.queryByText("Pour Yukon")).not.toBeInTheDocument();
  });

  it("gives a province the same article, and a city none", () => {
    // Two records, because a per-territory special case would pass on Yukon and
    // still ship "pour Nouveau-Brunswick" — and because the eight city records
    // must NOT gain an article they do not take.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nb" }));
    render("fr");
    expect(screen.getByText("Pour le Nouveau-Brunswick")).toBeVisible();
    cleanup();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "winnipeg" }));
    render("fr");
    expect(screen.getByText("Pour Winnipeg")).toBeVisible();
  });

  it("renders no raw message key in French, with every group open", async () => {
    const user = userEvent.setup();
    render("fr");
    await openEverySection(user);
    expect(document.body.textContent).not.toMatch(/Sources\.[a-zA-Z]/);
    expect(document.body.textContent).not.toMatch(/\bundefined\b|NaN/);
  });
});
