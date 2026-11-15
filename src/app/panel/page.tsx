import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { athleteHasAccess } from "@/lib/data/access";
import { createClient } from "@/lib/supabase/server";

/** Entry point to the signed-in part: sends coaches and athletes to their own home. */
export default async function PanelEntry() {
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  if (user?.profile.role === "athlete" && !(await athleteHasAccess(await createClient(), user.id))) redirect("/app");
  redirect(user ? homeFor(user.profile.role) : "/login");
}
