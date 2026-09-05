"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jurisdictionsOf } from "@/domain/jurisdictions";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useCountry } from "@/hooks/use-country";

export function JurisdictionPicker() {
  const t = useTranslations("AppHeader");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction, setJurId] = useJurisdiction();
  const country = useCountry();

  return (
    <Select value={jurisdiction.id} onValueChange={setJurId}>
      <SelectTrigger aria-label={t("changeLocation")} className="w-auto">
        <SelectValue>{tJur(jurisdiction.id)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {jurisdictionsOf(country).map((j) => (
          <SelectItem key={j.id} value={j.id}>
            {tJur(j.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
