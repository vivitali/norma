"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { JurisdictionPicker } from "@/components/jurisdiction-picker";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  const t = useTranslations("AppHeader");

  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        {t("brand")}
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <JurisdictionPicker />
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
