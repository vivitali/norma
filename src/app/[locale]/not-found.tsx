import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Rendered inside the locale layout, so it keeps the header and the locale
 * context. The copy lives under Metadata.notFound alongside the 404's title
 * and description, which the segment cannot set for itself.
 */
export default function NotFound() {
  const t = useTranslations("Metadata.notFound");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="text-[27px] leading-tight font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-[12.5px] text-muted-foreground">{t("body")}</p>
      <p className="mt-6 text-[12.5px]">
        <Link href="/affordability" className="underline underline-offset-4">
          {t("cta")}
        </Link>
      </p>
    </main>
  );
}
