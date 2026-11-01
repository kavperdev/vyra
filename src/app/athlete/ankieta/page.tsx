import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { IntakeForm } from "@/components/athlete/intake-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";
import type { Intake } from "@/lib/intake";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Ankieta startowa", "Starting questionnaire") };
}

export default async function IntakePage() {
  await getLang();
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_profiles")
    .select("intake, birth_year, height_cm, weight_kg")
    .eq("athlete_id", user.id)
    .maybeSingle();
  const row = data as { intake: Intake | null; birth_year: number | null; height_cm: number | null; weight_kg: number | null } | null;
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <PageHeader
        eyebrow={tl("Start z VYRA", "Starting with VYRA")}
        title={tl("Ankieta startowa", "Starting questionnaire")}
        description={tl(
          "5 minut, które oszczędzą tygodnie zgadywania. Na tej podstawie trener ułoży Twój pierwszy plan. Pola z gwiazdką są wymagane, resztę uzupełnisz, ile możesz.",
          "5 minutes that save weeks of guesswork. Your coach builds your first plan from this. Fields with an asterisk are required; fill in the rest as best you can.",
        )}
      />
      <IntakeForm
        initial={row?.intake ?? null}
        body={{ birth_year: row?.birth_year ?? null, height_cm: row?.height_cm ?? null, weight_kg: row?.weight_kg ?? null }}
      />
    </div>
  );
}
