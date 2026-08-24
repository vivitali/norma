# SEO and Growth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app findable — a real domain, per-page metadata with canonical and hreflang, a sitemap, robots, a localized 404, JSON-LD, cookieless analytics — without doing any promotion.

**Architecture:** One pure helper, `src/lib/seo.ts`, owns every URL and every `Metadata` object. It derives URLs from `getPathname` (next-intl) and locales from `routing.locales`, so the sitemap, canonicals and hreflang all follow automatically when a locale is added or the URL shape changes. Pages call the helper from `generateMetadata`; nothing constructs a URL by hand.

**Tech Stack:** Next.js 16 App Router · TypeScript · next-intl 4 · Vitest + Testing Library · Cloudflare Workers via `@opennextjs/cloudflare`

**Spec:** `docs/superpowers/specs/2026-08-22-seo-growth-design.md`

## Global Constraints

- **Every page route must stay prerendered.** `scripts/verify-prerender` is the gate. A dynamic page route is a cost regression under Cloudflare's 10ms CPU cap, not a style issue.
- **No hardcoded user-facing copy.** All strings go through `messages/en.json` / `messages/fr.json` and `useTranslations()` / `getTranslations()`. URLs and structural constants are not copy and belong in `src/lib/seo.ts`.
- **Site constants:** `SITE_URL = "https://affordmath.com"`, `SITE_NAME = "AffordMath"`.
- **Title ≤ 60 characters, description ≤ 155 characters**, in *every* locale. French runs 15–20% longer than English and is the one that will break.
- **Never rename the Cloudflare Worker.** It stays `norma` in `wrangler.jsonc`. Renaming creates a new Worker and orphans the old one.
- **No copy may imply adoption.** `PRODUCT.md`: there are no users, no traffic, no testimonials, no press, no revenue. No "trusted by", no "join thousands", no invented counts.
- **No outreach, link building, directory submission or social promotion** in this plan — gated on issue #5 per issue #12 and the `Don't` rule in `CLAUDE.md`.
- `scripts/check` (eslint + tsc + vitest) must pass before any commit. It runs automatically from a post-edit hook.
- Conventional commits. Branch `claude/seo-growth-foundation`. Never push to `main`.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/seo.ts` | **New.** Site constants, `absoluteUrl`, `languageAlternates`, `buildMetadata`, `INDEXABLE_ROUTES`. The only place a URL is constructed. |
| `src/lib/seo.test.ts` | **New.** Unit tests for the above. |
| `src/lib/seo-copy.test.ts` | **New.** Reads the message files and enforces title/description length in every locale. |
| `src/app/[locale]/layout.tsx` | Modify. `metadataBase`, default title, analytics beacon. Loses the per-app title/description block. |
| `src/app/[locale]/page.tsx` | Modify. Own `generateMetadata` + JSON-LD. |
| `src/app/[locale]/affordability/page.tsx` | Modify. Own `generateMetadata`. |
| `src/app/[locale]/sources/page.tsx` | Modify. Own `generateMetadata`. |
| `src/app/[locale]/not-found.tsx` | **New.** Localized 404. |
| `src/app/sitemap.ts` | **New.** Static `sitemap.xml` at build. |
| `src/app/robots.ts` | **New.** Static `robots.txt` at build. |
| `src/components/json-ld.tsx` | **New.** Server component emitting `<script type="application/ld+json">`. |
| `src/components/analytics.tsx` | **New.** Cloudflare beacon; renders nothing without a token. |
| `messages/en.json`, `messages/fr.json` | Modify. Per-page `Metadata.*` keys, brand rename, 404 copy. |
| `src/i18n/routing.ts` | Modify (Task 8). `localePrefix`, `localeDetection`. |
| `scripts/prerender-guard.mjs` | Modify (Task 8). URL-shape-aware locale coverage. |
| `wrangler.jsonc` | Modify (Task 10). `workers_dev: false`. |
| `PRODUCT.md`, `CLAUDE.md`, `README.md` | Modify (Task 9). Brand correction. |
| `~/.claude/skills/seo-website-growth/` | **New** (Task 12). The reusable skill. |

**Ordering rationale.** Tasks 1–7 are URL-shape agnostic: because every URL comes from `getPathname`, they are correct under either `localePrefix` setting. Task 8 changes the URL shape and is the riskiest change in the plan; it is isolated so that dropping it costs nothing else.

---

### Task 1: The SEO helper

**Files:**
- Create: `src/lib/seo.ts`
- Test: `src/lib/seo.test.ts`

**Interfaces:**
- Consumes: `routing` from `@/i18n/routing`.

> **Deviation, applied during execution.** The helper does *not* call
> `getPathname` from `@/i18n/navigation` as originally planned. That module is
> next-intl's react-client navigation factory: it cannot be resolved under
> Vitest (`Cannot find module 'next/navigation'`), and every existing test that
> touches it — `locale-switcher.test.tsx` — mocks it away wholesale, so nothing
> ever exercised it. Importing it would also pull client navigation code into
> `sitemap.ts` and `robots.ts`, which run at build time outside React.
> `seo.ts` therefore implements the prefix rule locally, reading
> `routing.localePrefix` and `routing.pathnames`, and `seo.test.ts` asserts the
> rule directly so the duplication cannot drift.
- Produces:
  - `SITE_URL: string`, `SITE_NAME: string`
  - `INDEXABLE_ROUTES: readonly ["/", "/affordability", "/sources"]`
  - `absoluteUrl(locale: string, href: string): string`
  - `languageAlternates(href: string): Record<string, string>`
  - `buildMetadata(args: { locale: string; href: string; title: string; description: string }): Metadata`

`buildMetadata` takes already-translated strings rather than reading messages itself. That keeps it a pure function with no request context, so it is unit-testable; pages do the `getTranslations` call.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/seo.test.ts
import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  buildMetadata,
  languageAlternates,
} from "./seo";

describe("absoluteUrl", () => {
  it("returns an absolute URL on the canonical host", () => {
    const url = absoluteUrl("en", "/affordability");
    expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
    expect(url.endsWith("/affordability")).toBe(true);
  });

  it("gives each locale a distinct URL", () => {
    expect(absoluteUrl("fr", "/affordability")).not.toBe(
      absoluteUrl("en", "/affordability"),
    );
  });

  it("never emits a double slash", () => {
    expect(absoluteUrl("en", "/")).not.toMatch(/\/\/$/);
  });
});

describe("languageAlternates", () => {
  it("covers every configured locale plus x-default", () => {
    const alternates = languageAlternates("/affordability");
    for (const locale of routing.locales) {
      expect(alternates[locale]).toBe(absoluteUrl(locale, "/affordability"));
    }
    expect(alternates["x-default"]).toBe(
      absoluteUrl(routing.defaultLocale, "/affordability"),
    );
  });
});

describe("buildMetadata", () => {
  const meta = buildMetadata({
    locale: "en",
    href: "/affordability",
    title: "What can you afford?",
    description: "Two ceilings, side by side.",
  });

  it("sets an absolute canonical", () => {
    expect(meta.alternates?.canonical).toBe(absoluteUrl("en", "/affordability"));
  });

  it("carries hreflang for every locale", () => {
    expect(meta.alternates?.languages).toEqual(
      languageAlternates("/affordability"),
    );
  });

  it("sets Open Graph with the site name and canonical url", () => {
    expect(meta.openGraph?.siteName).toBe(SITE_NAME);
    expect(meta.openGraph?.url).toBe(absoluteUrl("en", "/affordability"));
    expect(meta.openGraph?.title).toBe("What can you afford?");
  });

  it("sets a summary_large_image twitter card", () => {
    expect(meta.twitter?.card).toBe("summary_large_image");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — `Failed to resolve import "./seo"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/seo.ts
