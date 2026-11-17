"use server";

import { createClient } from "@/lib/supabase/server";

/** Deletes the signed-in account with everything linked to it (the database cascades). */
export async function deleteMyAccount(confirm: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (confirm.trim().toUpperCase() !== "USUŃ") return { ok: false, error: "Wpisz USUŃ, żeby potwierdzić." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Zaloguj się, żeby usunąć konto." };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("[delete account]", error.message);
    return { ok: false, error: /function|schema cache/i.test(error.message) ? "Usuwanie konta jeszcze nie działa. Napisz na kontakt@vyraathl.pl, a usuniemy je ręcznie." : "Nie udało się usunąć konta. Spróbuj ponownie albo napisz na kontakt@vyraathl.pl." };
  }
  await supabase.auth.signOut().catch(() => undefined);
  return { ok: true };
}
