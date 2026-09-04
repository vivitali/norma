import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { assertRouteAvailable } from "@/lib/route-guard";

/** Metadata only — page.tsx is a client component and cannot export generateMetadata. */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/amortization">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.amortization" });
  return buildMetadata({
    locale,
    href: "/amortization",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * `assertRouteAvailable` 404s this route for a locale whose country does not
 * carry it — a no-op today (/amortization lists every registered country), and the
 * one-line guard every route's layout carries so a route later restricted to
 * fewer countries (as `/rrsp-hbp` already is) gets it for free.
 */
export default async function AmortizationLayout({
  children,
  params,
}: LayoutProps<"/[locale]/amortization">) {
  const { locale } = await params;
  assertRouteAvailable(locale, "/amortization");
  return children;
}