import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * The canonical host. One host, always absolute: relative canonicals resolve
 * against whatever host served the page, which on a Worker can be the
 * versioned preview hostname, and that is exactly the duplicate we are
 * avoiding.
 */
export const SITE_URL = "https://affordmath.com";
export const SITE_NAME = "AffordMath";

/** Routes that belong in the sitemap. Extend as pages ship. */
export const INDEXABLE_ROUTES = ["/", "/affordability", "/sources"] as const;

export type IndexableRoute = (typeof INDEXABLE_ROUTES)[number];

/**
 * Absolute URL for a route in a locale. Delegates the locale-to-path rule to
 * next-intl rather than reimplementing it, so a change to `localePrefix` — or
 * the French slugs coming in phase 1.5 — propagates here with no edit.
 */
export function absoluteUrl(locale: string, href: string): string {
  const pathname = getPathname({
    locale: locale as (typeof routing.locales)[number],
    href: href as Parameters<typeof getPathname>[0]["href"],
  });
  return new URL(pathname, SITE_URL).toString().replace(/\/$/, "") || SITE_URL;
}

/**
 * hreflang map. Derived from `routing.locales`, never hardcoded: adding a
 * locale must extend hreflang automatically, and `seo.test.ts` fails if it
 * ever stops doing so.
 */
export function languageAlternates(href: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(locale, href);
  }
  languages["x-default"] = absoluteUrl(routing.defaultLocale, href);
  return languages;
}

