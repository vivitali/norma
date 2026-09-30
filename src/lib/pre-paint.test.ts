import { afterEach, describe, expect, it } from "vitest";
import { prePaintScript } from "./pre-paint";
import { TOOL_DEFAULTS } from "./shared-inputs";
import { STORE_KEY_V2 } from "./storage";

const run = (country: "ca" | "us", blob?: unknown) => {
  if (blob !== undefined) window.localStorage.setItem(STORE_KEY_V2, JSON.stringify(blob));
  // The script is shipped as an inline <script>; evaluating the same string is the honest test.
  new Function(prePaintScript(country))();
  return document.documentElement.hasAttribute("data-stored");
};

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-stored");
});

describe("prePaintScript", () => {
  it("leaves a first visit alone — nothing stored, nothing to wait for", () => {
    expect(run("ca")).toBe(false);
  });

  it("leaves a blob that matches the prerendered defaults alone", () => {
    // Exactly what useSharedState writes after a visit that changed nothing.
    expect(run("ca", { ...TOOL_DEFAULTS, jurId: "winnipeg" })).toBe(false);
  });

  it("marks a reader whose stored inputs change the page", () => {
    expect(run("ca", { ...TOOL_DEFAULTS, jurId: "winnipeg", rent: 1800 })).toBe(true);
  });

  it("marks a stored jurisdiction of this country that is not the default", () => {
    expect(run("ca", { jurId: "nu" })).toBe(true);
  });

  it("ignores a jurisdiction from the other country, as the page itself does on load", () => {
    expect(run("us", { jurId: "winnipeg" })).toBe(false);
    expect(run("us", { jurId: "austin" })).toBe(true);
  });

  it("ignores keys no tool page reads and survives junk", () => {
    expect(run("ca", { seenUpdate: 20260928, somethingElse: 1 })).toBe(false);
    window.localStorage.setItem(STORE_KEY_V2, "{not json");
    expect(run("ca")).toBe(false);
  });
});
