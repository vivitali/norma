import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HOME_FAQ_KEYS, HomeContent } from "@/components/home-content";
import { buildMetadata } from "@/lib/seo";
import { JsonLd, faqPageSchema, webApplicationSchema } from "@/components/json-ld";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  return buildMetadata({
    locale,
    href: "/",
    title: t("title"),
    description: t("description"),
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  const tHome = await getTranslations({ locale, namespace: "Home" });

  // Built from the same key list the page renders, so the markup cannot outlive the content.
  const faq = HOME_FAQ_KEYS.map((key) => ({
    question: tHome(`faqQ_${key}`),
    answer: tHome(`faqA_${key}`),
  }));

  return (
    <>
      <JsonLd data={webApplicationSchema(locale, t("description"))} />
      <JsonLd data={faqPageSchema(faq)} />
      <HomeContent />
    </>
  );
}