export function buildMetadata({
  locale,
  href,
  title,
  description,
}: {
  locale: string;
  href: string;
  title: string;
  description: string;
}): Metadata {
  const url = absoluteUrl(locale, href);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(href),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale,
      images: ["/og.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the full gate**

Run: `scripts/check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "feat(seo): add the metadata and canonical URL helper"
```

---

### Task 2: Per-page metadata copy

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `src/lib/seo-copy.test.ts`

**Interfaces:**
- Produces: message keys `Metadata.home.{title,description}`, `Metadata.affordability.{title,description}`, `Metadata.sources.{title,description}`, `Metadata.notFound.{title,description,body,cta}`. Task 3 reads the first three; Task 6 reads the fourth.

The existing flat `Metadata.title` / `Metadata.description` keys are replaced. `messages/parity.test.ts` already enforces that en and fr have identical key sets, so a missing French key fails the suite.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/seo-copy.test.ts
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

const LOCALES = { en, fr } as const;
const PAGES = ["home", "affordability", "sources", "notFound"] as const;

/**
 * Google truncates titles near 60 characters and descriptions near 155.
 * French is the locale that breaks this: it runs 15-20% longer than English
 * for the same sentence, so both locales are checked, not just the source one.
 */
describe("metadata copy", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    for (const page of PAGES) {
      const entry = (messages as Record<string, Record<string, Record<string, string>>>)
        .Metadata[page];

      it(`${locale}/${page} has a title within 60 characters`, () => {
        expect(entry.title).toBeTruthy();
        expect(entry.title.length).toBeLessThanOrEqual(60);
      });

      it(`${locale}/${page} has a description within 155 characters`, () => {
        expect(entry.description).toBeTruthy();
        expect(entry.description.length).toBeLessThanOrEqual(155);
      });
    }
  }

  it("does not imply adoption anywhere in metadata copy", () => {
    const banned = /trusted by|thousands|join \d|millions|#1|award/i;
    for (const messages of Object.values(LOCALES)) {
      const json = JSON.stringify((messages as Record<string, unknown>).Metadata);
      expect(json).not.toMatch(banned);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo-copy.test.ts`
Expected: FAIL — `Cannot read properties of undefined (reading 'title')`, because `Metadata.home` does not exist.

- [ ] **Step 3: Write the copy**

Replace the `"Metadata"` block in `messages/en.json` with:

```json
  "Metadata": {
    "home": {
      "title": "What can you actually afford? — AffordMath",
      "description": "See what you can genuinely afford to buy in Canada — from real net income and real carrying costs, with your province's rules applied."
    },
    "affordability": {
      "title": "Affordability calculator — real cost, not pre-approval",
      "description": "Two ceilings side by side: what a lender would approve, and what fits your actual monthly budget. Your province's tax and cost rules included."
    },
    "sources": {
      "title": "Sources and provenance — AffordMath",
      "description": "Where every figure comes from: which are exact provincial rules, which are estimates, and which are not yet verified."
    },
    "notFound": {
      "title": "Page not found — AffordMath",
      "description": "That page does not exist. The affordability calculator and the sources page are linked below.",
      "body": "That page does not exist.",
      "cta": "Go to the affordability calculator"
    }
  },
```

And in `messages/fr.json`:

```json
  "Metadata": {
    "home": {
      "title": "Que pouvez-vous vraiment vous permettre?",
      "description": "Ce que vous pouvez réellement vous permettre d'acheter au Canada, calculé sur le revenu net et les coûts réels, selon les règles de votre province."
    },
    "affordability": {
      "title": "Calculateur d'abordabilité — le coût réel",
      "description": "Deux plafonds côte à côte : ce qu'un prêteur approuverait, et ce qui tient dans votre budget mensuel réel. Règles fiscales provinciales incluses."
    },
    "sources": {
      "title": "Sources et provenance — AffordMath",
      "description": "D'où vient chaque chiffre : règles provinciales exactes, estimations, et chiffres qui ne sont pas encore vérifiés."
    },
    "notFound": {
      "title": "Page introuvable — AffordMath",
      "description": "Cette page n'existe pas. Le calculateur d'abordabilité et la page des sources sont liés ci-dessous.",
      "body": "Cette page n'existe pas.",
      "cta": "Aller au calculateur d'abordabilité"
    }
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/seo-copy.test.ts messages/parity.test.ts`
Expected: PASS. If any length assertion fails, shorten that string — do not raise the limit.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/fr.json src/lib/seo-copy.test.ts
git commit -m "feat(seo): add per-page metadata copy with length guards"
```

---

### Task 3: Wire per-page metadata into the routes

**Files:**
- Modify: `src/app/[locale]/layout.tsx:44-56`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/app/[locale]/affordability/page.tsx`
- Modify: `src/app/[locale]/sources/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata`, `SITE_URL`, `SITE_NAME` from Task 1; the `Metadata.*` keys from Task 2.

- [ ] **Step 1: Replace the layout's metadata block**

In `src/app/[locale]/layout.tsx`, replace the whole existing `generateMetadata` function with:

```ts
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.home" });

  return {
    // Makes every relative URL in a child page's metadata — OG images above
    // all — resolve against the canonical host rather than the request host.
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: { default: t("title"), template: `%s` },
  };
}
```

Add to the imports at the top of the file:

```ts
import { SITE_NAME, SITE_URL } from "@/lib/seo";
```

The `template: "%s"` is deliberate: pages supply complete titles that are already within 60 characters, so appending a suffix would push them over.

- [ ] **Step 2: Add metadata to the home page**

In `src/app/[locale]/page.tsx`, add above the default export:

```ts
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  return buildMetadata({
    locale,
    href: "/",
    title: t("title"),
    description: t("description"),
  });
}
```

- [ ] **Step 3: Add metadata to the affordability page**

In `src/app/[locale]/affordability/page.tsx`, add the same shape with `namespace: "Metadata.affordability"` and `href: "/affordability"`.

```ts
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/affordability">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.affordability" });
  return buildMetadata({
    locale,
    href: "/affordability",
    title: t("title"),
    description: t("description"),
  });
}
```

- [ ] **Step 4: Add metadata to the sources page**

Same shape in `src/app/[locale]/sources/page.tsx` with `namespace: "Metadata.sources"` and `href: "/sources"`.

- [ ] **Step 5: Verify the pages still prerender**

Run: `scripts/verify-prerender`
Expected: exit 0. `generateMetadata` is async but reads only `params` and messages, so every route stays static. If a route flips to dynamic here, the cause is an accidental use of `headers()` or `searchParams` — not the metadata itself.

- [ ] **Step 6: Run the full gate and commit**

```bash
scripts/check
git add src/app/[locale]
git commit -m "feat(seo): give every route its own title, description and canonical"
```

---

### Task 4: Sitemap

**Files:**
- Create: `src/app/sitemap.ts`
- Test: `src/app/sitemap.test.ts`

**Interfaces:**
- Consumes: `INDEXABLE_ROUTES`, `absoluteUrl`, `languageAlternates` from Task 1.
- Produces: `sitemap(): MetadataRoute.Sitemap` — Next writes `/sitemap.xml` at build.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/sitemap.test.ts
import { describe, expect, it } from "vitest";
import { globSync } from "node:fs";
import { routing } from "@/i18n/routing";
import { INDEXABLE_ROUTES, absoluteUrl } from "@/lib/seo";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("has one entry per route per locale", () => {
    expect(entries).toHaveLength(
      INDEXABLE_ROUTES.length * routing.locales.length,
    );
  });

  it("contains every locale of every indexable route", () => {
    for (const href of INDEXABLE_ROUTES) {
      for (const locale of routing.locales) {
        expect(entries.some((e) => e.url === absoluteUrl(locale, href))).toBe(true);
      }
    }
  });

  it("has no duplicate urls", () => {
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("gives every entry hreflang alternates", () => {
    for (const entry of entries) {
      expect(Object.keys(entry.alternates?.languages ?? {})).toContain("x-default");
    }
  });

  /**
   * Six more pages are coming (Closing Costs, Down Payment, RRSP-HBP,
   * Amortization, Rent vs Buy, Scenarios). Without this, each one ships
   * unlisted and nobody notices, because a short sitemap looks exactly like a
   * correct one. Compares INDEXABLE_ROUTES against the page files on disk.
   */
  it("lists every page route that exists", () => {
    const pageFiles = globSync("src/app/[locale]/**/page.tsx");
    const routesOnDisk = pageFiles
      .map((f) =>
        f
          .replace("src/app/[locale]", "")
          .replace(/\/page\.tsx$/, "")
          .replace(/^$/, "/"),
      )
      .sort();
    expect([...INDEXABLE_ROUTES].sort()).toEqual(routesOnDisk);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/sitemap.test.ts`
Expected: FAIL — cannot resolve `./sitemap`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { INDEXABLE_ROUTES, absoluteUrl, languageAlternates } from "@/lib/seo";

/**
 * Derived from INDEXABLE_ROUTES x routing.locales rather than written out, so
 * a new page or a new locale cannot be silently left out of the sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(locale, href),
      alternates: { languages: languageAlternates(href) },
    })),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/sitemap.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Confirm the sitemap is a static file, not a Worker route**

Run: `scripts/verify-prerender`
Expected: exit 0. `sitemap.ts` has no dynamic inputs, so Next emits `sitemap.xml` as a static asset. The guard checks page routes; a sitemap that had become dynamic would show up as a route in the build output — check `.next/app-path-routes-manifest.json` for `/sitemap.xml` if in doubt.

- [ ] **Step 6: Commit**

```bash
git add src/app/sitemap.ts src/app/sitemap.test.ts
git commit -m "feat(seo): generate a locale-complete sitemap"
```

---

### Task 5: Robots

**Files:**
- Create: `src/app/robots.ts`
- Test: `src/app/robots.test.ts`

**Interfaces:**
- Consumes: `SITE_URL` from Task 1.
- Produces: `robots(): MetadataRoute.Robots` — Next writes `/robots.txt` at build.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/robots.test.ts
import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/seo";
import robots from "./robots";

describe("robots", () => {
  const result = robots();

  it("allows all crawlers", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules[0].userAgent).toBe("*");
    expect(rules[0].allow).toBe("/");
    expect(rules[0].disallow).toBeUndefined();
  });

  it("points at the absolute sitemap url", () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/robots.test.ts`
Expected: FAIL — cannot resolve `./robots`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Nothing is disallowed. The preview hostnames that would otherwise duplicate
 * this content are handled by disabling workers.dev (see wrangler.jsonc), not
 * by a robots rule — a rule here would be served from the preview host too,
 * and would then be wrong for production.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/robots.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/robots.ts src/app/robots.test.ts
git commit -m "feat(seo): add robots.txt declaring the sitemap"
```

---

### Task 6: Localized 404

**Files:**
- Create: `src/app/[locale]/not-found.tsx`
- Test: `src/app/[locale]/not-found.test.tsx`

**Interfaces:**
- Consumes: `Metadata.notFound.{body,cta}` from Task 2; `Link` from `@/i18n/navigation`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/[locale]/not-found.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import NotFound from "./not-found";

function renderNotFound() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NotFound />
    </NextIntlClientProvider>,
  );
}

describe("NotFound", () => {
  it("explains that the page does not exist", () => {
    renderNotFound();
    expect(screen.getByText(messages.Metadata.notFound.body)).toBeInTheDocument();
  });

  it("offers a route back into the app", () => {
    renderNotFound();
    const link = screen.getByRole("link", {
      name: messages.Metadata.notFound.cta,
    });
    expect(link).toHaveAttribute("href", expect.stringContaining("affordability"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/[locale]/not-found.test.tsx`
Expected: FAIL — cannot resolve `./not-found`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/app/[locale]/not-found.tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("Metadata.notFound");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-muted-foreground">{t("body")}</p>
      <p className="mt-6">
        <Link href="/affordability" className="underline underline-offset-4">
          {t("cta")}
        </Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/[locale]/not-found.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Run the gate and commit**

```bash
scripts/check
git add "src/app/[locale]/not-found.tsx" "src/app/[locale]/not-found.test.tsx"
git commit -m "feat(seo): add a localized 404 page"
```

---

### Task 7: JSON-LD structured data

**Files:**
- Create: `src/components/json-ld.tsx`
- Test: `src/components/json-ld.test.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `SITE_NAME`, `SITE_URL`, `absoluteUrl` from Task 1.
- Produces: `<JsonLd data={...} />`, and `webApplicationSchema(locale, description)`.

Only `WebApplication` and `Organization` ship now. `FAQPage` is deliberately excluded: marking up questions that are not visible on the page is a manufactured-markup violation, not a win.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/json-ld.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd, webApplicationSchema } from "./json-ld";
import { SITE_NAME } from "@/lib/seo";

describe("webApplicationSchema", () => {
  const schema = webApplicationSchema("en", "Two ceilings, side by side.");

  it("declares a WebApplication in the finance category", () => {
    expect(schema["@type"]).toBe("WebApplication");
    expect(schema.applicationCategory).toBe("FinanceApplication");
    expect(schema.name).toBe(SITE_NAME);
  });

  it("does not claim a rating, review count or price", () => {
    // PRODUCT.md: no users, no traffic, no testimonials. Rating markup here
    // would be fabricated, and is exactly what earns a manual action.
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("review");
    expect(schema).not.toHaveProperty("offers");
  });
});

describe("JsonLd", () => {
  it("emits parseable ld+json", () => {
    const { container } = render(<JsonLd data={{ "@type": "Thing" }} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent ?? "")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Thing",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/json-ld.test.tsx`
Expected: FAIL — cannot resolve `./json-ld`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/json-ld.tsx
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

type Schema = Record<string, unknown>;

export function webApplicationSchema(locale: string, description: string): Schema {
  return {
    "@type": "WebApplication",
    name: SITE_NAME,
    url: absoluteUrl(locale, "/"),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    inLanguage: locale,
    description,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

/**
 * Rendered from a server component, so the JSON is in the prerendered HTML and
 * costs no client JavaScript. The payload is our own object, never user input.
 */
export function JsonLd({ data }: { data: Schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", ...data }),
      }}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/json-ld.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Render it on the home page**

In `src/app/[locale]/page.tsx`, inside the default export, wrap the returned content:

```tsx
const t = await getTranslations({ locale, namespace: "Metadata.home" });

return (
  <>
    <JsonLd data={webApplicationSchema(locale, t("description"))} />
    <HomeContent />
  </>
);
```

Add the import: `import { JsonLd, webApplicationSchema } from "@/components/json-ld";`

- [ ] **Step 6: Verify, gate, commit**

```bash
scripts/verify-prerender
scripts/check
git add src/components/json-ld.tsx src/components/json-ld.test.tsx "src/app/[locale]/page.tsx"
git commit -m "feat(seo): add WebApplication structured data to the home page"
```

---

### Task 8: Switch English to unprefixed URLs

**Files:**
- Modify: `src/i18n/routing.ts`
- Modify: `src/i18n/routing.test.ts`
- Modify: `scripts/prerender-guard.mjs`
- Modify: `scripts/prerender-guard.test.ts`
- Modify: `scripts/assert-prerendered.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: URL shape `/` and `/affordability` for English, `/fr/...` for French. Task 1's `absoluteUrl` follows automatically because `prefixMode()` reads `routing.localePrefix`.

**Also update `src/lib/seo.test.ts`'s `"locale prefixing"` block** — its two
assertions encode the current `always` shape (`/en/affordability`) on purpose, so
that the URL shape cannot change without a test saying so. Change them to expect
`${SITE_URL}/affordability` for English and leave French prefixed.

**Why this is the risky one.** `prerender-guard.mjs` identifies a route's locale *positionally* — `segments(route)[index]` where `index` is where `[locale]` sits in the pattern. Once English drops its prefix, `/affordability` yields `"affordability"` at index 0, the guard concludes English is missing, and `scripts/verify-prerender` fails. The guard must learn the URL shape before the routing change lands.

This task is self-contained: if it is abandoned, Tasks 1–7 remain correct.

- [ ] **Step 1: Write the failing guard test**

Add to `scripts/prerender-guard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkPrerendered } from "./prerender-guard.mjs";

