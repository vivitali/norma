import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";
import { NAV, builtEntries } from "./routes";

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

  it("lists Rent vs Buy in two groups, deliberately", () => {
    // It serves someone deciding whether to enter the market AND someone weighing staying put
    // against selling. Flat URLs are what make this honest rather than ambiguous — a nested URL
    // would have forced one answer. Guarded so a future "dedupe the nav" refactor has to argue
    // with this test rather than silently collapse it.
    const groups = NAV.filter((g) => g.entries.some((e) => e.route === "/rent-vs-buy"));
    expect(groups.map((g) => g.heading)).toEqual(["afford", "own"]);
  });

  it("exposes only routes whose page exists", () => {
    // Home is not a nav entry. Sources shipped with the interaction-model rebuild but had no
    // way in until pathnames existed — the provenance marks were its only entry point.
    expect(NAV.flatMap(builtEntries).map((e) => e.route)).toEqual([
      "/affordability",
      "/closing-costs",
      "/down-payment",
      "/rrsp-hbp",
      "/amortization",
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
    navRoutes.add("/");
    expect([...navRoutes].sort()).toEqual(Object.keys(routing.pathnames).sort());
  });

  it("has a Nav message key for every label and heading, in both locales", () => {
    const keys = new Set<string>();
    for (const group of NAV) {
      keys.add(group.heading);
      for (const entry of group.entries) keys.add(entry.label);
    }
    for (const key of keys) {
      expect(enMessages.Nav, `Nav.${key} missing in en.json`).toHaveProperty(key);
      expect(frMessages.Nav, `Nav.${key} missing in fr.json`).toHaveProperty(key);
    }
  });
});
