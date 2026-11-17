import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GoalPlanView } from "@/components/app/goal-plan";
import { PageHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Plan" };

export default async function AppGoal() {
  // A plan from a coach or VYRA Method lives in the training platform: point there first.
  let coachPlan = false;
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser().catch(() => null);
    if (user) {
      const supabase = await createClient();
      const { data } = await supabase.from("training_sessions").select("id").eq("athlete_id", user.id).gte("scheduled_date", todayISO()).limit(1);
      coachPlan = !!data?.length;
    }
  }
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Plan" sub="Tydzień po tygodniu aż do startu. Tempa z Twojej formy." />
      {coachPlan ? (
        <Link href="/panel" className="mb-4 flex items-center justify-between rounded-[20px] bg-white px-4 py-4 text-black active:scale-[0.985]">
          <span>
            <span className="block text-[12px] text-black/50">Masz plan od trenera lub VYRA Method</span>
            <span className="block text-[16px] font-semibold">Otwórz swój plan</span>
          </span>
          <ArrowUpRight className="size-5 shrink-0" />
        </Link>
      ) : null}
      <GoalPlanView />
    </div>
  );
}
