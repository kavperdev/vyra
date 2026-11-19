import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub, type SportClub } from "@/lib/data/clubs";
import { sportOf } from "@/lib/clubs/fitness";
import { createClient } from "@/lib/supabase/server";

/** The club of the signed-in athlete, or null (no club, no account, or the migration not run). Once per request. */
export const myClub = cache(async (): Promise<SportClub | null> => {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "athlete") return null;
  const supabase = await createClient();
  return getMyClub(supabase, user.id).catch(() => null);
});

/** Running and athletics clubs keep the runner tools (history, progress, records); other sports don't. */
export const isRunningClub = (club: Pick<SportClub, "sport"> | null) => !!club && sportOf(club.sport).key === "athletics";

/**
 * Screens of the VYRA runner products (Method, shop, referral, badges, the coaching questionnaire) are not
 * for someone a club signed up: a club member is sent to the club's home.
 */
export async function notForClubMembers(opts: { runningClubsToo?: boolean } = {}) {
  const club = await myClub();
  if (!club) return;
  if (opts.runningClubsToo === false && isRunningClub(club)) return;
  redirect("/athlete");
}

/** The sport of the signed-in coach's club (null: VYRA coach or founder, who plan running). Once per request. */
export const coachSport = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "coach" || user.profile.staff_role === "founder") return null;
  const supabase = await createClient();
  const club = await getMyClub(supabase, user.id).catch(() => null);
  return club ? (club.sport ?? "athletics") : null;
});
