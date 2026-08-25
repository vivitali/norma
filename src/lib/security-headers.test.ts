import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * public/_headers is invisible to the type system and to every other test: it
 * is a plain text file read by Cloudflare at the edge. Nothing else would
 * notice if a header were dropped, and the failure mode is silent — the site
 * keeps working and only its security posture regresses.
 */
const HEADERS = readFileSync("public/_headers", "utf8");

describe("security headers", () => {
  it("applies to every path", () => {
    expect(HEADERS).toMatch(/^\/\*$/m);
  });

  for (const header of [
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
  ]) {
    it(`sets ${header}`, () => {
      expect(HEADERS).toContain(`${header}:`);
    });
  }

  it("keeps HSTS at a year or more, which is what preload lists require", () => {
    const match = HEADERS.match(/max-age=(\d+)/);
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(31_536_000);
  });

  it("allows the analytics beacon it actually loads", () => {
    // Cloudflare Web Analytics serves from static.cloudflareinsights.com and
    // reports to cloudflareinsights.com. Omitting either silently kills
    // analytics, because CSP failures are console-only.
    expect(HEADERS).toContain("https://static.cloudflareinsights.com");
    expect(HEADERS).toContain("https://cloudflareinsights.com");
  });

  it("forbids framing in both the modern and legacy mechanism", () => {
    expect(HEADERS).toContain("frame-ancestors 'none'");
    expect(HEADERS).toContain("X-Frame-Options: DENY");
  });

  it("indents every header line under its pattern", () => {
    // Cloudflare silently ignores a header that is not indented under a path.
    const lines = HEADERS.split("\n").filter(
      (l) => l.trim() && !l.trim().startsWith("#") && !l.startsWith("/"),
    );
    for (const line of lines) expect(line).toMatch(/^ {2}\S/);
  });
});
