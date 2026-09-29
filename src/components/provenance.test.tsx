import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { getJurisdiction } from "@/domain/jurisdictions";
import { Provenance, ProvenanceLegend, VerifiedLines } from "./provenance";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

describe("Provenance", () => {
  it("distinguishes a rule from an estimate", () => {
    renderWithIntl(
      <>
        <Provenance kind="rule" />
        <Provenance kind="estimate" />
      </>,
    );
    expect(screen.getByRole("link", { name: /From a rule in the tables/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /local or household estimate/ })).toBeInTheDocument();
  });

  it("links to the sources page, at the anchor that explains the mark", () => {
    renderWithIntl(<Provenance kind="rule" />);
    expect(screen.getByRole("link", { name: /From a rule in the tables/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/sources#rule"),
    );
  });

  it("never claims the figure is verified", () => {
    // The marks describe DERIVATION, not verification. A "rule" figure is exact
    // given the rules table, and the rules table is itself unverified.
    renderWithIntl(
      <>
        <Provenance kind="rule" />
        <Provenance kind="estimate" />
      </>,
    );
    expect(document.body.textContent).not.toMatch(/verified|confirmed|official/i);
  });

  it("is not a tab stop, but stays a link", () => {
    // Five to sixty-seven identical stops per page; the legend in the footer is the one
    // focusable path (ProvenanceLegend below).
    renderWithIntl(<Provenance kind="estimate" />);
    const link = screen.getByRole("link", { name: /local or household estimate/ });
    expect(link).toHaveAttribute("tabindex", "-1");
    expect(link).toHaveAttribute("href", expect.stringContaining("/sources#rule".replace("rule", "estimate")));
  });
});

describe("ProvenanceLegend", () => {
  it("is one focusable link to the explainer", () => {
    renderWithIntl(<ProvenanceLegend />);
    const link = screen.getByRole("link", { name: /What “rule” and “estimate” mean/ });
    expect(link).not.toHaveAttribute("tabindex");
    expect(link).toHaveAttribute("href", expect.stringContaining("/sources#rule"));
  });
});

/** Winnipeg, whose record carries its end-to-end re-verification date (2026-09-28). */
function reverified() {
  return getJurisdiction("winnipeg")!;
}

describe("VerifiedLines", () => {
  it("names both dates in the reader's own format, never ISO", () => {
    renderWithIntl(<VerifiedLines jurisdiction={reverified()} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/Federal rules verified [A-Z][a-z]+ \d{1,2}, 2026/);
    // Winnipeg was re-verified on 2026-09-28, after the federal record's own stamp.
    expect(text).toMatch(/Figures for Winnipeg verified September 28, 2026/);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("calls a source's date a source date where no end-to-end verification is recorded", () => {
    const toronto = getJurisdiction("toronto")!;
    expect(toronto.verified).toBeUndefined();
    renderWithIntl(<VerifiedLines jurisdiction={toronto} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/Newest source for Toronto: /);
    expect(text).not.toMatch(/Figures for Toronto verified/);
  });

  it("formats French dates the French way", () => {
    renderWithIntl(<VerifiedLines jurisdiction={reverified()} />, { locale: "fr-CA" });
    expect(document.body.textContent).toMatch(/28 septembre 2026/);
    expect(document.body.textContent).toMatch(/Chiffres pour Winnipeg vérifiés\u202f: 28 septembre 2026/);
  });
});
