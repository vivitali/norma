import { describe, expect, it, vi, beforeEach } from "vitest";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import LocaleLayout, { dynamicParams } from "./layout";

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// next/font/google runs a build-time loader that is unavailable under vitest.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("@/components/app-header", () => ({ AppHeader: () => null }));

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
