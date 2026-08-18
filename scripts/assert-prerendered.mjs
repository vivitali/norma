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
let declaredParams = {};
try {
  const { routing } = await import("../src/i18n/routing.ts");
  declaredParams = { locale: routing.locales };
} catch (error) {
  console.error("prerender guard: cannot read locales from src/i18n/routing.ts");
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
