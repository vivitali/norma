import { defineRouting } from "next-intl/routing";

/**
 * `scripts/assert-prerendered.mjs` imports this file directly with Node's type
 * stripping to learn which locales must be prerendered. That means this module has
 * to stay trivially evaluable outside the Next build: no `@/` path aliases (Node
 * does not read tsconfig `paths`), no JSON imports, no env vars. If you need one of
 * those here, the guard needs another way to read the locale list — CI will go red
 * rather than silently stop checking, but it will be red until you fix it.
 */
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
});
