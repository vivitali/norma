import type { RouteKey } from "./routes";

/**
 * The declared message-namespace surface for `NextIntlClientProvider`, per route.
 *
 * **Why this exists.** `src/app/[locale]/layout.tsx` currently passes NO `messages`
 * prop to `NextIntlClientProvider` at all, so next-intl falls back to the FULL
 * per-language catalogue resolved by `src/i18n/request.ts` — every namespace, on
 * every route. Verified against a deployed `next build` + `next start` response:
 * `/us/en/affordability`'s `self.__next_f.push` RSC payload carries the same count
 * of "CMHC" as every Canadian page, and every Canadian page carries the same count
 * of "PMI" as the US pages — the whole catalogue rides along regardless of which
 * page is being served.
 *
 * **What this file is, and is not, yet.** This is the DERIVATION step only: the
 * real per-route namespace set, found by tracing which client components each
 * route's page (and, transitively, everything it imports) actually calls
 * `useTranslations(...)` with — see `route-namespaces.test.ts`, which re-derives
 * this set from source on every run and fails if it ever disagrees with the table
 * below. Wiring a scoped `NextIntlClientProvider` per route (via `pick()`-equivalent
 * filtering of the full messages object, likely from each route's own
 * `layout.tsx`, nested inside the root layout's broader one — see that test file's
 * own doc comment for why the ROOT layout cannot do this itself) is a separate,
 * larger change and is NOT made here. Treat `ROUTE_NAMESPACES` as the contract the
 * next commit wires up, not as dead weight: `namespacesFor()` is what a nested
 * provider would call.
 *
 * **`getTranslations` (the SERVER function, `next-intl/server`) is deliberately
 * excluded from this derivation.** It resolves fully server-side —
 * `generateMetadata` in every route's `layout.tsx`, and `AppFooter`, which reads
 * the `Legal` namespace via `getTranslations` and is a Server Component itself —
 * and the resolved STRING is what reaches a client child, never the translator or
 * the namespace. None of that touches `NextIntlClientProvider`'s `messages` prop.
 * Only `useTranslations` (the CLIENT hook, requiring a `NextIntlClientProvider`
 * ancestor) marks a namespace as something the client payload must carry. This is
 * why `Metadata`, `Legal`, `Privacy` and `Terms` appear nowhere below: every one of
 * them is read exclusively through `getTranslations` (Home/legal metadata, and
 * `legal-page.tsx`'s own flat, gesture-free render — see CLAUDE.md, "the pages
 * render flat, so there are no sections to register").
 *
 * **Namespaces shared by every route**, because they render OUTSIDE `{children}`
 * in the root layout (`AppHeader`, which pulls in `CountrySwitcher` and so also
 * needs `Countries`; `AppNav`, needing `Nav`) or are read by the jurisdiction
 * picker that lives in `AppHeader` too (`Jurisdictions`) — listed once here rather
 * than repeated in every route's own array below.
 */
export const SHARED_NAMESPACES = ["AppHeader", "Countries", "Jurisdictions", "Nav"] as const;

/**
 * Each route's OWN namespace needs, beyond `SHARED_NAMESPACES` — its own page
 * namespace, plus whatever shared tool-chrome components its import graph reaches
 * (`Disclosure` for the accordion mechanism `SectionRow` renders through,
 * `Inputs` for `PurchaseInputs`/`InputGroups`, `Provenance` for the sourcing-mark
 * component, `Provinces` for `purchase-inputs.tsx`'s/`input-groups.tsx`'s
 * jurisdiction-family select).
 *
 * `/rrsp-hbp` needs neither `Inputs` nor `Provinces`: it is the one tool page that
 * takes no purchase price and renders no `PurchaseInputs`/`InputGroups` (CLAUDE.md,
 * "A figure the reader has not given ... must not be computed around" — its
 * headline is built from income and an RRSP balance, not a price). `/privacy` and
 * `/terms` need nothing beyond the shared set: `legal-page.tsx` is a Server
 * Component start to finish.
 */
export const ROUTE_NAMESPACES: Record<RouteKey, readonly string[]> = {
  "/": ["Home"],
  "/affordability": ["Affordability", "Disclosure", "Inputs", "Provenance", "Provinces"],
  "/closing-costs": ["ClosingCosts", "Disclosure", "Inputs", "Provenance", "Provinces"],
  "/down-payment": ["DownPayment", "Disclosure", "Inputs", "Provenance", "Provinces"],
  "/rrsp-hbp": ["RrspHbp", "Disclosure", "Provenance"],
  "/amortization": ["Amortization", "Disclosure", "Inputs", "Provenance", "Provinces"],
  "/rent-vs-buy": ["RentVsBuy", "Disclosure", "Inputs", "Provenance", "Provinces"],
  "/scenarios": ["Scenarios", "Disclosure", "Inputs", "Provenance", "Provinces"],
  "/sources": ["Sources", "Disclosure", "Provenance"],
  "/privacy": [],
  "/terms": [],
};

/** The full namespace set a route's `NextIntlClientProvider` needs: its own plus the shared ones. */
export function namespacesFor(route: RouteKey): readonly string[] {
  return [...new Set([...SHARED_NAMESPACES, ...ROUTE_NAMESPACES[route]])];
}
