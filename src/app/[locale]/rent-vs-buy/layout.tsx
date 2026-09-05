import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { assertRouteAvailable } from "@/lib/route-guard";
import { countryKey } from "@/lib/country-key";
import { countryOf, type Locale } from "@/i18n/countries";

/** Metadata only — page.tsx is a client component and cannot export generateMetadata. */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/rent-vs-buy">): Promise<Metadata> {
  const { locale } = await params;
  const country = countryOf(locale as Locale);
  const t = await getTranslations({ locale, namespace: "Metadata.rentVsBuy" });
  return buildMetadata({
    locale,
    href: "/rent-vs-buy",
    title: t(countryKey("title", country)),
    description: t("description"),
  });
}

/**
 * `assertRouteAvailable` 404s this route for a locale whose country does not
 * carry it — a no-op today (/rent-vs-buy lists every registered country), and the
 * one-line guard every route's layout carries so a route later restricted to
 * fewer countries (as `/rrsp-hbp` already is) gets it for free.
 */
export default async function RentVsBuyLayout({
  children,
  params,
}: LayoutProps<"/[locale]/rent-vs-buy">) {
  const { locale } = await params;
  assertRouteAvailable(locale, "/rent-vs-buy");
  return children;
}
