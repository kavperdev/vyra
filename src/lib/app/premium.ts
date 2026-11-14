import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Premium = VYRA Method access (paid or the 14-day trial). Coaches see everything. */
export async function premiumStatus(): Promise<{ signedIn: boolean; premium: boolean }> {
  if (!isSupabaseConfigured()) return { signedIn: false, premium: false };
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { signedIn: false, premium: false };
  if (user.profile.role === "coach") return { signedIn: true, premium: true };
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_method_access", { p_user: user.id });
  return { signedIn: true, premium: !!data };
}
