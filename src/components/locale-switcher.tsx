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
import { localesForCountry } from "@/i18n/countries";
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
  const params = useParams<{ locale: Locale }>();
  const activeLocale = params.locale;
  // Only the current country's languages: US-market spec Decision 3, "a country is a
  // registry entry" — with a second country this must not silently offer its languages
  // on a Canadian page. Today localesForCountry(en-CA) === routing.locales because ca
  // is the only registered country, so this is a no-op in shape and a real guard in
  // behaviour the day a second one ships.
  const options = localesForCountry(activeLocale);

  return (
    <Select
      value={activeLocale}
      onValueChange={(locale) => router.replace(pathname, { locale: locale as Locale })}
    >
      <SelectTrigger aria-label={t("changeLanguage")} className="w-auto">
        <SelectValue>{LOCALES[activeLocale]?.label ?? activeLocale}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {LOCALES[locale].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
