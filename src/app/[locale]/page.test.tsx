import { describe, expect, it, vi, beforeEach } from "vitest";
import { setRequestLocale } from "next-intl/server";
import { renderWithIntl } from "@/test/render-with-intl";
import HomePage from "./page";

// getTranslations is needed too: the page reads Metadata.home.description to
// fill the WebApplication structured data.
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}));

// The page renders HomeContent, which pulls in next-intl's navigation Link; that
// module does not resolve under the test environment.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

/**
 * The page renders nothing itself — its whole job is marking the request locale so
 * the route can be prerendered. That call is invisible when it goes missing: the
 * page still renders correctly, it just becomes a billed Worker invocation. See
 * docs/superpowers/specs/2026-08-17-hosting-cicd-design.md.
 */
describe("Home page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks the request locale so the route is prerendered", async () => {
    await HomePage({
      params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve({}),
    });

    expect(setRequestLocale).toHaveBeenCalledWith("fr");
  });

  it("emits WebApplication structured data", async () => {
    const tree = await HomePage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });

    // HomeContent below the JsonLd needs the client intl context.
    const { container } = renderWithIntl(tree);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? "")).toMatchObject({
      "@type": "WebApplication",
      applicationCategory: "FinanceApplication",
    });
  });
});
