import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
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

describe("SourcesContent", () => {
  const render = () =>
    renderWithIntl(
      <JurisdictionProvider>
        <SourcesContent />
      </JurisdictionProvider>,
    );

  it("explains both marks, at the ids the marks link to", () => {
    render();
    expect(document.getElementById("rule")).toBeInTheDocument();
    expect(document.getElementById("estimate")).toBeInTheDocument();
  });

  it("names the federal sources and the verification date", () => {
    render();
    // CMHC appears in both the federal list and the "rule" explanation, which
    // is correct — the premium bands are one of the rules that section names.
    expect(screen.getByText(/OSFI Guideline B-20/)).toBeInTheDocument();
    expect(screen.getByText(/CMHC \/ SCHL/)).toBeInTheDocument();
    expect(screen.getByText(/Rules last verified/)).toBeInTheDocument();
  });

  it("lists the selected jurisdiction's own sources", () => {
    render();
    expect(screen.getByRole("heading", { name: "Provincial and municipal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Market data" })).toBeInTheDocument();
  });

  it("keeps the unverified-figures disclosure", () => {
    render();
    expect(screen.getByText("Placeholder figures — verify before relying on them")).toBeVisible();
  });

  it("never says a figure is verified, only when the rules were last checked", () => {
    render();
    // "Rules last verified <date>" is a statement about the table, not about any
    // figure in it. Nothing here may upgrade a placeholder to a fact.
    expect(screen.getByText(/Neither is verified/)).toBeInTheDocument();
  });
});
