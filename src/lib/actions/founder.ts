"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";
import { dbError, withUser } from "./helpers";

const NO_SQL = "Uruchom w Supabase plik supabase/data/founder_panel.sql.";
const fail = (e: { message?: string; code?: string }) =>
  e.code === "42501" ? { ok: false as const, error: "Tylko dla założycieli." } : /function|schema cache/i.test(e.message ?? "") ? { ok: false as const, error: NO_SQL } : dbError(e);

export type Segment = "all" | "free" | "method" | "inactive";

/** Custom notification (in-app + push) to chosen accounts or a whole group. */
export async function founderNotify(input: { users?: string[]; segment?: Segment; title: string; body: string; link?: string }): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Tylko dla założycieli." };
    const title = input.title.trim();
    if (title.length < 2) return { ok: false, error: "Wpisz tytuł powiadomienia." };
    const link = (input.link ?? "").trim() || "/app";
    if (!/^\/[A-Za-z0-9/_?=&#%.-]*$/.test(link)) return { ok: false, error: "Link musi być adresem w aplikacji, np. /app/forma." };
    const { data, error } = await supabase.rpc("founder_notify", {
      p_users: input.users?.length ? input.users : null,
      p_segment: input.segment ?? "all",
      p_title: title,
      p_body: input.body.trim(),
      p_link: link,
    });
    if (error) return fail(error);
    const n = (data as number) ?? 0;
    return { ok: true, message: n ? `Wysłano do ${n} ${n === 1 ? "osoby" : "osób"}. Push dojdzie do tych, którzy mają włączone powiadomienia.` : "Nikt nie pasuje do tej grupy." };
  });
}

export async function founderRename(userId: string, fullName: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Tylko dla założycieli." };
    if (fullName.trim().length < 2) return { ok: false, error: "Wpisz imię i nazwisko." };
    const { error } = await supabase.rpc("founder_update_account", { p_user: userId, p_full_name: fullName });
    if (error) return fail(error);
    revalidatePath(`/coach/konta/${userId}`);
    return { ok: true, message: "Zapisano." };
  });
}

export async function founderDelete(userId: string, confirm: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Tylko dla założycieli." };
    if (confirm.trim().toUpperCase() !== "USUŃ") return { ok: false, error: "Wpisz USUŃ, żeby potwierdzić." };
    const { error } = await supabase.rpc("founder_delete_account", { p_user: userId });
    if (error) return /NOT_ATHLETE/.test(error.message) ? { ok: false, error: "Tu można usuwać tylko konta biegaczy." } : fail(error);
    revalidatePath("/coach/konta");
    return { ok: true, message: "Konto usunięte." };
  });
}
