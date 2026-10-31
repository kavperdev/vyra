import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Home() {
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.profile.role) : "/login");
}
