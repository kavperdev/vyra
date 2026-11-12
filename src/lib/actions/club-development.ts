"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { publicOrigin } from "@/lib/env";
import { mailConfigured, sendMailBatch } from "@/lib/mail";
import { FITNESS_TESTS, formatFitnessValue, summarizeFitness, type FitnessResult } from "@/lib/clubs/fitness";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Wybierz datę testu");

function refresh() {
  revalidatePath("/coach/klub");
  revalidatePath("/athlete", "layout");
}
const forbidden = (m?: string) => (m?.includes("row-level security") ? { ok: false as const, error: "Nie masz uprawnień do wpisywania testów tym zawodnikom." } : null);
const missing = (m?: string) => (m?.includes("fitness_results") && m.includes("does not exist") ? { ok: false as const, error: "Karta rozwoju nie jest jeszcze włączona: uruchom migrację 20261114000100_athlete_development.sql." } : null);

const saveSchema = z.object({
  test_key: z.enum(FITNESS_TESTS.map((t) => t.key) as [string, ...string[]]),
  tested_on: isoDate,
  rows: z.array(z.object({ athlete_id: uuid, value: z.number().positive().max(99999) })).max(300),
});

/** Saves one test for many athletes at once; a second save on the same day replaces the result. */
export async function saveFitnessResults(input: z.input<typeof saveSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = saveSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    if (!p.data.rows.length) return { ok: false, error: "Wpisz wynik co najmniej jednemu zawodnikowi." };
    const rows = p.data.rows.map((r) => ({ athlete_id: r.athlete_id, test_key: p.data.test_key, tested_on: p.data.tested_on, value: r.value }));
    const { error } = await supabase.from("fitness_results").upsert(rows, { onConflict: "athlete_id,test_key,tested_on" });
    if (error) return missing(error.message) ?? forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: `Zapisano wyniki: ${rows.length}.` };
  });
}

export async function deleteFitnessResult(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Nie znaleziono wyniku." };
    const { error } = await supabase.from("fitness_results").delete().eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Usunięto wynik." };
  });
}

/**
 * Monthly e-mail to every guardian with an address: attendance over the last 30 days and the newest
 * test results with the change since the previous test, plus the link to the parent page.
 */
export async function sendDevelopmentReports(clubId: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (!uuid.safeParse(clubId).success) return { ok: false, error: "Nie znaleziono klubu." };
    if (!mailConfigured()) return { ok: false, error: "Wysyłka e-maili nie jest skonfigurowana." };
    const [{ data: club }, { data: athletes, error: e1 }] = await Promise.all([
      supabase.from("sport_clubs").select("name").eq("id", clubId).maybeSingle(),
      supabase.from("profiles").select("id, full_name").eq("club_id", clubId).eq("role", "athlete"),
    ]);
    if (e1) return dbError(e1);
    const people = (athletes ?? []) as { id: string; full_name: string }[];
    const ids = people.map((a) => a.id);
    if (!ids.length) return { ok: false, error: "Klub nie ma jeszcze zawodników." };
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: guardians }, { data: fit, error: e2 }, { data: sessions }] = await Promise.all([
      supabase.from("athlete_guardians").select("athlete_id, full_name, email, access_token").in("athlete_id", ids),
      supabase.from("fitness_results").select("athlete_id, test_key, value, tested_on").in("athlete_id", ids),
      supabase.from("training_sessions").select("athlete_id, status, attendance:session_attendance ( present )").in("athlete_id", ids).gte("scheduled_date", since).lte("scheduled_date", today),
    ]);
    if (e2) return missing(e2.message) ?? dbError(e2);
    const results = ((fit ?? []) as FitnessResult[]).map((r) => ({ ...r, value: Number(r.value) }));
    type S = { athlete_id: string; status: string; attendance: { present: boolean } | { present: boolean }[] | null };
    const att = (id: string) => {
      let present = 0;
      let marked = 0;
      for (const s of ((sessions ?? []) as S[]).filter((x) => x.athlete_id === id)) {
        const a = Array.isArray(s.attendance) ? s.attendance[0] : s.attendance;
        if (a) {
          marked++;
          if (a.present) present++;
        } else if (s.status === "completed") {
          marked++;
          present++;
        } else if (s.status === "skipped") marked++;
      }
      return { present, marked };
    };
    const clubName = (club as { name: string } | null)?.name ?? "klub";
    const items = ((guardians ?? []) as { athlete_id: string; full_name: string; email: string | null; access_token: string }[])
      .filter((g) => g.email)
      .map((g) => {
        const a = people.find((p) => p.id === g.athlete_id)!;
        const first = a.full_name.split(" ")[0];
        const { present, marked } = att(a.id);
        const recent = summarizeFitness(results.filter((r) => r.athlete_id === a.id)).filter((s) => s.latest.tested_on >= since);
        const lines = recent.map((s) => {
          const change = s.change === null ? "" : s.change > 0 ? ` (poprawa o ${s.change.toLocaleString("pl-PL")}%)` : s.change < 0 ? ` (${s.change.toLocaleString("pl-PL")}%)` : " (bez zmian)";
          return `${s.test.name}: ${formatFitnessValue(s.latest.value, s.test)}${change}`;
        });
        const paragraphs = [
          marked ? `Frekwencja w ostatnich 30 dniach: ${Math.round((present / marked) * 100)}% (${present} z ${marked} treningów).` : "W ostatnich 30 dniach nie odnotowano jeszcze obecności.",
          lines.length ? `Wyniki z ostatnich testów sprawności: ${lines.join("; ")}.` : "W tym miesiącu nie było testów sprawności. Pełną historię wyników znajdziesz na stronie dziecka.",
          "Plan, harmonogram, komunikaty i składki są na stronie dziecka pod linkiem poniżej.",
        ];
        return {
          to: g.email!,
          m: {
            subject: `${first}: podsumowanie miesiąca w ${clubName}`,
            preview: paragraphs[0],
            title: `Podsumowanie miesiąca: ${a.full_name}`,
            paragraphs,
            cta: { label: "Strona dziecka", url: `${publicOrigin()}/rodzic/${g.access_token}` },
            signature: `${user.profile.full_name}, ${clubName}`,
          },
        };
      });
    if (!items.length) return { ok: false, error: "Żaden opiekun nie ma podanego e-maila. Dodaj go w zakładce Zawodnicy i rodzice." };
    const sent = await sendMailBatch(items);
    return { ok: true, message: `Wysłano podsumowania: ${sent} z ${items.length}.` };
  });
}
