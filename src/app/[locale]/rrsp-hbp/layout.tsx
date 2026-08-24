import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

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

export default function RrspHbpLayout({ children }: LayoutProps<"/[locale]/rrsp-hbp">) {
  return children;
}
