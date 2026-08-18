import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, screen } from "@testing-library/react";
import { useLocale } from "next-intl";
import { renderWithIntl } from "@/test/render-with-intl";
import { routing } from "@/i18n/routing";
import { AppNav } from "./app-nav";

let mockPathname = "/";

// The real `@/i18n/navigation` cannot be imported under Vitest in this repo — even unmocked —
// because next-intl's createNavigation.js does a bare `import ... from "next/navigation"` that
// Vite's resolver fails on without an extension against this Next 16.3.1 install (reproduced with
// a bare `import { Link } from "@/i18n/navigation"` and no vi.mock at all: same
// ERR_MODULE_NOT_FOUND). Every other test in this codebase (app-header, locale-switcher, the Home
// page) works around it the same way: replace the module with a hand-written stand-in rather than
// `vi.importActual`. The Link stand-in below still exercises the real localization data — it reads
// `routing.pathnames`, the same config the real Link would consult — so the localized-slug
// assertion is checking AppNav's behavior against real routing data, not a hardcoded fixture.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mockPathname,
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => {
    const locale = useLocale();
    const template = routing.pathnames[href as keyof typeof routing.pathnames];
    const slug = typeof template === "string" ? template : (template?.[locale as "fr"] ?? href);
    return (
      <a href={`/${locale}${slug}`} {...props}>
        {children}
      </a>
    );
  },
}));

describe("AppNav", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  afterEach(() => {
    cleanup();
  });

  it("links only to pages that exist", () => {
    renderWithIntl(<AppNav />);
    expect(screen.getByRole("link", { name: "Affordability" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Scenarios" })).not.toBeInTheDocument();
  });

  it("points the link at the localized slug", () => {
    renderWithIntl(<AppNav />, { locale: "fr" });
    expect(screen.getByRole("link", { name: "Capacité d'achat" })).toHaveAttribute(
      "href",
      "/fr/abordabilite",
    );
  });

  it("omits a group heading when the group has no built pages", () => {
    renderWithIntl(<AppNav />);
    expect(screen.queryByText("Buy")).not.toBeInTheDocument();
  });

  it("marks the current route as the active page", () => {
    // usePathname returns the CANONICAL key, never the localized slug — that is what makes this
    // comparison work identically under /en and /fr.
    mockPathname = "/affordability";
    renderWithIntl(<AppNav />);
    expect(screen.getByRole("link", { name: "Affordability" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
