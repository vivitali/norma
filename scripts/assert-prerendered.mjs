#!/usr/bin/env node
import { readFileSync } from "node:fs";

const APP_ROUTES = ".next/app-path-routes-manifest.json";
const PRERENDER = ".next/prerender-manifest.json";

// Next's own error pages, not routes we author.
const INTERNAL = new Set(["/_not-found", "/_global-error"]);

function read(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    // Report the underlying cause rather than assuming one: a missing file means the
    // build has not run, but a parse error means something wrote it badly, and those
    // need very different fixes.
    console.error(`prerender guard: cannot read ${path}`);
    console.error(`  ${error.message}`);
    console.error("  If the file is missing, run scripts/build first.");
    process.exit(1);
  }
}

const appRoutes = read(APP_ROUTES);
const prerender = read(PRERENDER);

// Every prerendered concrete route records the source route it was generated from.
// Deriving the set this way means the guard keeps covering pages added later, and
// keeps working if route slugs are localized.
const prerendered = new Set(
  Object.values(prerender.routes).map((route) => route.srcRoute),
);

const pages = Object.entries(appRoutes)
  .filter(([key]) => key.endsWith("/page"))
  .map(([, route]) => route)
  .filter((route) => !INTERNAL.has(route));

const dynamic = pages.filter((route) => !prerendered.has(route));

if (dynamic.length > 0) {
  console.error("prerender guard: these page routes are server-rendered on demand:");
  for (const route of dynamic) console.error(`  ƒ ${route}`);
  console.error("");
  console.error("Every page must be prerendered. Cloudflare serves static assets free and");
  console.error("unlimited, but bills dynamic routes as Worker invocations and runs them");
  console.error("under a 10ms CPU cap. The usual cause is a server component missing");
  console.error("setRequestLocale(locale) — see");
  console.error("docs/superpowers/specs/2026-08-17-hosting-cicd-design.md");
  process.exit(1);
}

console.log(`prerender guard: ${pages.length} page route(s) prerendered`);