describe("checkPrerendered with an unprefixed default locale", () => {
  const appRoutes = {
    "/[locale]/page": "/[locale]",
    "/[locale]/affordability/page": "/[locale]/affordability",
  };
  const prerender = {
    routes: {
      "/": { srcRoute: "/[locale]", compute: "static" },
      "/fr": { srcRoute: "/[locale]", compute: "static" },
      "/affordability": { srcRoute: "/[locale]/affordability", compute: "static" },
      "/fr/affordability": {
        srcRoute: "/[locale]/affordability",
        compute: "static",
      },
    },
  };

  it("accepts an unprefixed default locale when told the prefix rule", () => {
    const { problems } = checkPrerendered(appRoutes, prerender, {
      locale: ["en", "fr"],
    }, { unprefixedLocale: "en" });
    expect(problems).toEqual([]);
  });

  it("still catches a genuinely missing locale", () => {
    const missingFrench = {
      routes: {
        "/": { srcRoute: "/[locale]", compute: "static" },
        "/affordability": {
          srcRoute: "/[locale]/affordability",
          compute: "static",
        },
      },
    };
    const { problems } = checkPrerendered(appRoutes, missingFrench, {
      locale: ["en", "fr"],
    }, { unprefixedLocale: "en" });
    expect(problems.map((p) => p.kind)).toContain("partial");
    expect(problems[0].message).toContain("fr");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/prerender-guard.test.ts`
Expected: FAIL — the first case reports `locale=en` as a gap, because the guard does not yet accept the fourth argument.

- [ ] **Step 3: Teach the guard the prefix rule**

In `scripts/prerender-guard.mjs`, change the signature and the coverage computation:

```js
export function checkPrerendered(
  appRoutes,
  prerender,
  declaredParams = {},
  { unprefixedLocale = null } = {},
) {
```

Then, inside the `for (const [index, name] of positions)` loop, replace the `covered` computation with:

```js
      const covered = new Set(
        concrete.map(({ route }) => {
          const value = segments(route)[index];
          // With `localePrefix: "as-needed"` the default locale has no segment
          // of its own, so the value sitting at the locale's index is either
          // the next path segment or nothing at all. Either way the route IS
          // the unprefixed locale — unless the segment is another declared
          // value, which means the prefix is present and belongs to that one.
          if (name === "locale" && unprefixedLocale) {
            const declaredValues = declaredParams[name] ?? [];
            if (value === undefined || !declaredValues.includes(value)) {
              return unprefixedLocale;
            }
          }
          return value;
        }).filter((value) => value !== undefined),
      );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/prerender-guard.test.ts`
Expected: PASS — including every pre-existing test in that file, which must stay green: omitting the fourth argument preserves the old positional behaviour exactly.

- [ ] **Step 5: Pass the prefix rule from the caller**

In `scripts/assert-prerendered.mjs`, after `declaredParams` is built, add:

```js
// next-intl's "as-needed" mode serves the default locale without a prefix.
// Read the mode rather than assuming it, so flipping it back is a one-line
// change here and not a silent guard failure.
const unprefixedLocale =
  routing?.localePrefix === "as-needed" ? routing.defaultLocale : null;
```

and pass it through: `checkPrerendered(appRoutes, prerender, declaredParams, { unprefixedLocale })`.

Note this requires `routing` to remain in scope — move the `const { routing } = await import(...)` result into an outer binding if it is currently scoped to the `try` block.

- [ ] **Step 6: Write the failing routing test**

In `src/i18n/routing.test.ts`, add:

```ts
  it("serves the default locale without a prefix", () => {
    expect(routing.localePrefix).toBe("as-needed");
  });

  it("does not redirect by Accept-Language", () => {
    // Detection would make "/" a redirect for a French-browser visitor,
    // putting a dynamic decision on the most-linked URL in the site.
    expect(routing.localeDetection).toBe(false);
  });
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/i18n/routing.test.ts`
Expected: FAIL — `expected undefined to be 'as-needed'`.

- [ ] **Step 8: Change the routing config**

In `src/i18n/routing.ts`:

```ts
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
});
```

- [ ] **Step 9: Verify the whole chain**

```bash
npx vitest run src/i18n/routing.test.ts src/lib/seo.test.ts src/app/sitemap.test.ts
scripts/check
scripts/verify-prerender
```

Expected: all pass. `verify-prerender` is the one that matters — it proves `/` is a static asset under the new shape.

- [ ] **Step 10: Confirm the URLs by hand**

```bash
npm run dev
```

Check: `http://localhost:3000/` serves English with no redirect · `http://localhost:3000/affordability` works · `http://localhost:3000/fr` serves French · the locale switcher moves between them and preserves the path. Stop the server.

- [ ] **Step 11: Commit**

```bash
git add src/i18n scripts/prerender-guard.mjs scripts/prerender-guard.test.ts scripts/assert-prerendered.mjs
git commit -m "feat(seo): serve English at the apex without a locale prefix"
```

---

### Task 9: Brand rename and documentation correction

**Files:**
- Modify: `messages/en.json`, `messages/fr.json` (`AppHeader.brand`)
- Modify: `PRODUCT.md`, `CLAUDE.md`, `README.md`

**Interfaces:** none — copy and documentation only.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/seo-copy.test.ts`:

```ts
import { SITE_NAME } from "./seo";

describe("brand", () => {
  it("uses the product name in the header, in every locale", () => {
    for (const messages of Object.values(LOCALES)) {
      expect((messages as Record<string, Record<string, string>>).AppHeader.brand)
        .toBe(SITE_NAME);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo-copy.test.ts`
Expected: FAIL — `expected 'norma' to be 'AffordMath'`.

- [ ] **Step 3: Rename the brand string**

In both `messages/en.json` and `messages/fr.json`, change `"brand": "norma"` to `"brand": "AffordMath"`.

**Do not rename these — they are not the brand:**

- `STORE_KEY_V1 = "norma.inputs.v1"` and `STORE_KEY_V2 = "norma.inputs.v2"` in
  `src/lib/storage.ts`. These are localStorage keys on real browsers. Changing them
  silently discards every saved input and defeats the v1 migration.
- The `.norma-range` CSS class in `src/app/globals.css:212` and its use in
  `src/components/affordability/input-groups.tsx:145`.
- The Worker name `norma` in `wrangler.jsonc` (Global Constraints).

- [ ] **Step 3b: Update the header test that asserts the old brand**

`src/components/app-header.test.tsx:20` asserts the brand link by its accessible name:

```ts
expect(screen.getByRole("link", { name: "norma" })).toHaveAttribute("href", "/");
```

Change `"norma"` to `"AffordMath"`. Run `npx vitest run src/components/app-header.test.tsx`
and expect PASS.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/seo-copy.test.ts`
Expected: PASS.

- [ ] **Step 5: Correct PRODUCT.md**

Under `## Brand Commitments`, replace `**Name:** norma, lowercase.` with:

```markdown
- **Name:** AffordMath. `norma` remains the repository and folder name — the
  constellation convention in `~/Developer/CLAUDE.md` governs the repo, not the
  product — and is the internal codename. The public brand is AffordMath, on
  `affordmath.com`.
```

Under `## Positioning`, replace the paragraph beginning "The name carries the thesis" with:

```markdown
The name states the method: the product does the actual arithmetic — net income,
real carrying costs, provincial land transfer tax, semi-annual compounding —
rather than returning a lender's ratio. The internal codename `norma` keeps the
older thesis: the constellation of the Level, the carpenter's square, Latin
*norma*, "rule, standard".
```

- [ ] **Step 6: Correct CLAUDE.md and README.md**

In `CLAUDE.md`, in the opening paragraph under `# norma`, add after the first sentence:

```markdown
The public brand is **AffordMath** (`affordmath.com`); `norma` is the repository
name and internal codename. See
`docs/superpowers/specs/2026-08-22-seo-growth-design.md` §2.
```

Make the equivalent one-line addition to `README.md`'s opening paragraph.

- [ ] **Step 7: Gate and commit**

```bash
scripts/check
git add messages PRODUCT.md CLAUDE.md README.md src/lib/seo-copy.test.ts
git commit -m "feat: rename the product to AffordMath, keeping norma as the codename"
```

---

### Task 10: Analytics and host configuration

**Files:**
- Create: `src/components/analytics.tsx`
- Test: `src/components/analytics.test.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Produces: `<Analytics />` — renders the Cloudflare beacon, or nothing when `NEXT_PUBLIC_CF_BEACON_TOKEN` is unset.

Env-gated so the component is committable before the Cloudflare property exists, and so local development and tests send no beacons.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/analytics.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Analytics } from "./analytics";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Analytics", () => {
  it("renders nothing without a token", () => {
    vi.stubEnv("NEXT_PUBLIC_CF_BEACON_TOKEN", "");
    const { container } = render(<Analytics />);
    expect(container.querySelector("script")).toBeNull();
  });

  it("renders a deferred beacon carrying the token", () => {
    vi.stubEnv("NEXT_PUBLIC_CF_BEACON_TOKEN", "test-token");
    const { container } = render(<Analytics />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
    expect(script?.getAttribute("defer")).not.toBeNull();
    expect(script?.getAttribute("data-cf-beacon")).toContain("test-token");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/analytics.test.tsx`
Expected: FAIL — cannot resolve `./analytics`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/analytics.tsx
/**
 * Cloudflare Web Analytics. Cookieless and server-aggregated, which keeps
 * PRODUCT.md's "nothing is stored on a server" commitment intact and avoids the
 * consent banner that a cookie-based tool would oblige under Quebec's Law 25 —
 * on a site whose French audience is substantially Quebec.
 */
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  if (!token) return null;

  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/analytics.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Mount it in the layout**

In `src/app/[locale]/layout.tsx`, add `import { Analytics } from "@/components/analytics";` and render `<Analytics />` as the last child inside `<body>`.

- [ ] **Step 6: Turn off the workers.dev hostname**

In `wrangler.jsonc`, add at the top level:

```jsonc
  // Production serves only from the custom domain. Leaving workers.dev enabled
  // gives the site a second reachable hostname; Cloudflare marks it noindex,
  // but one canonical host is the point. Preview deploys keep their own
  // versioned hostnames and are unaffected.
  "workers_dev": false,
```

- [ ] **Step 7: Verify, gate, commit**

```bash
scripts/verify-prerender
scripts/check
git add src/components/analytics.tsx src/components/analytics.test.tsx "src/app/[locale]/layout.tsx" wrangler.jsonc
git commit -m "feat(seo): add cookieless analytics and pin the canonical host"
```

---

### Task 11: The Open Graph image

**Files:**
- Create: `scripts/generate-og.mjs`
- Create: `public/og.png` (generated)
- Test: `src/lib/og-image.test.ts`

**Interfaces:**
- Consumes: `SITE_NAME` from Task 1.
- Produces: `public/og.png`, 1200×630, referenced by `buildMetadata`'s `images: ["/og.png"]`.

Generated by a build-time script rather than an `opengraph-image.tsx` route: a route would be a Worker invocation under the 10ms CPU cap, and the prerender guard exists to stop exactly that.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/og-image.test.ts
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const OG_PATH = "public/og.png";

describe("open graph image", () => {
  it("exists", () => {
    expect(existsSync(OG_PATH)).toBe(true);
  });

  it("is a real PNG", () => {
    const header = readFileSync(OG_PATH).subarray(0, 8);
    expect([...header]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("is large enough to be the 1200x630 card and small enough to serve", () => {
    const bytes = readFileSync(OG_PATH).length;
    expect(bytes).toBeGreaterThan(5_000);
    expect(bytes).toBeLessThan(1_000_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/og-image.test.ts`
Expected: FAIL — `expected false to be true`, the file does not exist.

- [ ] **Step 3: Write the generator**

```js
// scripts/generate-og.mjs
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";

/**
 * Renders the social card once, at author time, into public/og.png.
 * Deliberately NOT an opengraph-image route: a route renders per request on the
 * Worker, under a 10ms CPU cap, for an image that never changes.
 * Re-run with: node scripts/generate-og.mjs
 */
const image = new ImageResponse(
  {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#0b0b0c",
        color: "#fafafa",
        fontSize: 64,
        fontWeight: 600,
      },
      children: [
        { type: "div", props: { children: "AffordMath" } },
        {
          type: "div",
          props: {
            style: { fontSize: 36, marginTop: 24, color: "#a1a1aa", lineHeight: 1.3 },
            children:
              "What a lender would approve, and what you can actually carry.",
          },
        },
      ],
    },
  },
  { width: 1200, height: 630 },
);

writeFileSync("public/og.png", Buffer.from(await image.arrayBuffer()));
console.log("wrote public/og.png");
```

- [ ] **Step 4: Generate the image**

Run: `node scripts/generate-og.mjs`
Expected: `wrote public/og.png`.

If `next/og` cannot resolve outside the bundler, the fallback is to export the card once from any image tool at 1200×630 and save it to `public/og.png` — the test asserts the artifact, not the method, and the metadata reference in Task 1 is already correct either way.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/og-image.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-og.mjs public/og.png src/lib/og-image.test.ts
git commit -m "feat(seo): add the Open Graph card"
```

---

### Task 12: Record the reusable skill

**Files:**
- Create: `~/.claude/skills/seo-website-growth/SKILL.md`
- Create: `~/.claude/skills/seo-website-growth/SKILL_SUMMARY.json`
- Create: `~/.claude/skills/seo-website-growth/scripts/rdap.sh`
- Create: `~/.claude/skills/seo-website-growth/references/domain-strategy.md`

**Interfaces:** none — installed at user scope, outside the repo, so it is invocable from any project.

- [ ] **Step 1: Create the skill directory and the availability script**

```bash
mkdir -p ~/.claude/skills/seo-website-growth/{scripts,references}
```

```bash
cat > ~/.claude/skills/seo-website-growth/scripts/rdap.sh <<'EOF'
#!/bin/zsh
# Parallel .com availability check. 404 = available, 200 = registered.
# The domain MUST include the TLD: rdap.verisign.com/com/v1/domain/foo returns
# 404 for everything, which reports google.com as available.
check() {
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    "https://rdap.verisign.com/com/v1/domain/$1.com")
  case $code in
    404) print "AVAILABLE   $1.com" ;;
    200) print "REGISTERED  $1.com" ;;
    *)   print "??($code)     $1.com" ;;
  esac
}
# Controls. If either fails, the sweep is lying and every result is void.
c1=$(check google); c2=$(check zxqv7k3mfp2wnb8)
case "$c1" in REGISTERED*) ;; *) print "CONTROL FAILED: $c1"; exit 1 ;; esac
case "$c2" in AVAILABLE*)  ;; *) print "CONTROL FAILED: $c2"; exit 1 ;; esac
print "controls ok"
for n in "$@"; do check "$n" & done
wait
EOF
chmod +x ~/.claude/skills/seo-website-growth/scripts/rdap.sh
```

- [ ] **Step 2: Verify the script's controls actually fire**

Run: `~/.claude/skills/seo-website-growth/scripts/rdap.sh example wikipedia`
Expected: `controls ok`, then both reported REGISTERED. A script that reports these as available has the TLD bug.

- [ ] **Step 3: Write the reference document**

```bash
cat > ~/.claude/skills/seo-website-growth/references/domain-strategy.md <<'EOF'
# Domain strategy reference

## Renewal cliffs — check renewal, never registration

Cheap first-year TLDs renew at multiples. Verified 2026-08-22 via Porkbun's
public pricing API (`https://api.porkbun.com/api/json/v3/pricing/get`, no auth):

| TLD | Registration | Renewal |
|---|---|---|
| .com | $11.08 | $11.08 |
| .ca | $8.88 | $9.18 |
| .app | $8.75 | $14.93 |
| .money | $10.81 | $28.32 |
| .site | $1.96 | $28.84 |
| .help | $1.54 | $26.26 |
| .mortgage | $8.24 | **$49.95** |

Rule: `.com` flat beats any cliff TLD past year one.

## ccTLD presence requirements

`.ca` requires CIRA Canadian Presence — citizen, permanent resident, or a
Canadian legal entity or trademark. Ask before recommending it. Equivalents:
`.de` (German address), `.fr` (EU), `.au` (Australian ABN).

A ccTLD is a geographic signal to search engines. That is a limitation for a
global product and an advantage for one that is genuinely single-country.

## Availability checking — three traps

1. **`dig NS` is not an availability check.** Parked and squatted domains
   routinely have no nameservers. It reports registered domains as free.
2. **RDAP needs the full domain.** `.../domain/foo` 404s for everything;
   it must be `.../domain/foo.com`. Always run controls.
3. **zsh does not word-split unquoted variables.** `for d in $list` iterates
   once over the entire string. Use an array, `${=list}`, or literal arguments.

## Naming under a bilingual constraint

If a second locale is promoted, English function-word prefixes (`try-`, `get-`,
`use-`, `ask-`, `hello-`) mark the product as monolingual to that audience.
Prefer morphemes that survive translation: `calc` (calculator / calculateur /
cálculo), `app`, `plan`, `index`, `budget`, `point`.

Check whether the existing name already survives. Latin-rooted words often do:
`norma` is a correct word in English, French, Spanish and Ukrainian at once.

## Sequence

1. Sweep bare brand across credible TLDs — the bare brand is worth real money.
2. Sweep semantic field synonyms.
3. Sweep compounds with translation-surviving suffixes.
4. Sweep coined 6-9 letter forms. Five-letter pronounceable .com is exhausted.
5. Verify finalists with whois or RDAP, never DNS.
6. Trademark check before any spend (CIPO in Canada, USPTO TESS in the US).
EOF
```

- [ ] **Step 4: Write SKILL.md**

```bash
cat > ~/.claude/skills/seo-website-growth/SKILL.md <<'EOF'
---
name: seo-website-growth
description: Use when building or launching a website that needs to be found - covers domain selection, technical SEO foundation (metadata, canonical, hreflang, sitemap, robots, structured data), analytics setup, and a staged promotion plan. Also use when asked to make an existing site rank, pick a domain name, or plan content and link building.
---

# SEO Website Builder and Growth Agent

Turns a product into a findable one: domain, technical foundation, content
architecture, analytics, promotion — in that order, because each depends on the
last.

## The rule that outranks the rest

**Never promote what you cannot yet vouch for.** If the product's data is
unverified, its claims are unproven, or its core promise is accuracy it has not
yet earned, build the foundation and stop there. Outreach converts a quiet
problem into a public one: a wrong figure in a page nobody visits is a bug; the
same figure in an article you pitched is the story about your product.

Foundation work — domain, metadata, hreflang, sitemap, analytics, URL
structure — is safe in every case and depends on none of it. Gate only the
audience-seeking: outreach, link building, directory submission, social pushes.

## Inputs required

- Niche, and what the site is for
- Target audience: country, language(s), who they are
- Primary goal, ranked: traffic / leads / sales / brand
- Budget for domain and hosting per year
- Existing assets: brand, content, socials, audience, domain
- Sustainable publishing effort per week after launch
- **Whether anything about the product is not yet true** — see the rule above

## Workflow

1. **Discovery.** Ask the above. Read the repository before asking what it can
   answer: README, product docs, message files, route list, deploy config.
   Missing a folder and asking anyway wastes the user's turn.
2. **Domain.** Follow `references/domain-strategy.md`. Sweep with
   `scripts/rdap.sh`. Check renewals, not registration prices. Confirm ccTLD
   eligibility before recommending one. Trademark-check before spend.
3. **Architecture.** Decide the URL shape before launch — it is free exactly
   once. Prefer the primary locale unprefixed at the apex. Locale prefixes,
   canonical host, and trailing-slash policy are all migrations later.
4. **Technical foundation.** One helper owns every URL. Derive hreflang and the
   sitemap from the locale list, never hardcode them, and test that adding a
   locale cannot silently skip either. Per-page titles and descriptions with
   length guards in every locale.
5. **Content.** Map keywords to pages that exist or are planned; never invent a
   page to chase a keyword. Be honest about head terms you cannot win against
   incumbents, and find the long tail your data uniquely supports.
6. **Analytics.** Prefer cookieless (Cloudflare Web Analytics, Plausible) — it
   removes the consent banner and the privacy exposure at once. Search Console
   via DNS verification. Submit the sitemap. Import to Bing.
7. **Promotion.** Only past the gate. Directories, outreach templates, social
   cadence, community contribution — value-first, never volume-first.

## Outputs

Domain and hosting recommendation with verified prices · technical SEO
implementation with tests · keyword map · content calendar · analytics and
Search Console setup · staged promotion plan · this skill, updated.

## Reuse notes

Adapt by changing the keyword map and the promotion channels; the technical
foundation is identical across niches. Extend with: programmatic page
generation from structured data, internal-link graph analysis, Core Web Vitals
budgets, conversion tracking.

The highest-leverage move is usually programmatic: if the project owns
structured data nobody else has, one page per entity beats any amount of
writing. Sequence it after the data is verified, never before.
EOF
```

- [ ] **Step 5: Write SKILL_SUMMARY.json**

```bash
cat > ~/.claude/skills/seo-website-growth/SKILL_SUMMARY.json <<'EOF'
{
  "skill_name": "SEO Website Builder & Growth Agent",
  "description": "Takes a product from unfindable to findable: domain selection with verified pricing, technical SEO foundation (per-page metadata, canonical, hreflang, sitemap, robots, structured data), analytics, and a staged promotion plan gated on the product's claims being true.",
  "inputs": [
    "niche and purpose",
    "target audience: country, languages, demographics",
    "primary goal, ranked",
    "annual budget for domain and hosting",
    "existing assets",
    "sustainable publishing effort per week",
    "anything about the product that is not yet true"
  ],
  "outputs": [
    "domain and hosting recommendation with verified renewal pricing",
    "URL and locale architecture decision",
    "technical SEO implementation with tests",
    "keyword map bound to real pages",
    "content calendar",
    "analytics and Search Console setup",
    "staged promotion plan with outreach templates",
    "this skill document"
  ],
  "version": "1.0",
  "last_updated": "2026-08-22"
}
EOF
```

- [ ] **Step 6: Verify the skill is discoverable**

Run: `ls -R ~/.claude/skills/seo-website-growth && head -5 ~/.claude/skills/seo-website-growth/SKILL.md`
Expected: four files present, and SKILL.md opening with valid YAML frontmatter containing `name:` and `description:`.

- [ ] **Step 7: Note it in the repo**

The skill lives outside the repo, so nothing here is committed for it. Add one line to `CLAUDE.md` under `## Workflow`:

```markdown
SEO and growth work uses the `seo-website-growth` skill (`~/.claude/skills/`),
which carries the domain-sweep tooling and the rule that promotion waits on
verified claims.
```

```bash
git add CLAUDE.md
git commit -m "docs: point at the seo-website-growth skill"
```

---

## Manual steps — these need you at a keyboard

Not automatable; nothing above depends on them except the final deploy.

- [ ] **Register `affordmath.com`.** Cloudflare dashboard → Domain Registration → Register. Wholesale price, WHOIS privacy included. Fallback: Porkbun at $11.08, then change nameservers to Cloudflare.
- [ ] **Trademark sanity check.** `ised-isde.canada.ca` Canadian Trademarks Database, search "affordmath" and "afford math". Two minutes, before any spend on print or payment setup.
- [ ] **Attach the custom domain.** Workers & Pages → `norma` → Settings → Domains & Routes → Add custom domain → `affordmath.com`. Then add `www.affordmath.com` and a Redirect Rule sending it to the apex, 301.
- [ ] **Create the Web Analytics property.** Cloudflare → Web Analytics → Add site → `affordmath.com`. Copy the token into the repository secret / `.env` as `NEXT_PUBLIC_CF_BEACON_TOKEN`, and into the GitHub Actions environment so production builds include it.
- [ ] **Google Search Console.** Add a *domain* property for `affordmath.com`, verify by DNS TXT in Cloudflare, submit `https://affordmath.com/sitemap.xml`.
- [ ] **Bing Webmaster Tools.** Add site, import from Search Console.
- [ ] **Edit issue #1** to scope it to `es` only and note `uk` as deferred, per spec §5.

## Do not do

Per spec §11, `CLAUDE.md`, and issue #12: **no outreach, link building, directory
submission or social promotion until issue #5 lands.** Every jurisdiction figure
is still an unverified placeholder.

Also out of scope here, each needing its own spec: the programmatic jurisdiction
pages (§7 — the highest-leverage SEO move available, sequenced after data
verification and after phase 1.5's `pathnames`), the content calendar and sample
posts (§8), and French route slugs.
