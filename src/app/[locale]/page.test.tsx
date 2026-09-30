import { describe, expect, it, vi, beforeEach } from "vitest";
import { setRequestLocale } from "next-intl/server";
import { renderWithIntl } from "@/test/render-with-intl";
import { jurisdictionsOf } from "@/domain/jurisdictions";
import en from "../../../messages/en.json";
import HomePage from "./page";

// getTranslations resolves REAL copy from messages/en.json, not the key name.
// An identity mock made the FAQ drift test impossible: the schema would carry
// key names while the rendered <dl> carried English, so the two could never be
// compared and the drift claim went untested.
vi.mock("next-intl/server", async () => {
  const messages = (await import("../../../messages/en.json")).default as unknown as Record<
    string,
    Record<string, string>
  >;
  return {
    setRequestLocale: vi.fn(),
    getTranslations: vi.fn(async ({ namespace }: { namespace: string }) => {
      const scope = namespace.split(".").reduce<unknown>(
        (node, part) => (node as Record<string, unknown>)[part],
        messages,
      ) as Record<string, string>;
      // Naive `{name}` substitution: enough for the plain-text placeholders (`{places}`) the
      // FAQ answers carry, without pulling in an ICU formatter.
      return (key: string, values?: Record<string, string>) =>
        Object.entries(values ?? {}).reduce(
          (text, [name, value]) => text.replaceAll(`{${name}}`, value),
          scope[key] ?? key,
        );
    }),
  };
});

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
      params: Promise.resolve({ locale: "fr-CA" }),
      searchParams: Promise.resolve({}),
    });

    expect(setRequestLocale).toHaveBeenCalledWith("fr-CA");
  });

  it("emits WebApplication structured data", async () => {
    const tree = await HomePage({
      params: Promise.resolve({ locale: "en-CA" }),
      searchParams: Promise.resolve({}),
    });

    // HomeContent below the JsonLd needs the client intl context.
    const { container } = renderWithIntl(tree);
    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')];
    expect(JSON.parse(scripts[0]?.textContent ?? "")).toMatchObject({
      "@type": "WebApplication",
      applicationCategory: "FinanceApplication",
    });
  });

  it("marks up exactly the questions the page renders, no more and no fewer", async () => {
    // The drift claim, tested against the PAGE rather than against a
    // reconstruction of it. The previous version rebuilt the payload inside the
    // test file from HOME_FAQ_KEYS and asserted those strings rendered — so
    // adding a hardcoded question to page.tsx left every test green, which is
    // the exact failure the "impossible by construction" comment denies.
    const tree = await HomePage({
      params: Promise.resolve({ locale: "en-CA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = renderWithIntl(tree);

    const faqScript = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent ?? "{}"))
      .find((d) => d["@type"] === "FAQPage");
    expect(faqScript, "no FAQPage block rendered").toBeDefined();

    const markedUp = (faqScript.mainEntity as { name: string }[]).map((q) => q.name);
    // Scoped to the FAQ section: the jurisdiction block on the same page is also
    // a <dl>, so an unscoped dt query compares questions against province names.
    const faqSection = container.querySelector("#faq");
    expect(faqSection, "no #faq section rendered").not.toBeNull();
    const rendered = [...faqSection!.querySelectorAll("dt")].map((dt) => dt.textContent?.trim());

    expect(markedUp.length).toBeGreaterThan(0);
    expect([...markedUp].sort()).toEqual([...rendered].sort());
  });

  it("names every modelled US market in the FAQPage answer, and never claims only one", async () => {
    // The answer used to say Houston "is the only US market modelled" after Austin and Seattle
    // shipped. It is built from the registry now, so a new metro cannot make it false again.
    const tree = await HomePage({
      params: Promise.resolve({ locale: "en-US" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = renderWithIntl(tree, { locale: "en-US" });
    const faq = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent ?? "{}"))
      .find((d) => d["@type"] === "FAQPage");
    const answer: string = faq.mainEntity.find((q: { name: string }) =>
      /markets/i.test(q.name),
    ).acceptedAnswer.text;
    const names = en.Jurisdictions as unknown as Record<string, string>;
    for (const j of jurisdictionsOf("us")) expect(answer, j.id).toContain(names[j.id]);
    expect(answer).not.toMatch(/\bonly\b/i);
    expect(answer).not.toContain("{places}");
  });
});
