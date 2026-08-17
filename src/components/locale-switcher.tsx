"use client";

import { useParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
] as const;

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams() as { locale?: string };
  const currentLocale = params.locale || "en";

  const handleChangeLocale = (newLocale: string) => {
    // Replace current locale in pathname with new locale
    let newPath: string;

    if (pathname === "/") {
      // At root, just add locale prefix
      newPath = `/${newLocale}`;
    } else if (pathname.startsWith(`/${currentLocale}`)) {
      // Replace existing locale prefix
      newPath = `/${newLocale}${pathname.slice(currentLocale.length + 1)}`;
    } else if (pathname.startsWith("/en") || pathname.startsWith("/fr")) {
      // Handle case where pathname includes locale prefix
      const locale = pathname.startsWith("/en") ? "en" : "fr";
      newPath = `/${newLocale}${pathname.slice(locale.length + 1)}`;
    } else {
      // Default: just add new locale prefix
      newPath = `/${newLocale}${pathname}`;
    }

    router.replace(newPath, { locale: newLocale });
  };

  return (
    <div className="flex gap-2">
      {LOCALES.map((locale) => (
        <Button
          key={locale.code}
          variant={currentLocale === locale.code ? "default" : "outline"}
          size="sm"
          onClick={() => handleChangeLocale(locale.code)}
        >
          {locale.label}
        </Button>
      ))}
    </div>
  );
}
