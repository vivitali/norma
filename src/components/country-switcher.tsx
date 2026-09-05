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
import {
  COUNTRIES,
  countryOf,
  languageOf,
  type Country,
  type Language,
  type Locale,
} from "@/i18n/countries";
import { ROUTE_COUNTRIES, type RouteKey } from "@/lib/routes";

/**
 * Same control as `LocaleSwitcher`, one namespace over: a `Select`, not a segmented
 * pair, and reused rather than re-invented for the same reason — DESIGN.md §8 forbids a
 * second disclosure mechanism, and a second switcher SHAPE for "which market/language
 * am I in" would be exactly that, one row over from the one this app already ships.
 *
 * Switching country is not a locale swap: a country carries its own language set (see
 * `COUNTRIES` in `src/i18n/countries.ts`) and its own route availability
 * (`ROUTE_COUNTRIES` in `src/lib/routes.ts`, the same table `NAV`, the sitemap and
 * `hreflang` all read). So the target locale and the target route are each resolved
 * independently:
 *
 * - Language: keep the reader's current language if the destination country ships it
 *   (`fr-CA` -> `us` has no French, so it falls back to the US's own default,
 *   `en`, per `COUNTRIES.us.languages`'s ordering); otherwise carry it over unchanged
 *   (`en-CA` -> `us` stays `en`).
 * - Route: keep the current route if the destination country has it; otherwise land on
 *   that country's home ("/"), never on a route that would 404 there — RRSP-HBP has no
 *   US analogue (US-market spec, "absent from the US navigation"), so `/ca/en/rrsp-hbp`
 *   -> US lands on `/us/en`, not `/us/en/rrsp-hbp`.
 */
export function CountrySwitcher() {
  const t = useTranslations("AppHeader");
  const tCountries = useTranslations("Countries");
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ locale: Locale }>();
  const activeLocale = params.locale;
  const activeCountry = countryOf(activeLocale);
  const activeLanguage = languageOf(activeLocale);

  const countries = Object.keys(COUNTRIES) as Country[];

  const targetLocaleFor = (country: Country): Locale => {
    const languages: readonly Language[] = COUNTRIES[country].languages;
    const language = languages.includes(activeLanguage) ? activeLanguage : languages[0];
    return `${language}-${country.toUpperCase()}` as Locale;
  };

  const targetHrefFor = (country: Country): RouteKey => {
    const route = pathname as RouteKey;
    const available = ROUTE_COUNTRIES[route]?.includes(country);
    return available ? route : "/";
  };

  return (
    <Select
      value={activeCountry}
      onValueChange={(value) => {
        const country = value as Country;
        router.replace(targetHrefFor(country), { locale: targetLocaleFor(country) });
      }}
    >
      <SelectTrigger aria-label={t("changeCountry")} className="w-auto">
        <SelectValue>{tCountries(activeCountry)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country} value={country}>
            {tCountries(country)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
