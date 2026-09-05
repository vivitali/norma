import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { routing } from "@/i18n/routing";
import type { RouteKey } from "./routes";
import { ROUTE_NAMESPACES, SHARED_NAMESPACES, namespacesFor } from "./route-namespaces";

/**
 * Re-derives, from source, the same thing `route-namespaces.ts`'s doc comment
 * describes by hand: which message namespaces a route's `NextIntlClientProvider`
 * would actually need to carry. This is the guard that keeps `ROUTE_NAMESPACES`
 * from going stale the moment a page starts calling a new namespace — the exact
 * failure mode CLAUDE.md's `messages-coverage.test.ts` doc comment warns about
 * for its own, differently-shaped scan ("six new namespaces shipped copy for an
 * interaction nobody built").
 *
 * The traversal is a static import graph, not a bundler: starting from a route's
 * entry files (`page.tsx`, and its `layout.tsx` when one exists), it follows every
 * local (`@/...` or relative) import transitively and collects the literal
 * argument of every `useTranslations("X")` call it finds. Two deliberate
 * exclusions, both load-bearing:
 *
 * - `getTranslations` (the SERVER function) is never counted — see
 *   `route-namespaces.ts`'s doc comment for why a server-resolved string reaching
 *   a client child is not the same thing as the client needing that namespace
 *   itself.
 * - External packages (`next-intl`, `react`, …) are not followed — only `@/` and
 *   relative specifiers are, since only this app's own modules can contain a call
 *   this scan needs to see.
 *
 * A namespace reached through a DYNAMIC `useTranslations(namespace)` call —
 * `CrossLink`, `TraceLabel` and `LineRows` all take their namespace as a prop
 * rather than a literal — is invisible to this regex by construction. It is not a
 * blind spot in practice: every call site in the app passes its OWN page's
 * namespace as that prop (verified by hand, once, when this test was written —
 * `grep -rn 'namespace='` over `src/app/[locale]` shows Affordability passing
 * "Affordability", ClosingCosts passing "ClosingCosts", and so on, never a
 * neighbour's), which this scan already requires via that page's own direct
 * `useTranslations("<Namespace>")` calls elsewhere. If a future call site ever
 * passes a namespace belonging to a DIFFERENT route than the one rendering it,
 * this scan will not catch it — the same limitation `messages-coverage.test.ts`
 * documents for its own bare-string scan ("a section id and a message key that
 * happen to spell the same word cover for each other").
 */
const SRC = resolve(import.meta.dirname, "..");
const EXTS = [".tsx", ".ts"];

function resolveModule(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) {
    base = join(SRC, spec.slice(2));
  } else if (spec.startsWith(".")) {
    base = resolve(dirname(fromFile), spec);
  } else {
    return null; // external package
  }
  for (const ext of EXTS) {
    if (existsSync(base + ext)) return base + ext;
  }
  for (const ext of EXTS) {
    const idx = join(base, "index" + ext);
    if (existsSync(idx)) return idx;
  }
  return null;
}

function findImportSpecs(source: string): string[] {
  const specs: string[] = [];
  const importRe = /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
  for (const m of source.matchAll(importRe)) specs.push(m[1]);
  const dynImportRe = /import\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of source.matchAll(dynImportRe)) specs.push(m[1]);
  return specs;
}

/** Only `useTranslations` (the client hook) — see the module doc comment for why. */
function findClientNamespaces(source: string): Set<string> {
  const ns = new Set<string>();
  const useTRe = /useTranslations\(\s*["'`]([\w.]+)["'`]/g;
  for (const m of source.matchAll(useTRe)) ns.add(m[1]);
  return ns;
}

function scan(entryFiles: string[]): Set<string> {
  const visited = new Set<string>();
  const queue = [...entryFiles];
  const namespaces = new Set<string>();
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    for (const ns of findClientNamespaces(source)) namespaces.add(ns);
    for (const spec of findImportSpecs(source)) {
      const resolved = resolveModule(spec, file);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return namespaces;
}

const APP_LOCALE_DIR = join(SRC, "app", "[locale]");

/** `/affordability` -> `affordability`; `/` -> "" (the bare `[locale]` directory itself). */
function routeDir(route: RouteKey): string {
  return route === "/" ? "" : route.slice(1);
}

function entryFilesFor(route: RouteKey): string[] {
  const dir = join(APP_LOCALE_DIR, routeDir(route));
  const files = [join(dir, "page.tsx")];
  const layout = join(dir, "layout.tsx");
  if (existsSync(layout)) files.push(layout);
  return files;
}

const ROUTES = Object.keys(routing.pathnames) as RouteKey[];

describe("route-namespaces: the declared table matches what each route's client tree actually calls", () => {
  it("covers every route the app serves", () => {
    // ROUTE_NAMESPACES is a `Record<RouteKey, ...>`, so TypeScript already
    // requires every key to be present at compile time; this is the runtime
    // half, guarding against `routing.pathnames` growing a route the type
    // check ran against a STALE build of this file.
    for (const route of ROUTES) {
      expect(ROUTE_NAMESPACES, route).toHaveProperty(route);
    }
  });

  it.each(ROUTES)("%s: declared namespaces are exactly what the client tree uses", (route) => {
    const actual = scan([...entryFilesFor(route), join(APP_LOCALE_DIR, "layout.tsx")]);
    const declared = new Set(namespacesFor(route));

    const undeclared = [...actual].filter((ns) => !declared.has(ns));
    expect(undeclared, `${route}: used but not in ROUTE_NAMESPACES/SHARED_NAMESPACES`).toEqual([]);

    // The reverse matters too: a declared namespace nothing on the route actually
    // reads is dead weight the eventual pick()-wired provider would ship for no
    // reason — the exact waste this whole derivation exists to eliminate.
    const unused = [...declared].filter((ns) => !actual.has(ns) && !SHARED_NAMESPACES.includes(ns as never));
    expect(unused, `${route}: declared in ROUTE_NAMESPACES but never used`).toEqual([]);
  });
});
