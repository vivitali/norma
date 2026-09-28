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
      {/*
        Below sm the trigger fills its `min-w-0 flex-1` wrapper instead of sizing to its label, so a
        long name ("Terre-Neuve-et-Labrador") truncates with an ellipsis INSIDE the trigger rather
        than overflowing under the country switcher. The full name stays in the dropdown.
      */}
      {/*
        The accessible name carries the current value, not just the action: below sm the
        visible name may be truncated, and a voice-control user says what they SEE
        (WCAG 2.5.3, label in name). A combobox takes no name from its content.
      */}
      <SelectTrigger
        aria-label={`${t("changeLocation")}: ${tJur(jurisdiction.id)}`}
        className="w-full min-w-0 sm:w-auto"
      >
        <SelectValue className="min-w-0">
          <span className="block truncate">{tJur(jurisdiction.id)}</span>
        </SelectValue>
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
