import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

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

export default function ClosingCostsLayout({ children }: LayoutProps<"/[locale]/closing-costs">) {
  return children;
}
