import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { AppNav } from "./app-nav";

// Real `@/i18n/navigation` now runs unmocked: only `next/navigation` (its dependency) is
// replaced, with the RAW browser pathname next-intl expects — `/en/...` or `/fr/...`, always
// prefixed (routing.ts's default `localePrefix` mode is "always"). next-intl's own `usePathname`
// then reverse-maps that raw, possibly-localized pathname back to the canonical route key, and its
// `Link` resolves `href` forward into the localized slug from `routing.pathnames` — so both
// directions of the real localization logic are exercised, not a hand-written stand-in.
let mockPathname = "/en";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

describe("AppNav", () => {
  beforeEach(() => {
    mockPathname = "/en";
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
    mockPathname = "/fr";
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
    mockPathname = "/en/affordability";
    renderWithIntl(<AppNav />);
    expect(screen.getByRole("link", { name: "Affordability" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks the current route as active from a localized pathname, proving next-intl reverse-maps the French slug to the canonical route key", () => {
    mockPathname = "/fr/abordabilite";
    renderWithIntl(<AppNav />, { locale: "fr" });
    expect(screen.getByRole("link", { name: "Capacité d'achat" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
