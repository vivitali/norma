"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LineItem } from "@/domain/engine";
import { useMoney, usePercent } from "@/lib/format";
import { PanelRow } from "@/components/affordability/section-row";
import { Provenance } from "@/components/provenance";

/**
 * One fee group as rows.
 *
 * A line item that does not apply is ABSENT here, never a zero row — the
 * engine's convention, and the reason Calgary shows a land-titles registration
 * fee where Toronto shows two transfer taxes, rather than both cities showing
 * the same table with zeros in it. A zero row asserts that a fee exists and
 * happens to be nil, which is a different and usually false claim.
 */
export function LineRows({ items, namespace }: { items: readonly LineItem[]; namespace: string }) {
  const t = useTranslations(namespace);
  const fmt = useMoney();

  return (
    <>
      {items.map((item) => (
        <LineRow key={item.key} item={item} t={t} fmt={fmt} />
      ))}
      <PanelRow
        label={t("subtotal")}
        value={fmt(items.reduce((total, item) => total + item.amount, 0))}
        strong
      />
    </>
  );
}

function LineRow({
  item,
  t,
  fmt,
}: {
  item: LineItem;
  t: (key: string) => string;
  fmt: (n: number, dp?: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const pct = usePercent();
  const hasBrackets = !!item.parts && item.parts.length > 0;

  return (
    <div>
      <PanelRow
        label={t(item.key)}
        value={fmt(item.amount)}
        provenance={<Provenance kind={item.exact ? "rule" : "estimate"} />}
      />
      {item.sub ? <p className="pt-1 text-[11.5px] text-ink3">{item.sub}</p> : null}
      {item.cashOnly ? (
        <p className="pt-1 text-[11.5px] text-caution">{t("cashOnly")}</p>
      ) : null}
      {item.ex ? <p className="pt-1 text-[12px] leading-[1.55] text-ink3">{t(item.ex)}</p> : null}
      {hasBrackets ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className="mt-1 text-[12px] font-medium text-ac hover:underline"
          >
            {open ? t("hideBrackets") : t("showBrackets")}
          </button>
          {open ? (
            <div className="mt-1.5 mb-2 border-l border-hairline pl-3">
              {item.parts!.map((part) => (
                <PanelRow
                  key={`${part.from}-${part.to}`}
                  label={
                    part.from === 0
                      ? `${t("onFirst")} ${fmt(part.to)} · ${pct(part.rate * 100, 2)}`
                      : `${t("onPortion")} ${fmt(part.from)} ${t("to")} ${fmt(part.to)} · ${pct(part.rate * 100, 2)}`
                  }
                  value={fmt(part.amt)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
