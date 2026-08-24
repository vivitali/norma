import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

/** Metadata only — page.tsx is a client component and cannot export generateMetadata. */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/down-payment">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.downPayment" });
  return buildMetadata({
    locale,
    href: "/down-payment",
    title: t("title"),
    description: t("description"),
  });
}

export default function DownPaymentLayout({ children }: LayoutProps<"/[locale]/down-payment">) {
  return children;
}
