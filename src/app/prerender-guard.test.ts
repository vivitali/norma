import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Prerendering is a cost constraint, not a style rule: Cloudflare serves a
 * prerendered page as a free static asset and bills a dynamic route as a Worker
 * invocation under a 10ms CPU cap.
 *
 * `scripts/verify-prerender` is the real guard, but it needs a full `next build`.
 * This fails in two seconds instead, across EVERY page rather than the one
 * whose test happened to include the check — the sources page had it and the six
 * pages added after it did not.
 */
const PAGES_ROOT = "src/app";

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return /^(page|layout)\.tsx$/.test(name) ? [path] : [];
  });
}

const FILES = pageFiles(PAGES_ROOT).map((path) => ({ path, source: readFileSync(path, "utf8") }));

describe("every route stays prerenderable", () => {
  it("finds the page files at all, so an empty sweep cannot pass silently", () => {
    expect(FILES.filter((f) => f.path.endsWith("page.tsx")).length).toBeGreaterThanOrEqual(9);
  });

  for (const { path, source } of FILES) {
    it(`${path} does not reach for useSearchParams`, () => {
      // Reading search params opts a route out of static rendering entirely.
      // The hash is the supported way to address a section; see useHashTarget.
      expect(source).not.toContain("useSearchParams");
    });

    it(`${path} does not force dynamic rendering`, () => {
      expect(source).not.toContain('dynamic = "force-dynamic"');
      expect(source).not.toContain("revalidate = 0");
    });
  }

  for (const { path, source } of FILES) {
    // A SERVER component under [locale] must call setRequestLocale or the route
    // silently becomes dynamic. Client components neither need it nor may use it.
    if (!path.includes("[locale]") || source.includes('"use client"')) continue;
    it(`${path} calls setRequestLocale, or it silently becomes dynamic`, () => {
      const declaresMetadataOnly =
        source.includes("generateMetadata") && !source.includes("setRequestLocale");
      // A metadata-only layout renders no markup and takes no locale-scoped
      // translations at render time, so it is exempt by construction.
      if (declaresMetadataOnly) {
        expect(source).toMatch(/return children/);
        return;
      }
      expect(source).toContain("setRequestLocale(locale)");
    });
  }
});
