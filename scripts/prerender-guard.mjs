/**
 * Pure logic for the prerender guard — no file I/O, so it is unit-testable.
 *
 * The invariant: every page route must be fully prerendered at build time.
 * Cloudflare serves prerendered HTML as a free, unlimited static asset, but bills
 * anything server-rendered on demand as a Worker invocation under a 10ms CPU cap.
 *
 * Three distinct ways that invariant can break, all checked below:
 *   1. A page route has no prerendered output at all (the classic: a server
 *      component missing `setRequestLocale`).
 *   2. A page route is prerendered for only *some* of its params. Next's
 *      `dynamicParams` defaults to true and the prerender manifest records
 *      `fallback: null`, meaning any param not generated at build time is
 *      rendered on demand — silently, at full Worker cost.
 *   3. A route is "prerendered" but revalidating (`compute` other than "static"),
 *      which is also on-demand work.
 */

const DYNAMIC_SEGMENT = /^\[(?<modifier>\.{3})?(?<name>[^\]]+)\]$/;

function segments(route) {
  return route.split("/").filter(Boolean);
}

/** Page routes as declared by the app, e.g. "/[locale]/affordability". */
export function pageRoutesFrom(appRoutes) {
  return Object.entries(appRoutes)
    .filter(([key]) => key.endsWith("/page"))
    .map(([, route]) => route);
}

/** Concrete prerendered routes grouped by the source pattern they came from. */
export function concreteRoutesBySource(prerender) {
  const bySource = new Map();
  for (const [route, meta] of Object.entries(prerender.routes ?? {})) {
    const source = meta?.srcRoute;
    if (!source) continue;
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push({ route, compute: meta.compute });
  }
  return bySource;
}

/**
 * Positional map of dynamic params in a route pattern: { index -> paramName }.
 * Catch-all segments (`[...slug]`) are skipped: they span a variable number of
 * path segments, so their values cannot be read positionally.
 */
function paramPositions(pattern) {
  const positions = new Map();
  segments(pattern).forEach((segment, index) => {
    const match = DYNAMIC_SEGMENT.exec(segment);
    if (match && !match.groups.modifier) positions.set(index, match.groups.name);
  });
  return positions;
}

/**
 * Which values each param was actually prerendered with, across every page route.
 * Params are matched by name, so `/[locale]` and `/[locale]/affordability` share
 * one expected set — which is what lets us catch a page built for only some locales.
 */
export function observedParamValues(pages, bySource) {
  const observed = new Map();
  for (const page of pages) {
    const positions = paramPositions(page);
    if (positions.size === 0) continue;
    for (const { route } of bySource.get(page) ?? []) {
      const parts = segments(route);
      for (const [index, name] of positions) {
        if (index >= parts.length) continue;
        if (!observed.has(name)) observed.set(name, new Set());
        observed.get(name).add(parts[index]);
      }
    }
  }
  return observed;
}

/**
 * Returns a list of problems; empty means the invariant holds.
 * Each problem is { kind, route, message }.
 */
export function checkPrerendered(appRoutes, prerender, declaredParams = {}) {
  const problems = [];
  const pages = pageRoutesFrom(appRoutes);

  // A guard that silently matches nothing is worse than no guard: it stays green
  // forever while enforcing nothing. If the manifest shape drifts, fail loudly.
  if (pages.length === 0) {
    problems.push({
      kind: "no-pages",
      route: null,
      message:
        "found no page routes at all — the build manifest shape has probably changed, " +
        "so this guard is no longer checking anything",
    });
    return { pages, problems };
  }

  const bySource = concreteRoutesBySource(prerender);
  const expected = observedParamValues(pages, bySource);

  // Observation alone cannot catch a param value disappearing from *every* route —
  // if the build stops emitting French entirely, there is nothing left to compare
  // against. `declaredParams` carries the app's own declaration (routing.locales),
  // so the expected set is authoritative rather than merely inferred.
  for (const [name, values] of Object.entries(declaredParams)) {
    if (!expected.has(name)) expected.set(name, new Set());
    for (const value of values) expected.get(name).add(value);
  }

  for (const page of pages) {
    const concrete = bySource.get(page) ?? [];

    if (concrete.length === 0) {
      problems.push({
        kind: "dynamic",
        route: page,
        message: `${page} is server-rendered on demand`,
      });
      continue;
    }

    for (const { route, compute } of concrete) {
      if (compute !== undefined && compute !== "static") {
        problems.push({
          kind: "compute",
          route,
          message: `${route} is computed "${compute}" rather than "static"`,
        });
      }
    }

    // Every param this route uses must be prerendered for every value seen anywhere.
    const positions = paramPositions(page);
    for (const [index, name] of positions) {
      const wanted = expected.get(name);
      if (!wanted) continue;
      const covered = new Set(
        concrete
          .map(({ route }) => segments(route)[index])
          .filter((value) => value !== undefined),
      );
      const gaps = [...wanted].filter((value) => !covered.has(value)).sort();
      if (gaps.length > 0) {
        problems.push({
          kind: "partial",
          route: page,
          message: `${page} is not prerendered for ${name}=${gaps.join(",")} — those render on demand`,
        });
      }
    }
  }

  return { pages, problems };
}
