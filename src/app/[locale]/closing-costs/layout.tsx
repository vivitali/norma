import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { assertRouteAvailable } from "@/lib/route-guard";

/** Metadata only — page.tsx is a client component and cannot export generateMetadata. */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/closing-costs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.closingCosts" });
  return buildMetadata({
    locale,
    href: "/closing-costs",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * `assertRouteAvailable` 404s this route for a locale whose country does not
 * carry it — a no-op today (/closing-costs lists every registered country), and the
 * one-line guard every route's layout carries so a route later restricted to
 * fewer countries (as `/rrsp-hbp` already is) gets it for free.
 */
export default async function ClosingCostsLayout({
  children,
  params,
}: LayoutProps<"/[locale]/closing-costs">) {
  const { locale } = await params;
  assertRouteAvailable(locale, "/closing-costs");
  return children;
}
