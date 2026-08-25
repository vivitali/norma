import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  buildMetadata,
  languageAlternates,
} from "./seo";

describe("absoluteUrl", () => {
  it("returns an absolute URL on the canonical host", () => {
    const url = absoluteUrl("en", "/affordability");
    expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
    expect(url.endsWith("/affordability")).toBe(true);
  });

  it("gives each locale a distinct URL", () => {
    expect(absoluteUrl("fr", "/affordability")).not.toBe(
      absoluteUrl("en", "/affordability"),
    );
  });

  it("never emits a double slash", () => {
    expect(absoluteUrl("en", "/")).not.toMatch(/\/\/$/);
  });
});

describe("languageAlternates", () => {
  it("covers every configured locale plus x-default", () => {
    const alternates = languageAlternates("/affordability");
    for (const locale of routing.locales) {
      expect(alternates[locale]).toBe(absoluteUrl(locale, "/affordability"));
    }
    expect(alternates["x-default"]).toBe(
      absoluteUrl(routing.defaultLocale, "/affordability"),
    );
  });
});

describe("buildMetadata", () => {
  const meta = buildMetadata({
    locale: "en",
    href: "/affordability",
    title: "What can you afford?",
    description: "Two ceilings, side by side.",
  });

  it("sets an absolute canonical", () => {
    expect(meta.alternates?.canonical).toBe(absoluteUrl("en", "/affordability"));
  });

  it("carries hreflang for every locale", () => {
    expect(meta.alternates?.languages).toEqual(
      languageAlternates("/affordability"),
    );
  });

  it("sets Open Graph with the site name and canonical url", () => {
    expect(meta.openGraph?.siteName).toBe(SITE_NAME);
    expect(meta.openGraph?.url).toBe(absoluteUrl("en", "/affordability"));
    expect(meta.openGraph?.title).toBe("What can you afford?");
    // A full language_TERRITORY tag, not the bare "en" this used to emit.
    expect(meta.openGraph?.locale).toBe("en_CA");
  });

  it("sets a summary_large_image twitter card", () => {
    // Metadata["twitter"] is a union whose other members have no `card`, so it
    // has to be narrowed before the property is readable.
    const twitter = meta.twitter as { card?: string } | null | undefined;
    expect(twitter?.card).toBe("summary_large_image");
  });
});

describe("locale prefixing", () => {
  // Guards the rule reimplemented in seo.ts. These expectations change when
  // Task 8 switches localePrefix to "as-needed" — that is the point of having
  // them: the URL shape cannot move without a test saying so.
  it("prefixes every locale while localePrefix is the default 'always'", () => {
    expect(absoluteUrl("en", "/affordability")).toBe(
      `${SITE_URL}/en/affordability`,
    );
    // The French canonical is the French SLUG, not the route key. A canonical that
    // names a URL the site never serves is worse than no canonical at all, so this
    // has to resolve through `pathnames` rather than concatenating the key.
    expect(absoluteUrl("fr", "/affordability")).toBe(
      `${SITE_URL}/fr/abordabilite`,
    );
  });

  it("leaves a route with no localized slug on its English key", () => {
    expect(absoluteUrl("fr", "/sources")).toBe(`${SITE_URL}/fr/sources`);
  });

  it("maps the root to a bare locale path with no trailing slash", () => {
    expect(absoluteUrl("en", "/")).toBe(`${SITE_URL}/en`);
  });
});
