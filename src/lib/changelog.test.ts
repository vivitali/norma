import { describe, expect, it } from "vitest";
import { getJurisdiction } from "@/domain/jurisdictions";
import { allLocales } from "@/i18n/countries";
import { CATALOGUES, type Tree } from "@/test/catalogues";
import {
  RELEASES,
  dateKey,
  formatReleaseDate,
  latestRelevant,
  releasesFor,
  type Release,
} from "./changelog";
import { ROUTE_COUNTRIES } from "./routes";
import { SECTION_REGISTRIES } from "./sections";

/** The section registry each route's hashes must come from. */
const ROUTE_REGISTRY: Record<string, string> = {
  "/affordability": "Affordability",
  "/closing-costs": "ClosingCosts",
  "/down-payment": "DownPayment",
  "/rrsp-hbp": "RrspHbp",
  "/amortization": "Amortization",
  "/rent-vs-buy": "RentVsBuy",
  "/scenarios": "Scenarios",
  "/sources": "Sources",
};

describe("changelog data", () => {
  it("has releases", () => {
    expect(RELEASES.length).toBeGreaterThan(0);
  });

  it("uses unique release ids", () => {
    const ids = RELEASES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("dates are real calendar days and never increase down the list", () => {
    for (const release of RELEASES) {
      expect(release.date, release.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const parsed = new Date(`${release.date}T00:00:00Z`);
      expect(Number.isNaN(parsed.getTime()), release.id).toBe(false);
      expect(parsed.toISOString().slice(0, 10), `${release.id} is not a real date`).toBe(release.date);
    }
    for (let i = 1; i < RELEASES.length; i++) {
      expect(
        dateKey(RELEASES[i].date),
        `${RELEASES[i].id} is newer than the release above it`,
      ).toBeLessThanOrEqual(dateKey(RELEASES[i - 1].date));
    }
  });

  it("carries 1 to 6 items per release, and item keys are unique", () => {
    const seen = new Set<string>();
    for (const release of RELEASES) {
      expect(release.items.length, release.id).toBeGreaterThanOrEqual(1);
      expect(release.items.length, release.id).toBeLessThanOrEqual(6);
      for (const item of release.items) {
        expect(seen.has(item.key), `${item.key} used twice`).toBe(false);
        seen.add(item.key);
      }
    }
  });

  it("has every item and summary key in all four catalogues, non-empty", () => {
    const keys = RELEASES.flatMap((r) => [r.summary, ...r.items.map((i) => i.key)]);
    for (const [language, catalogue] of Object.entries(CATALOGUES)) {
      const ns = (catalogue as Tree).Changelog as Record<string, string>;
      for (const key of keys) {
        expect(ns[key], `Changelog.${key} missing in ${language}`).toBeTruthy();
      }
    }
  });

  it("keeps each summary short enough for one footer line", () => {
    for (const [language, catalogue] of Object.entries(CATALOGUES)) {
      const ns = (catalogue as Tree).Changelog as Record<string, string>;
      for (const release of RELEASES) {
        expect(ns[release.summary].length, `${language}/${release.summary}`).toBeLessThanOrEqual(64);
      }
    }
  });

  it("only links to routes that exist in every country the release lists", () => {
    for (const release of RELEASES) {
      for (const item of release.items) {
        if (!item.href) continue;
        const countries = ROUTE_COUNTRIES[item.href.pathname];
        expect(countries, `${release.id}: ${item.href.pathname} is not a route`).toBeDefined();
        for (const country of release.countries) {
          expect(countries, `${release.id}: ${item.href.pathname} in ${country}`).toContain(country);
        }
      }
    }
  });

  it("only links to hashes that are registered section ids of that route", () => {
    for (const release of RELEASES) {
      for (const item of release.items) {
        const hash = item.href?.hash;
        if (!hash) continue;
        const namespace = ROUTE_REGISTRY[item.href!.pathname];
        expect(namespace, `${release.id}: ${item.href!.pathname} has no sections`).toBeDefined();
        const registry = SECTION_REGISTRIES.find((r) => r.namespace === namespace)!;
        expect(
          registry.sections.map((s) => s.id),
          `${release.id}: #${hash} on ${item.href!.pathname}`,
        ).toContain(hash);
      }
    }
  });

  it("only names jurisdictions that exist, in a country the release lists", () => {
    for (const release of RELEASES) {
      for (const id of release.jurisdictions ?? []) {
        const jurisdiction = getJurisdiction(id);
        expect(jurisdiction, `${release.id}: unknown jurisdiction ${id}`).toBeDefined();
        expect(release.countries, `${release.id}: ${id}`).toContain(jurisdiction!.country);
      }
    }
  });

  it("has a translated name for every jurisdiction it tags", () => {
    for (const [language, catalogue] of Object.entries(CATALOGUES)) {
      const names = (catalogue as Tree).Jurisdictions as Record<string, unknown>;
      for (const release of RELEASES) {
        for (const id of release.jurisdictions ?? []) {
          expect(typeof names[id], `${language}/Jurisdictions.${id}`).toBe("string");
        }
      }
    }
  });

  it("has at least one release for every country", () => {
    for (const country of ["ca", "us"] as const) {
      expect(releasesFor(country).length, country).toBeGreaterThan(0);
    }
  });
});

describe("changelog helpers", () => {
  it("dateKey turns an ISO date into yyyymmdd", () => {
    expect(dateKey("2026-09-28")).toBe(20260928);
    expect(dateKey("2026-01-05")).toBe(20260105);
  });

  it("releasesFor keeps only that country's releases, in order", () => {
    const us = releasesFor("us");
    expect(us.every((r) => r.countries.includes("us"))).toBe(true);
    expect(us.map((r) => r.id)).toEqual(
      RELEASES.filter((r) => r.countries.includes("us")).map((r) => r.id),
    );
    expect(releasesFor("ca").some((r) => r.id === "2026-09-05-austin")).toBe(false);
  });

  it("latestRelevant skips a release tagged to other jurisdictions", () => {
    // A fixture, not RELEASES: which release is newest changes with every entry, and the skip is
    // only exercised while a tagged one sits above an untagged one.
    const release = (id: string, jurisdictions?: string[]): Release => ({
      id,
      date: "2026-01-01",
      countries: ["ca"],
      summary: "s",
      items: [],
      ...(jurisdictions ? { jurisdictions } : {}),
    });
    const fixture = [release("wpg", ["winnipeg"]), release("all")];
    expect(latestRelevant("ca", "winnipeg", fixture)?.id).toBe("wpg");
    expect(latestRelevant("ca", "toronto", fixture)?.id).toBe("all");
    expect(latestRelevant("us", "toronto", fixture)).toBeUndefined();
  });

  it("latestRelevant is scoped to the country", () => {
    expect(latestRelevant("us", "houston")?.countries).toContain("us");
    // Austin's release is the newest tagged one for Austin, but the general one is newer or equal.
    const austin = latestRelevant("us", "austin");
    expect(austin).toBeDefined();
    expect(latestRelevant("us", "nowhere")?.jurisdictions).toBeUndefined();
  });

  it("formats a date with Intl in each locale's own tag, without a timezone shift", () => {
    expect(formatReleaseDate("2026-09-28", "en-CA")).toMatch(/28/);
    expect(formatReleaseDate("2026-09-28", "en-CA")).toMatch(/2026/);
    expect(formatReleaseDate("2026-01-01", "en-US")).toBe("Jan 1, 2026");
    expect(formatReleaseDate("2026-09-28", "fr-CA")).toMatch(/sept/);
    expect(formatReleaseDate("2026-09-28", "uk-CA")).toMatch(/вер/);
    for (const locale of allLocales()) {
      expect(formatReleaseDate("2026-09-28", locale)).toMatch(/28/);
    }
  });
});
