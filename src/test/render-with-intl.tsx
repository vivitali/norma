import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { CATALOGUES } from "./catalogues";
import { languageOf, type Locale } from "@/i18n/countries";

export function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions & { locale?: Locale },
) {
  const { locale = "en-CA", ...renderOptions } = options ?? {};
  // As a `wrapper`, not a parent element, so `rerender(ui)` keeps the provider too.
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={CATALOGUES[languageOf(locale)]}>
      {children}
    </NextIntlClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
