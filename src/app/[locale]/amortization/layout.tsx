import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

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

export default function AmortizationLayout({ children }: LayoutProps<"/[locale]/amortization">) {
  return children;
}
