import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

/** Metadata only — page.tsx is a client component and cannot export generateMetadata. */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/scenarios">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.scenarios" });
  return buildMetadata({
    locale,
    href: "/scenarios",
    title: t("title"),
    description: t("description"),
  });
}

export default function ScenariosLayout({ children }: LayoutProps<"/[locale]/scenarios">) {
  return children;
}
