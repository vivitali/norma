"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV, builtEntries } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Tools grouped by the buyer's journey. Grouping lives in src/lib/routes.ts, not here, so the IA
 * can be regrouped without touching a component — and so a page can legitimately appear in two
 * groups, which flat URLs make honest.
 *
 * `usePathname` from @/i18n/navigation returns the CANONICAL route key, not the localized slug, so
 * the active-state comparison below works under /en, /fr and every future locale with no
 * per-locale logic.
 */
export function AppNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  const groups = NAV.map((group) => ({ group, entries: builtEntries(group) })).filter(
    ({ entries }) => entries.length > 0,
  );

  return (
    <nav aria-label={t("menu")} className="flex items-center gap-4">
      {groups.map(({ group, entries }) => (
        <div key={group.heading} className="flex items-center gap-3">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(group.heading)}
          </span>
          {entries.map((entry) => {
            const active = pathname === entry.route;
            return (
              <Link
                key={`${group.heading}:${entry.route}`}
                href={entry.route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-sm transition-colors hover:text-foreground",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {t(entry.label)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
