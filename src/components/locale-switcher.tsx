"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LOCALES, type Locale } from "@/lib/locales";

/**
 * A select, not a row of buttons.
 *
 * With two locales a segmented pair was the better control: both options visible, one
 * tap to switch, no menu. It stopped being viable at four. DESIGN.md §7 puts a 44px
 * floor under every touch target, so four locales are 176px of buttons before gaps —
 * and the phone settings row already carries the jurisdiction picker and the theme
 * toggle on a 320px line. The picker is the control that would have been squeezed, and
 * a jurisdiction the reader cannot read is a figure they cannot trust.
 *
 * So this matches JurisdictionPicker deliberately: same control, same row, and the two
 * settings that change what the page says now look like each other.
 */
export function LocaleSwitcher() {
  const t = useTranslations("AppHeader");
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const activeLocale = params.locale;

  return (
    <Select
      value={activeLocale}
      onValueChange={(locale) => router.replace(pathname, { locale: locale as Locale })}
    >
      <SelectTrigger aria-label={t("changeLanguage")} className="w-auto">
        <SelectValue>{LOCALES[activeLocale as Locale]?.label ?? activeLocale}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {LOCALES[locale].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
