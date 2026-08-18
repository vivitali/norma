import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function HomeContent() {
  const t = useTranslations("Home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("heading")}
      </h1>
      <p className="max-w-xl text-muted-foreground">{t("subheading")}</p>
      <Button asChild size="lg">
        <Link href="/affordability">{t("cta")}</Link>
      </Button>
    </main>
  );
}
