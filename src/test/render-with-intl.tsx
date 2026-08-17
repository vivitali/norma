import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

const MESSAGES = { en: enMessages, fr: frMessages };

export function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions & { locale?: "en" | "fr" },
) {
  const { locale = "en", ...renderOptions } = options ?? {};
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {ui}
    </NextIntlClientProvider>,
    renderOptions,
  );
}
