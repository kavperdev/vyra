import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: Profile;
}

/** The signed-in user with their profile, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, timezone, created_at")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { id: user.id, email: user.email ?? null, profile: profile as Profile };
});

export function homeFor(role: UserRole): string {
  return role === "coach" ? "/coach" : "/athlete";
}

/** Server-side guard for layouts and pages. Data access is still enforced by RLS. */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role !== role) redirect(homeFor(user.profile.role));
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
