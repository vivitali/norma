"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jurisdictions } from "@/domain/jurisdictions";
import { useJurisdiction } from "@/hooks/use-jurisdiction";

export function JurisdictionPicker() {
  const t = useTranslations("AppHeader");
  const tJur = useTranslations("Jurisdictions");
  const [state, update] = useJurisdiction();

  return (
    <Select value={state.jurId} onValueChange={(jurId) => update({ jurId })}>
      <SelectTrigger aria-label={t("changeLocation")} className="w-auto">
        <SelectValue>{tJur(state.jurId)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {jurisdictions.map((j) => (
          <SelectItem key={j.id} value={j.id}>
            {tJur(j.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
