import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SourcesContent } from "@/components/sources-content";
import { buildMetadata } from "@/lib/seo";
import { assertRouteAvailable } from "@/lib/route-guard";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sources">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.sources" });
  return buildMetadata({
    locale,
    href: "/sources",
    title: t("title"),
    description: t("description"),
  });
}

export default async function SourcesPage({ params }: PageProps<"/[locale]/sources">) {
  const { locale } = await params;
  // A no-op today (/sources lists every registered country) — the one-line guard
  // every route carries so a route later restricted to fewer countries gets it for
  // free. See src/lib/route-guard.ts.
  assertRouteAvailable(locale, "/sources");
  // Without this the route drops out of static rendering, and Cloudflare bills
  // it as a Worker invocation under a 10ms CPU cap instead of serving it as a
  // free static asset. scripts/verify-prerender fails the build if it goes
  // missing, and page.test.tsx fails in two seconds.
  setRequestLocale(locale);

  return <SourcesContent />;
}
