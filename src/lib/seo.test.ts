import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  buildMetadata,
  languageAlternates,
  ogImagePath,
} from "./seo";

describe("absoluteUrl", () => {
  it("returns an absolute URL on the canonical host", () => {
    const url = absoluteUrl("en-CA", "/affordability");
    expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
    expect(url.endsWith("/affordability")).toBe(true);
  });

  it("gives each locale a distinct URL", () => {
    expect(absoluteUrl("fr-CA", "/affordability")).not.toBe(
      absoluteUrl("en-CA", "/affordability"),
    );
  });

  it("never emits a double slash", () => {
    expect(absoluteUrl("en-CA", "/")).not.toMatch(/\/\/$/);
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
    locale: "en-CA",
    href: "/affordability",
    title: "What can you afford?",
    description: "Two ceilings, side by side.",
  });

  it("sets an absolute canonical", () => {
    expect(meta.alternates?.canonical).toBe(absoluteUrl("en-CA", "/affordability"));
  });

  it("carries hreflang for every locale", () => {
    expect(meta.alternates?.languages).toEqual(
      languageAlternates("/affordability"),
    );
  });

  it("sets Open Graph with the site name and canonical url", () => {
    expect(meta.openGraph?.siteName).toBe(SITE_NAME);
    expect(meta.openGraph?.url).toBe(absoluteUrl("en-CA", "/affordability"));
    expect(meta.openGraph?.title).toBe("What can you afford?");
    // A full language_TERRITORY tag, not the bare locale ("en-CA") this maps from.
    expect(meta.openGraph?.locale).toBe("en_CA");
  });

  it("sets a summary_large_image twitter card", () => {
    // Metadata["twitter"] is a union whose other members have no `card`, so it
    // has to be narrowed before the property is readable.
    const twitter = meta.twitter as { card?: string } | null | undefined;
    expect(twitter?.card).toBe("summary_large_image");
  });
});

describe("og:locale", () => {
  // Pinned for every locale, not just the source one: the value is derived from the same
  // table that decides how figures are formatted, and "the two cannot disagree" is a
  // description of the coupling rather than a test of it.
  it.each([
    ["en-CA", "en_CA"],
    ["fr-CA", "fr_CA"],
    ["uk-CA", "uk_UA"],
    ["es-CA", "es_MX"],
  ])("emits %s as %s", (locale, expected) => {
    const meta = buildMetadata({
      locale,
      href: "/affordability",
      title: "t",
      description: "d",
    });
    expect(meta.openGraph?.locale).toBe(expected);
  });
});

describe("locale prefixing", () => {
  // Guards the rule reimplemented in seo.ts. A locale prefix now spans two URL
  // segments — the country ("ca") and the language ("en"/"fr"/...) — because
  // routing.ts's `localePrefix.prefixes` maps each BCP-47 locale tag to
  // "/ca/<language>". These expectations change if that prefix map ever moves off
  // "always"; that is the point of pinning them here.
  it("prefixes every locale under its country segment", () => {
    expect(absoluteUrl("en-CA", "/affordability")).toBe(
      `${SITE_URL}/ca/en/affordability`,
    );
    // The French canonical is the French SLUG, not the route key. A canonical that
    // names a URL the site never serves is worse than no canonical at all, so this
    // has to resolve through `pathnames` rather than concatenating the key.
    expect(absoluteUrl("fr-CA", "/affordability")).toBe(
      `${SITE_URL}/ca/fr/abordabilite`,
    );
  });

  it("leaves a route with no localized slug on its English key", () => {
    expect(absoluteUrl("fr-CA", "/sources")).toBe(`${SITE_URL}/ca/fr/sources`);
  });

  it("maps the root to a bare country/language path with no trailing slash", () => {
    expect(absoluteUrl("en-CA", "/")).toBe(`${SITE_URL}/ca/en`);
  });

  it("throws for a locale with no configured URL prefix, rather than guessing one", () => {
    // The old, pre-/ca/ URL shape ("/en-CA/...") is exactly what a silent
    // `/${locale}` fallback would have reconstructed here — invisibly, since every
    // caller in this suite passes a locale from `routing.locales`, itself derived
    // from the same registry `localePrefix.prefixes` comes from. Only a genuine
    // routing.ts bug can reach this path, and it must fail loudly.
    expect(() => absoluteUrl("xx-YY", "/affordability")).toThrow(
      /no URL prefix configured for locale "xx-YY"/,
    );
  });
});

describe("social card metadata", () => {
  const meta = buildMetadata({
    locale: "fr-CA",
    href: "/affordability",
    title: "Calculateur",
    description: "Deux plafonds.",
  });

  it("points each locale at its own card", () => {
    expect(ogImagePath("fr-CA", "/affordability")).toBe("/og/fr-CA/affordability.png");
    expect(ogImagePath("uk-CA", "/")).toBe("/og/uk-CA/home.png");
  });

  it("declares the image dimensions", () => {
    // Slack, LinkedIn and Discord lay the card out before the image finishes
    // downloading; without these some skip the image on first paste.
    const [image] = meta.openGraph?.images as { width: number; height: number }[];
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
  });

  it("describes the image with the page title", () => {
    const [image] = meta.openGraph?.images as { alt: string; url: string }[];
    expect(image.alt).toBe("Calculateur");
    expect(image.url).toBe("/og/fr-CA/affordability.png");
  });

  it("gives twitter the same card, not a bare url", () => {
    const [image] = meta.twitter?.images as { url: string; alt: string }[];
    expect(image.url).toBe("/og/fr-CA/affordability.png");
    expect(image.alt).toBe("Calculateur");
  });

  it("declares the other locales to social scrapers", () => {
    const alt = meta.openGraph?.alternateLocale as string[];
    expect(alt).not.toContain("fr_CA");
    expect(alt.length).toBe(routing.locales.length - 1);
    for (const value of alt) expect(value).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
  });
});
