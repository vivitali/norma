import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

/** Metadata only — page.tsx is a client component and cannot export generateMetadata. */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/rent-vs-buy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.rentVsBuy" });
  return buildMetadata({
    locale,
    href: "/rent-vs-buy",
    title: t("title"),
    description: t("description"),
  });
}

export default function RentVsBuyLayout({ children }: LayoutProps<"/[locale]/rent-vs-buy">) {
  return children;
}
