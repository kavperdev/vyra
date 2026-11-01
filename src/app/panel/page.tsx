import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

/** Entry point to the signed-in part: sends coaches and athletes to their own home. */
export default async function PanelEntry() {
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.profile.role) : "/login");
}
