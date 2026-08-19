import { setRequestLocale } from "next-intl/server";
import { SourcesContent } from "@/components/sources-content";

export default async function SourcesPage({ params }: PageProps<"/[locale]/sources">) {
  const { locale } = await params;
  // Without this the route drops out of static rendering, and Cloudflare bills
  // it as a Worker invocation under a 10ms CPU cap instead of serving it as a
  // free static asset. scripts/verify-prerender fails the build if it goes
  // missing, and page.test.tsx fails in two seconds.
  setRequestLocale(locale);

  return <SourcesContent />;
}
