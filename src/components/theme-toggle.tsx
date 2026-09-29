"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const CYCLE = ["system", "light", "dark"] as const;
type Mode = (typeof CYCLE)[number];
const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;
const LABEL_KEYS = { system: "themeSystem", light: "themeLight", dark: "themeDark" } as const;

/**
 * One button cycling System → Light → Dark → System.
 *
 * The old toggle flipped between the two RESOLVED themes, so a reader on "system" could never
 * return to it, and its name ("Theme") said nothing about which state it was in. The icon shows
 * the stored choice (a monitor for System), and the accessible name carries both the current
 * choice and what the next press does. 44px on a phone, as every control there.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("AppHeader");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Before mount the stored choice is unknown on the server; render the default ("system")
  // so server and client markup agree.
  const current: Mode = mounted && CYCLE.includes(theme as Mode) ? (theme as Mode) : "system";
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
  const Icon = ICONS[current];
  const label = t("themeCycle", { current: t(LABEL_KEYS[current]), next: t(LABEL_KEYS[next]) });

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-11 sm:size-8"
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
    >
      <Icon />
    </Button>
  );
}
