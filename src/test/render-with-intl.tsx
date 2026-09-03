import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { CATALOGUES } from "./catalogues";
import { languageOf, type Locale } from "@/i18n/countries";

export function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions & { locale?: Locale },
) {
  const { locale = "en-CA", ...renderOptions } = options ?? {};
  return render(
    <NextIntlClientProvider locale={locale} messages={CATALOGUES[languageOf(locale)]}>
      {ui}
    </NextIntlClientProvider>,
    renderOptions,
  );
}
