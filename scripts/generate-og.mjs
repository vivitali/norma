import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ImageResponse } from "next/dist/server/og/image-response.js";
import { allLocales, countryOf, languageOf } from "../src/i18n/countries.ts";
import { INDEXABLE_ROUTES, ROUTE_METADATA_KEY, routeLocales } from "../src/lib/og-manifest.ts";

// Imports src/i18n/countries.ts directly rather than src/i18n/routing.ts. routing.ts
// itself imports countries.ts with a bare relative specifier ("./countries"), which
// the Next/webpack bundler and tsc both resolve fine but which Node's own ESM
// resolver — used here via Node's native type stripping, with no bundler in front of
// it — rejects outright (it requires an explicit extension on a relative specifier).
// countries.ts has no imports of its own, so going straight to it sidesteps that
// resolution gap; see scripts/assert-prerendered.mjs and scripts/smoke, which do the
// same for the same reason.
const LOCALES = allLocales();

/**
 * Renders one social card per route per locale into public/og/<locale>/<slug>.png.
 *
 * Author-time, not a route: an opengraph-image route renders per request on the
 * Worker under a 10ms CPU cap, for images that never change.
 *
 * next has no "./og" entry in its export map, hence the deep import.
 *
 * Re-run after changing a Metadata title: node scripts/generate-og.mjs
 */

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * IBM Plex Sans, matching the app. Not decoration: the default font has no
 * Cyrillic coverage, so every Ukrainian card would render as blank boxes.
 *
 * Served from @fontsource via jsDelivr rather than the Google Fonts CSS API.
 * Google now hands out an extensionless /l/font?kit=... URL whose payload is
 * not a format satori can read, regardless of the User-Agent trick that used
 * to force TTF.
 *
 * satori reads TTF, OTF and WOFF — but NOT WOFF2. The magic-number check below
 * matters because a WOFF2 payload does not throw; it renders every glyph blank.
 */
const FONT_BASE = "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5/files";

async function loadFont(subset, weight) {
  const url = `${FONT_BASE}/ibm-plex-sans-${subset}-${weight}-normal.woff`;
  const data = new Uint8Array(await fetch(url).then((r) => r.arrayBuffer()));

  const magic = String.fromCharCode(...data.subarray(0, 4));
  const isTtf = data[0] === 0 && data[1] === 1 && data[2] === 0 && data[3] === 0;
  if (!isTtf && !["wOFF", "true", "ttcf", "OTTO"].includes(magic)) {
    throw new Error(`${subset} ${weight}: expected TTF/OTF/WOFF, got "${magic}" — satori cannot read it`);
  }
  return data;
}

function card({ title, fonts }) {
  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0b0b0c",
          color: "#fafafa",
          fontFamily: "IBM Plex Sans",
        },
        children: [
          {
            type: "div",
            props: {
              style: { fontSize: 30, fontWeight: 600, color: "#a1a1aa", letterSpacing: "0.02em" },
              children: "AffordMath",
            },
          },
          {
            type: "div",
            props: {
              style: { fontSize: 60, fontWeight: 600, lineHeight: 1.15, maxWidth: "980px" },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: { fontSize: 26, fontWeight: 400, color: "#71717a" },
              children: "affordmath.com",
            },
          },
        ],
      },
    },
    { width: WIDTH, height: HEIGHT, fonts },
  );
}

// Catalogues stay one file per LANGUAGE (messages/en.json, not messages/en-CA.json) —
// see src/i18n/countries.ts — so this reads by languageOf(locale), not by the locale
// pair itself.
const messages = Object.fromEntries(
  await Promise.all(
    LOCALES.map(async (locale) => [
      locale,
      JSON.parse(
        await import("node:fs").then((fs) =>
          fs.readFileSync(`messages/${languageOf(locale)}.json`, "utf8"),
        ),
      ),
    ]),
  ),
);

// Both subsets at both weights. satori falls back across the supplied fonts
// per glyph, which is how a Cyrillic title renders next to a Latin brand name.
const fonts = [];
for (const weight of [400, 600]) {
  for (const subset of ["latin", "cyrillic"]) {
    fonts.push({
      name: "IBM Plex Sans",
      data: await loadFont(subset, weight),
      weight,
      style: "normal",
    });
  }
}

let written = 0;
for (const href of INDEXABLE_ROUTES) {
  // Scoped to the route's own availability: RRSP-HBP has no en-US or es-US card to
  // write, because it has no en-US or es-US page — see ROUTE_COUNTRIES in
  // og-manifest.ts.
  for (const locale of routeLocales(href, LOCALES)) {
    const key = ROUTE_METADATA_KEY[href];
    const entry = messages[locale].Metadata[key];
    // A page whose title genuinely differs by country (Home, Amortization, Rent vs Buy —
    // see each route's layout.tsx) carries a `title_us` fork read through `countryKey()`;
    // this mirrors that selection so a US card never renders the Canadian title.
    const title = (countryOf(locale) === "us" && entry?.title_us) || entry?.title;
    if (!title) throw new Error(`missing Metadata.${key}.title for ${locale}`);

    const slug = href === "/" ? "home" : href.replace(/^\//, "");
    const path = `public/og/${locale}/${slug}.png`;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(await card({ title, fonts }).arrayBuffer()));
    written += 1;
  }
}
console.log(`wrote ${written} cards to public/og/`);
