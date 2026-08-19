import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { Provenance } from "./provenance";

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
    expect(screen.getByRole("link", { name: "rule" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "estimate" })).toBeInTheDocument();
  });

  it("links to the sources page, at the anchor that explains the mark", () => {
    renderWithIntl(<Provenance kind="rule" />);
    expect(screen.getByRole("link", { name: "rule" })).toHaveAttribute(
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
});
