"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

const LOCALE_LABELS: Record<string, string> = { en: "EN", fr: "FR" };

export function LocaleSwitcher() {
  const t = useTranslations("AppHeader");
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const activeLocale = params.locale;

  return (
    <div role="group" aria-label={t("changeLanguage")} className="flex gap-1">
      {routing.locales.map((locale) => (
        <Button
          key={locale}
          type="button"
          variant={locale === activeLocale ? "secondary" : "ghost"}
          size="sm"
          aria-current={locale === activeLocale}
          onClick={() => router.replace(pathname, { locale })}
        >
          {LOCALE_LABELS[locale]}
        </Button>
      ))}
    </div>
  );
}
