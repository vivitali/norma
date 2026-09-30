import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { CATALOGUES, type Tree } from "@/test/catalogues";
import { NAV, FOOTER, builtEntries } from "./routes";

describe("nav registry", () => {
  it("points every entry at a route that exists in the pathnames map", () => {
    const known = new Set(Object.keys(routing.pathnames));
    for (const group of NAV) {
      for (const entry of group.entries) {
        expect(known, `${group.heading} -> ${entry.route}`).toContain(entry.route);
      }
    }
  });

  it("groups the tools by journey stage", () => {
    expect(NAV.map((g) => g.heading)).toEqual(["afford", "buy", "own", "utility"]);
  });

  it("lists every destination exactly once", () => {
    // Rent vs Buy used to sit under both "afford" and "own": a screen reader heard nine links for
    // eight tools. It lives under "afford" alone now.
    const routes = NAV.flatMap(builtEntries).map((e) => e.route);
    expect(new Set(routes).size).toBe(routes.length);
    const groups = NAV.filter((g) => g.entries.some((e) => e.route === "/rent-vs-buy"));
    expect(groups.map((g) => g.heading)).toEqual(["afford"]);
  });

  it("exposes only routes whose page exists", () => {
    // Home is not a nav entry. Sources shipped with the interaction-model rebuild but had no
    // way in until pathnames existed — the provenance marks were its only entry point.
    expect(NAV.flatMap(builtEntries).map((e) => e.route)).toEqual([
      "/affordability",
      "/rent-vs-buy",
      "/closing-costs",
      "/down-payment",
      "/rrsp-hbp",
      "/amortization",
      "/scenarios",
      "/sources",
    ]);
  });

  it("never lists the home route as a nav entry", () => {
    for (const group of NAV) {
      for (const entry of group.entries) expect(entry.route).not.toBe("/");
    }
  });

  it("covers every route in routing.pathnames — nothing added there is left off the registry", () => {
    // The previous test only catches a NAV entry pointing at a nonexistent route. This is the
    // reverse: a route added to routing.ts and forgotten here would otherwise be silently
    // unreachable from the UI.
    const navRoutes = new Set(NAV.flatMap((g) => g.entries.map((e) => e.route)));
    for (const entry of FOOTER) navRoutes.add(entry.route);
    navRoutes.add("/");
    expect([...navRoutes].sort()).toEqual(Object.keys(routing.pathnames).sort());
  });

  it("has a Nav message key for every label and heading, in every locale", () => {
    const keys = new Set<string>();
    for (const group of NAV) {
      keys.add(group.heading);
      for (const entry of group.entries) keys.add(entry.label);
    }
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      for (const key of keys) {
        expect((messages as Tree).Nav, `Nav.${key} missing in ${locale}.json`).toHaveProperty(key);
      }
    }
  });
});

describe("footer registry", () => {
  it("points every entry at a route that exists in the pathnames map", () => {
    const known = new Set(Object.keys(routing.pathnames));
    for (const entry of FOOTER) expect(known, entry.route).toContain(entry.route);
  });

  it("keeps the legal pages OUT of the journey nav", () => {
    // The split is the point of having two registries. A privacy policy ranked beside Closing
    // Costs in the menu panel misstates what it is, and the panel's column grid is sized for the
    // four journey groups. Guarded so a later "surface everything in one place" change has to
    // argue with this test.
    const navRoutes = new Set(NAV.flatMap((g) => g.entries.map((e) => e.route)));
    for (const entry of FOOTER) expect(navRoutes).not.toContain(entry.route);
  });

  it("has a Legal message key for every label, in every locale", () => {
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      for (const entry of FOOTER) {
        expect(
          (messages as Tree).Legal,
          `Legal.${entry.label} missing in ${locale}.json`,
        ).toHaveProperty(entry.label);
      }
    }
  });
});
