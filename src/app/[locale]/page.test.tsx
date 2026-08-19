import { describe, expect, it, vi, beforeEach } from "vitest";
import { setRequestLocale } from "next-intl/server";
import HomePage from "./page";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));

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
});
