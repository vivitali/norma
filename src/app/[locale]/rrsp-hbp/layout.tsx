import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { assertRouteAvailable } from "@/lib/route-guard";

/** Metadata only — page.tsx is a client component and cannot export generateMetadata. */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/rrsp-hbp">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.rrspHbp" });
  return buildMetadata({
    locale,
    href: "/rrsp-hbp",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * RRSP-HBP is Canada-only (`ROUTE_COUNTRIES["/rrsp-hbp"] = ["ca"]` — the design
 * spec's own decision, "RRSP-HBP is absent from the US navigation"). This is the
 * one route that call actually changes anything for today; every other route's
 * layout carries the identical call for the same reason `PurchaseInputs`'s own
 * `residency` prop is bound on every page that needs it rather than only the one
 * jurisdiction that currently reads it — a route later restricted to fewer
 * countries gets the guard for free, and a layout that omits the call is the only
 * way this class of bug returns.
 */
export default async function RrspHbpLayout({
  children,
  params,
}: LayoutProps<"/[locale]/rrsp-hbp">) {
  const { locale } = await params;
  assertRouteAvailable(locale, "/rrsp-hbp");
  return children;
}
