"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppNav } from "@/components/app-nav";
import { JurisdictionPicker } from "@/components/jurisdiction-picker";
import { CountrySwitcher } from "@/components/country-switcher";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * One row from `sm` up; two rows below it.
 *
 * Brand, menu trigger, jurisdiction, locale and theme cannot share a 320px line — measured, they
 * need roughly 370px before any of them is allowed to shrink. So the settings wrap to their own
 * line on a phone, where they stay in the header rather than moving inside the menu: they are
 * settings, not destinations (issue #9), and a jurisdiction the reader cannot see is a figure they
 * cannot trust. `w-full` on the settings cluster is what forces the wrap; `sm:w-auto` undoes it.
 *
 * `relative` is load-bearing: it is what the nav panel positions against, so the panel spans the
 * header's full width instead of hanging off the trigger.
 */
export function AppHeader() {
  const t = useTranslations("AppHeader");

  return (
    <header className="relative border-b border-border px-4 sm:px-10">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2 sm:h-[62px] sm:flex-nowrap sm:gap-3.5 sm:py-0">
        <Link
          href="/"
          className="mr-auto flex min-h-11 items-center text-[15px] font-bold tracking-[-0.02em] sm:min-h-0"
        >
          {t("brand")}
        </Link>
        <AppNav />
        {/*
          The 44px touch floor of DESIGN.md §7 applied to controls this component does not own.
          shadcn sizes its trigger and buttons at 28-32px through variant classes of equal
          specificity, so the override needs `!` to win deterministically rather than by stylesheet
          order. It steps back down at `sm`, where the pointer is a mouse and the row is 62px tall.
          `min-w-0` lets a long jurisdiction name ("Terre-Neuve-et-Labrador") clamp instead of
          pushing the row past the viewport — the select already line-clamps its value.
        */}
        <div className="flex w-full min-w-0 items-center gap-2 [&_[data-slot=button]]:min-h-11! [&_[data-slot=button]]:min-w-11! [&_[data-slot=select-trigger]]:h-11! [&_[data-slot=select-trigger]]:min-w-0 sm:w-auto sm:[&_[data-slot=button]]:min-h-8! sm:[&_[data-slot=button]]:min-w-8! sm:[&_[data-slot=select-trigger]]:h-8!">
          <div className="min-w-0 flex-1 sm:flex-none">
            <JurisdictionPicker />
          </div>
          <CountrySwitcher />
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
