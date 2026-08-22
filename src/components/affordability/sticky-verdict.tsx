"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { verdictKey, verdictTone } from "@/lib/affordability-view";
import { toneClass } from "@/lib/tone";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Phone only. Answer-first with inputs-below otherwise means a user changing
 * their income scrolls past three sections and loses sight of the number they
 * are changing. An addition — the reference has nothing sticky.
 *
 * aria-hidden: it restates content already in the accessibility tree, and
 * announcing the same figure twice is worse than not announcing it.
 */
export function StickyVerdict({ result }: { result: AffordabilityResult }) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    const target = document.getElementById("verdict");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShowing(!entry.isIntersecting), {
      rootMargin: "-56px 0px 0px 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!showing) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "sticky top-0 z-10 -mx-4 flex items-baseline gap-2 border-b px-4 py-1.5 sm:hidden",
        toneClass(verdictTone(verdictKey(result))),
      )}
    >
      <span className="micro">{t("stComfort")}</span>
      <span className="figure ml-auto text-[13px] font-semibold">{fmt(result.comfort)}</span>
    </div>
  );
}
