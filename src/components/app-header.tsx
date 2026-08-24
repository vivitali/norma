"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppNav } from "@/components/app-nav";
import { JurisdictionPicker } from "@/components/jurisdiction-picker";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  const t = useTranslations("AppHeader");

  return (
    <header className="flex h-[62px] items-center gap-3.5 border-b border-border px-5 sm:px-10">
      <Link href="/" className="flex-1 text-[15px] font-bold tracking-[-0.02em]">
        {t("brand")}
      </Link>
      <AppNav />
      <div className="ml-auto flex items-center gap-2">
        <JurisdictionPicker />
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
