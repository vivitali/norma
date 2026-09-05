import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { languageOf } from "./countries";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Catalogues stay one file per LANGUAGE (messages/en.json, not messages/en-CA.json) —
  // see src/i18n/countries.ts. The resolved `locale` (the full pair) still goes on the
  // returned config, so useLocale()/NextIntlClientProvider see "en-CA", not "en".
  return {
    locale,
    messages: (await import(`../../messages/${languageOf(locale)}.json`)).default,
  };
});
