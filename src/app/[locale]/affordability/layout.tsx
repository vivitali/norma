import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

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

export default function AffordabilityLayout({ children }: LayoutProps<"/[locale]/affordability">) {
  return children;
}
