import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
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
    // Affordability is the only tool built today; Home is not a nav entry.
    expect(NAV.flatMap(builtEntries).map((e) => e.route)).toEqual(["/affordability"]);
  });

  it("never lists the home route as a nav entry", () => {
    for (const group of NAV) {
      for (const entry of group.entries) expect(entry.route).not.toBe("/");
    }
  });
});
