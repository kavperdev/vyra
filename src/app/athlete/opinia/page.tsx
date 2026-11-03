import type { Metadata } from "next";
import { FeedbackForm } from "@/components/athlete/feedback-form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Twoja opinia", "Your feedback") };
}

export default async function FeedbackPage() {
  await getLang();
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const { count } = await supabase.from("athlete_feedback").select("id", { count: "exact", head: true }).eq("athlete_id", user.id);
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <PageHeader
        eyebrow={tl("2 minuty", "2 minutes")}
        title={tl("Jak Ci się z nami trenuje?", "How is training with us going?")}
        description={tl(
          "Szczera odpowiedź pomaga nam prowadzić Cię lepiej. Opinię publikujemy tylko wtedy, gdy zaznaczysz zgodę.",
          "An honest answer helps us coach you better. We only publish your opinion if you tick the consent box.",
        )}
      />
      {count ? (
        <EmptyState title={tl("Dziękujemy za opinię!", "Thanks for your feedback!")} description={tl("Twoja odpowiedź już do nas dotarła.", "We already have your answer.")} />
      ) : (
        <FeedbackForm firstName={user.profile.full_name.split(" ")[0] ?? ""} />
      )}
    </div>
  );
}
