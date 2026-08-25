import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import LocaleLayout, { dynamicParams } from "./layout";
import { AppFooter } from "@/components/app-footer";

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}));

// The shared mock plus this file's own `notFound`. Importing the real AppFooter below pulls
// @/i18n/navigation, whose next-intl factory needs `redirect` and friends — which is exactly what
// @/test/navigation-mock exists to supply, and what nine other test files already use.
vi.mock("next/navigation", async () => ({
  ...(await import("@/test/navigation-mock")).nextNavigation,
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

// next/font/google runs a build-time loader that is unavailable under vitest.
vi.mock("next/font/google", () => ({
  Archivo: () => ({ variable: "--font-archivo" }),
  Martian_Mono: () => ({ variable: "--font-martian-mono" }),
}));

vi.mock("@/components/app-header", () => ({ AppHeader: () => null }));

/** Every element in a returned tree, depth-first. */
function walk(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!isValidElement(node)) return [];
  const props = node.props as { children?: ReactNode };
  return [node, ...walk(props.children)];
}

/**
 * This one call is what makes every client page in the segment prerenderable —
 * the affordability page has no setRequestLocale of its own and inherits static
 * rendering from here. Losing it is invisible: pages still render, they just
 * become billed Worker invocations. See
 * docs/superpowers/specs/2026-08-17-hosting-cicd-design.md.
 */
describe("LocaleLayout", () => {
  beforeEach(() => vi.clearAllMocks());

  // Without this, an unknown locale reaches the Worker and renders a 404 through
  // React — billed, under a 10ms CPU cap — instead of being refused at routing.
  it("refuses unknown locales at the routing layer", () => {
    expect(dynamicParams).toBe(false);
  });

  it("marks the request locale so the whole segment is prerendered", async () => {
    await LocaleLayout({
      children: null,
      params: Promise.resolve({ locale: "fr" }),
    });

    expect(setRequestLocale).toHaveBeenCalledWith("fr");
  });

  /**
   * Structural, not a substring.
   *
   * The previous version mocked AppFooter away and asserted `layout.tsx` CONTAINED the string
   * "<AppFooter" — which passes if the element is commented out, put behind a branch that never
   * runs, or moved somewhere unreachable. That assertion was the only thing standing behind this
   * change's central claim, that no page can ship without the disclosure. This renders the real
   * layout for a real locale and looks for the component in the tree it actually returned.
   */
  it("puts the footer in every page's tree, so no page can ship without the disclosure", async () => {
    const tree = await LocaleLayout({
      children: null,
      params: Promise.resolve({ locale: "fr" }),
    });

    expect(walk(tree).some((node) => isValidElement(node) && node.type === AppFooter)).toBe(true);
  });

  it("404s an unknown locale instead of marking it", async () => {
    await expect(
      LocaleLayout({
        children: null,
        params: Promise.resolve({ locale: "de" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
    // Order matters: an invalid locale must never reach setRequestLocale.
    expect(setRequestLocale).not.toHaveBeenCalled();
  });
});
