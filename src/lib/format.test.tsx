import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";
import { useMoney, usePercent } from "./format";

const wrap = (locale: "en" | "fr") =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={locale === "en" ? enMessages : frMessages}>
        {children}
      </NextIntlClientProvider>
    );
  };

describe("useMoney", () => {
  it("keeps the sign outside the symbol, never $-340", () => {
    const { result } = renderHook(() => useMoney(), { wrapper: wrap("en") });
    expect(result.current(-340)).toBe("− $340");
  });
  it("trails the symbol in French", () => {
    const { result } = renderHook(() => useMoney(), { wrapper: wrap("fr") });
    expect(result.current(-340)).toMatch(/^−\s340\s\$$/);
  });
});

describe("usePercent", () => {
  it("has no space before the sign in English", () => {
    const { result } = renderHook(() => usePercent(), { wrapper: wrap("en") });
    expect(result.current(34.5, 1)).toBe("34.5%");
  });
  it("puts a narrow no-break space before the sign in French", () => {
    const { result } = renderHook(() => usePercent(), { wrapper: wrap("fr") });
    expect(result.current(34.5, 1)).toBe("34,5 %");
  });
});
