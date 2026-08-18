import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { HomeContent } from "@/components/home-content";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Home page", () => {
  afterEach(() => cleanup());

  it("renders the heading", () => {
    renderWithIntl(<HomeContent />);
    expect(screen.getByRole("heading", { name: "What can you actually afford?" })).toBeInTheDocument();
  });

  it("links its primary CTA to the affordability page", () => {
    renderWithIntl(<HomeContent />);
    expect(screen.getByRole("link", { name: "See what you can afford" })).toHaveAttribute(
      "href",
      "/affordability",
    );
  });
});
