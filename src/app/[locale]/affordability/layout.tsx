import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { assertRouteAvailable } from "@/lib/route-guard";

/**
 * This segment exists only to carry metadata. page.tsx is a client component
 * ("use client"), and a client component cannot export generateMetadata — so
 * the route's title, description, canonical and hreflang live here instead,
 * in a server component that adds no markup and no rendering cost.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/affordability">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.affordability" });
  return buildMetadata({
    locale,
    href: "/affordability",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * `assertRouteAvailable` 404s this route for a locale whose country does not
 * carry it — a no-op today (/affordability lists every registered country), and the
 * one-line guard every route's layout carries so a route later restricted to
 * fewer countries (as `/rrsp-hbp` already is) gets it for free.
 */
export default async function AffordabilityLayout({
  children,
  params,
}: LayoutProps<"/[locale]/affordability">) {
  const { locale } = await params;
  assertRouteAvailable(locale, "/affordability");
  return children;
}
