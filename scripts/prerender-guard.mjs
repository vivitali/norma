/**
 * Pure logic for the prerender guard — no file I/O, so it is unit-testable.
 *
 * The invariant: every page route must be fully prerendered at build time.
 * Cloudflare serves prerendered HTML as a free, unlimited static asset, but bills
 * anything server-rendered on demand as a Worker invocation under a 10ms CPU cap.
 *
 * Ways that invariant can break, all checked below:
 *   1. A page route has no prerendered output at all (the classic: a server
 *      component missing `setRequestLocale`).
 *   2. A page route is prerendered for only *some* of its params. Next's
 *      `dynamicParams` defaults to true and the prerender manifest records
 *      `fallback: null`, so any param not generated at build time is rendered on
 *      demand — silently, at full Worker cost.
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
 * Positional map of dynamic params in a route pattern: { index -> paramName },
 * plus whether the pattern is positionally checkable at all.
 *
 * A catch-all (`[...slug]`) consumes a variable number of path segments, so any
 * param appearing *after* one cannot be located by index. Rather than compute a
 * wrong answer quietly, such patterns are reported as unsupported.
 */
function paramPositions(pattern) {
  const positions = new Map();
  let catchAllAt = -1;
  let unsupported = false;

  segments(pattern).forEach((segment, index) => {
    const match = DYNAMIC_SEGMENT.exec(segment);
    if (!match) return;
    if (match.groups.modifier) {
      catchAllAt = index;
      return;
    }
    if (catchAllAt !== -1) {
      unsupported = true;
      return;
    }
    positions.set(index, match.groups.name);
  });

  return { positions, unsupported };
}

/**
 * Returns a list of problems; empty means the invariant holds.
 * Each problem is { kind, route, message }.
 *
 * `declaredParams` (e.g. `{ locale: ["en", "fr"] }`) is the app's own statement of
 * which values must exist. It is the ONLY cross-page authority: observed values are
 * scoped to the page they came from, because two unrelated pages that happen to
 * share a param name — `/[locale]/tools/[slug]` and `/[locale]/guides/[slug]` —
 * have entirely unrelated valid values for it, and unioning them would demand
 * `/tools/<a guide slug>` exist.
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
      // Absence is not success: if Next drops or renames this field, the ISR check
      // must go red rather than quietly stop checking.
      if (compute === undefined) {
        problems.push({
          kind: "compute-missing",
          route,
          message: `${route} has no "compute" field — the manifest shape has changed and the on-demand check can no longer run`,
        });
      } else if (compute !== "static") {
        problems.push({
          kind: "compute",
          route,
          message: `${route} is computed "${compute}" rather than "static"`,
        });
      }
    }

    const { positions, unsupported } = paramPositions(page);

    if (unsupported) {
      problems.push({
        kind: "unsupported",
        route: page,
        message: `${page} has a dynamic param after a catch-all segment, which this guard cannot verify positionally`,
      });
      continue;
    }

    for (const [index, name] of positions) {
      // hasOwn, not a bare lookup: a param named [constructor] would otherwise
      // resolve to a function and blow up the spread below.
      if (!Object.hasOwn(declaredParams, name)) continue;
      const raw = declaredParams[name];
      // A ROUTE-SPECIFIC declaration, not just a param-wide one: `raw` may be a
      // function of the page pattern rather than a flat array, because a route can
      // be declared for only SOME of a param's values — RRSP-HBP is Canada-only, so
      // its own `locale` requirement is four locales, not all six. A flat array
      // stays the common case (every other route wants every locale) and needs no
      // caller change.
      const declared = typeof raw === "function" ? raw(page) : raw;

      const covered = new Set(
        concrete
          .map(({ route }) => segments(route)[index])
          .filter((value) => value !== undefined),
      );
      const gaps = [...declared].filter((value) => !covered.has(value)).sort();

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
