#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkPrerendered } from "./prerender-guard.mjs";

const APP_ROUTES = ".next/app-path-routes-manifest.json";
const PRERENDER = ".next/prerender-manifest.json";

function read(path, expectedKey) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    // Report the underlying cause rather than assuming one: a missing file means the
    // build has not run, but a parse error means something wrote it badly, and those
    // need very different fixes.
    console.error(`prerender guard: cannot read ${path}`);
    console.error(`  ${error.message}`);
    console.error("  If the file is missing, run scripts/build first.");
    process.exit(1);
  }
  if (parsed === null || typeof parsed !== "object") {
    console.error(`prerender guard: ${path} is not an object`);
    process.exit(1);
  }
  if (expectedKey && !(expectedKey in parsed)) {
    console.error(`prerender guard: ${path} has no "${expectedKey}" key`);
    console.error("  The manifest shape has changed; this guard needs updating.");
    process.exit(1);
  }
  return parsed;
}

const appRoutes = read(APP_ROUTES);
const prerender = read(PRERENDER, "routes");

// The app's own declaration of which locales must exist. Read rather than inferred:
// if a build stopped emitting French altogether, comparing routes against each other
// would find nothing wrong, because nothing French would remain to compare.
// `locale` is currently the only declared dimension. Any future dynamic param —
// a fixed province list, say — must be added here too, or it falls back to being
// unchecked across pages.
//
// Imports src/i18n/countries.ts directly rather than src/i18n/routing.ts. Both declare
// the same locale list (routing.locales is `allLocales()` from this same registry) —
// but routing.ts itself imports countries.ts with a bare relative specifier
// ("./countries"), which the Next/webpack bundler resolves fine and which tsc accepts
// under "moduleResolution": "bundler", yet Node's own ESM resolver — used here via
// Node's native type stripping, with no bundler in front of it — requires an explicit
// extension on a relative specifier and fails to resolve it. countries.ts has no
// imports of its own (see its file header), so going straight to it sidesteps that
// resolution gap entirely instead of asking routing.ts to write its imports for two
// different resolvers.
let declaredParams = {};
try {
  const { allLocales } = await import("../src/i18n/countries.ts");
  const { routeLocales } = await import("../src/lib/og-manifest.ts");
  const locales = allLocales();
  // An empty or malformed list is not "nothing to check" — it silently restores
  // exactly the blind spot this exists to close, and stays green while doing it.
  if (!Array.isArray(locales) || locales.length === 0) {
    console.error("prerender guard: src/i18n/countries.ts declares no locales");
    console.error(`  got: ${JSON.stringify(locales)}`);
    console.error("  Without them the guard cannot tell that a whole locale went missing.");
    process.exit(1);
  }
  // A FUNCTION of the page pattern, not a flat list: most routes want every
  // registered locale, but RRSP-HBP is Canada-only (US-market spec — no US
  // analogue), so its own requirement is four locales, not six. Extracted the same
  // way sitemap.ts and og-manifest.ts's own consumers do: strip the "/[locale]"
  // prefix and the trailing "/page" to recover the indexable route key ("/", "/rrsp-
  // hbp", ...), then look up ROUTE_COUNTRIES through routeLocales(). A page pattern
  // that maps to no known indexable route (there is none today) gets every locale,
  // which is the conservative direction — it would fail LOUDLY as a "partial"
  // problem below rather than silently stop checking.
  declaredParams = {
    locale: (page) => {
      const stripped = page.replace(/^\/\[locale\]/, "").replace(/\/page$/, "");
      const route = stripped === "" ? "/" : stripped;
      return routeLocales(route, locales);
    },
  };
} catch (error) {
  console.error("prerender guard: cannot read locales from src/i18n/countries.ts");
  console.error(`  ${error.message}`);
  console.error("  Without them the guard cannot tell that a whole locale went missing.");
  process.exit(1);
}

const { pages, problems } = checkPrerendered(appRoutes, prerender, declaredParams);

if (problems.length > 0) {
  console.error("prerender guard: FAILED");
  for (const problem of problems) console.error(`  ${problem.message}`);
  console.error("");
  console.error("Every page route must be prerendered. Cloudflare serves static assets free");
  console.error("and unlimited, but bills on-demand rendering as Worker invocations under a");
  console.error("10ms CPU cap. The usual cause is a server component missing");
  console.error("setRequestLocale(locale) — see");
  console.error("docs/superpowers/specs/2026-08-17-hosting-cicd-design.md");
  process.exit(1);
}

console.log(`prerender guard: ${pages.length} page route(s) fully prerendered`);
