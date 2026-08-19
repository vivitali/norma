import { describe, expect, it } from "vitest";
import { checkPrerendered } from "./prerender-guard.mjs";

/**
 * Fixtures mirror the real shape of Next 16's build manifests, captured from an
 * actual `next build` of this app.
 */
const APP_ROUTES = {
  "/[locale]/affordability/page": "/[locale]/affordability",
  "/[locale]/page": "/[locale]",
  "/_global-error/page": "/_global-error",
  "/_not-found/page": "/_not-found",
  "/favicon.ico/route": "/favicon.ico",
};

function route(srcRoute: string, compute = "static") {
  return { routeType: "page", compute, srcRoute };
}

const ALL_STATIC = {
  routes: {
    "/_global-error": route("/_global-error"),
    "/_not-found": route("/_not-found"),
    "/en": route("/[locale]"),
    "/en/affordability": route("/[locale]/affordability"),
    "/favicon.ico": route("/favicon.ico"),
    "/fr": route("/[locale]"),
    "/fr/affordability": route("/[locale]/affordability"),
  },
};

const LOCALES = { locale: ["en", "fr"] };

function messages(appRoutes: object, prerender: object, declared: object = LOCALES) {
  return checkPrerendered(appRoutes, prerender, declared).problems.map(
    (p: { message: string }) => p.message,
  );
}

