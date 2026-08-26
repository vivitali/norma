import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { CATALOGUES } from "./catalogues";
import type { Locale } from "@/lib/locales";

export function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions & { locale?: Locale },
) {
  const { locale = "en", ...renderOptions } = options ?? {};
  return render(
    <NextIntlClientProvider locale={locale} messages={CATALOGUES[locale]}>
      {ui}
    </NextIntlClientProvider>,
    renderOptions,
  );
}