describe("prerender guard", () => {
  it("passes when every page route is prerendered for every locale", () => {
    const { pages, problems } = checkPrerendered(APP_ROUTES, ALL_STATIC);
    expect(problems).toEqual([]);
    // /favicon.ico is a route handler, not a page, so it is not counted.
    expect(pages).toHaveLength(4);
  });

  it("fails when a page route is server-rendered on demand", () => {
    const prerender = { routes: { ...ALL_STATIC.routes } };
    delete (prerender.routes as Record<string, unknown>)["/en/affordability"];
    delete (prerender.routes as Record<string, unknown>)["/fr/affordability"];

    expect(messages(APP_ROUTES, prerender)).toContain(
      "/[locale]/affordability is server-rendered on demand",
    );
  });

  // The bug this guard exists to catch is invisible by construction, so a guard
  // that matches nothing must fail rather than report success.
  it("fails loudly when it finds no page routes at all", () => {
    const [problem] = checkPrerendered({}, ALL_STATIC).problems;
    expect(problem.kind).toBe("no-pages");
    expect(problem.message).toContain("no longer checking anything");
  });

  it("fails when the manifest keys stop matching the expected shape", () => {
    // Simulates Next renaming the "/page" suffix — the guard must not silently pass.
    const renamed = { "/[locale]/route.js": "/[locale]" };
    expect(checkPrerendered(renamed, ALL_STATIC).problems[0].kind).toBe("no-pages");
  });

  // dynamicParams defaults to true and the manifest records fallback: null, so a
  // locale missing from generateStaticParams renders on demand at full Worker cost.
  it("fails when a page is prerendered for only some locales", () => {
    const prerender = { routes: { ...ALL_STATIC.routes } };
    delete (prerender.routes as Record<string, unknown>)["/fr/affordability"];

    expect(messages(APP_ROUTES, prerender)).toContain(
      "/[locale]/affordability is not prerendered for locale=fr — those render on demand",
    );
  });

  it("reports every missing locale for a route", () => {
    const appRoutes = { ...APP_ROUTES, "/[locale]/closing-costs/page": "/[locale]/closing-costs" };
    const prerender = {
      routes: { ...ALL_STATIC.routes, "/en/closing-costs": route("/[locale]/closing-costs") },
    };

    expect(messages(appRoutes, prerender)).toContain(
      "/[locale]/closing-costs is not prerendered for locale=fr — those render on demand",
    );
  });

  // Next's own error pages are asserted like any other page: a dynamic /_not-found
  // means every 404 — most of which is bot traffic on a public site — is billed.
  it("fails when Next's internal error pages stop being prerendered", () => {
    const prerender = { routes: { ...ALL_STATIC.routes } };
    delete (prerender.routes as Record<string, unknown>)["/_not-found"];

    expect(messages(APP_ROUTES, prerender)).toContain(
      "/_not-found is server-rendered on demand",
    );
  });

  it("fails when a prerendered route revalidates instead of being static", () => {
    const prerender = {
      routes: { ...ALL_STATIC.routes, "/en": route("/[locale]", "blocking") },
    };

    expect(messages(APP_ROUTES, prerender)).toContain(
      '/en is computed "blocking" rather than "static"',
    );
  });

  // Observation alone cannot catch this: with no French route left anywhere, there
  // is nothing to compare against. The declared locales make the check authoritative.
  it("fails when an entire locale disappears from the build", () => {
    const prerender = { routes: { ...ALL_STATIC.routes } };
    delete (prerender.routes as Record<string, unknown>)["/fr"];
    delete (prerender.routes as Record<string, unknown>)["/fr/affordability"];

    expect(checkPrerendered(APP_ROUTES, prerender, {}).problems).toEqual([]);

    const withDeclared = checkPrerendered(APP_ROUTES, prerender, {
      locale: ["en", "fr"],
    }).problems.map((p: { message: string }) => p.message);

    expect(withDeclared).toContain(
      "/[locale] is not prerendered for locale=fr — those render on demand",
    );
    expect(withDeclared).toContain(
      "/[locale]/affordability is not prerendered for locale=fr — those render on demand",
    );
  });

  it("flags a newly declared locale that nothing prerenders yet", () => {
    const problems = checkPrerendered(APP_ROUTES, ALL_STATIC, {
      locale: ["en", "fr", "uk"],
    }).problems;
    expect(problems.map((p: { message: string }) => p.message)).toContain(
      "/[locale] is not prerendered for locale=uk — those render on demand",
    );
  });

  it("treats route groups as ordinary routes", () => {
    // Next strips the group from the manifest value, so it matches srcRoute directly.
    const appRoutes = { "/(marketing)/[locale]/page": "/[locale]" };
    const prerender = {
      routes: { "/en": route("/[locale]"), "/fr": route("/[locale]") },
    };
    expect(checkPrerendered(appRoutes, prerender).problems).toEqual([]);
  });

  // Two unrelated pages sharing a param name have unrelated valid values. Unioning
  // observed values across pages would demand /tools/<a guide slug> exist.
  it("does not cross-contaminate param values between unrelated pages", () => {
    const appRoutes = {
      "/[locale]/tools/[slug]/page": "/[locale]/tools/[slug]",
      "/[locale]/guides/[slug]/page": "/[locale]/guides/[slug]",
    };
    const prerender = {
      routes: {
        "/en/tools/mortgage": route("/[locale]/tools/[slug]"),
        "/fr/tools/mortgage": route("/[locale]/tools/[slug]"),
        "/en/guides/first-home": route("/[locale]/guides/[slug]"),
        "/fr/guides/first-home": route("/[locale]/guides/[slug]"),
      },
    };

    expect(checkPrerendered(appRoutes, prerender, LOCALES).problems).toEqual([]);
  });

  // Absence of the field is not success: a renamed field must go red, not quiet.
  it("fails when the compute field disappears from the manifest", () => {
    const prerender = {
      routes: { ...ALL_STATIC.routes, "/en": { routeType: "page", srcRoute: "/[locale]" } },
    };

    expect(messages(APP_ROUTES, prerender)).toContain(
      '/en has no "compute" field — the manifest shape has changed and the on-demand check can no longer run',
    );
  });

  // A catch-all consumes a variable number of segments, so anything after it
  // cannot be located by index. Refuse rather than compute a wrong answer.
  it("refuses to guess when a param follows a catch-all", () => {
    const appRoutes = { "/[...path]/[locale]/page": "/[...path]/[locale]" };
    const prerender = { routes: { "/a/b/en": route("/[...path]/[locale]") } };

    expect(messages(appRoutes, prerender)).toContain(
      "/[...path]/[locale] has a dynamic param after a catch-all segment, which this guard cannot verify positionally",
    );
  });

  it("still checks params that precede a catch-all", () => {
    const appRoutes = { "/[locale]/docs/[...path]/page": "/[locale]/docs/[...path]" };
    const prerender = { routes: { "/en/docs/a/b": route("/[locale]/docs/[...path]") } };

    expect(messages(appRoutes, prerender)).toContain(
      "/[locale]/docs/[...path] is not prerendered for locale=fr — those render on demand",
    );
  });

  it("tolerates a manifest with no prerendered routes at all", () => {
    const problems = checkPrerendered(APP_ROUTES, { routes: {} }).problems;
    expect(problems).toHaveLength(4);
    expect(problems.every((p: { kind: string }) => p.kind === "dynamic")).toBe(true);
  });
});
