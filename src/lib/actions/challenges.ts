"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAILS, sendMailOnce } from "@/lib/mail";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

/** Join a challenge. The private link always goes by e-mail; a new participant also lands on it straight away. */
export async function joinChallenge(input: {
  challenge_id: string;
  slug: string;
  name: string;
  club: string;
  email: string;
  consent: boolean;
  website?: string;
}): Promise<ActionResult<{ token: string | null; memberNo: number | null }>> {
  if (input.website) return { ok: true, data: { token: null, memberNo: null } };
  const { t } = await getT();
  const parsed = z
    .object({
      challenge_id: z.string().uuid(),
      name: z.string().trim().min(2, t("Podaj imię", "Enter your name")).max(60),
      club: z.string().trim().max(60),
      email: z.string().trim().toLowerCase().email(t("Podaj poprawny adres e-mail", "Enter a valid email address")).max(254),
      consent: z.literal(true, { errorMap: () => ({ message: t("Zaznacz zgodę", "Please tick the consent") }) }),
    })
    .safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("challenge_join", { p_challenge: v.challenge_id, p_email: v.email, p_name: v.name, p_club: v.club });
  if (error) {
    if (/CHALLENGE_CLOSED/.test(error.message)) return { ok: false, error: t("To wyzwanie już się zakończyło.", "This challenge has ended.") };
    return { ok: false, error: t("Nie udało się zapisać. Spróbuj ponownie.", "Couldn’t sign you up. Please try again.") };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { token: string | null; member_no: number; is_new: boolean };
  const { data: c } = await supabase.from("challenges").select("title").eq("id", v.challenge_id).maybeSingle();
  const title = (c as { title: string } | null)?.title ?? "VYRA";
  if (row.is_new && row.token) {
    await sendMailOnce(`chjoin:${v.challenge_id}:${v.email}`, v.email, MAILS.challengeJoined({ name: v.name, title, memberNo: row.member_no, token: row.token }));
    revalidatePath(`/wyzwania/${input.slug}`);
    return { ok: true, data: { token: row.token, memberNo: row.member_no } };
  }
  // Already in: send the link again (at most once a day), never show it here.
  const { data: tok } = await supabase.rpc("challenge_token", { p_secret: process.env.VYRA_PURCHASE_SECRET ?? "", p_challenge: v.challenge_id, p_email: v.email });
  if (typeof tok === "string") {
    const day = new Date().toISOString().slice(0, 10);
    await sendMailOnce(`chlink:${v.challenge_id}:${v.email}:${day}`, v.email, MAILS.challengeJoined({ name: v.name, title, memberNo: row.member_no, token: tok, again: true }));
  }
  return { ok: true, data: { token: null, memberNo: null } };
}

export async function logChallengeRun(token: string, day: string, km: string): Promise<ActionResult> {
  const { t } = await getT();
  const n = Number(km.replace(",", "."));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: t("Wybierz dzień", "Pick a day") };
  if (!Number.isFinite(n) || n < 0.5 || n > 100) return { ok: false, error: t("Wpisz dystans od 0,5 do 100 km", "Enter 0.5 to 100 km") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("challenge_log", { p_token: token, p_day: day, p_km: n });
  if (error) {
    if (/DAY_OUTSIDE/.test(error.message)) return { ok: false, error: t("Ten dzień jest poza wyzwaniem albo w przyszłości.", "That day is outside the challenge or in the future.") };
    if (/KM_RANGE/.test(error.message)) return { ok: false, error: t("Za dużo kilometrów jak na jeden dzień.", "Too many kilometres for one day.") };
    return { ok: false, error: t("Nie udało się zapisać biegu.", "Couldn’t save the run.") };
  }
  revalidatePath("/wyzwania", "layout");
  return { ok: true };
}

export async function unlogChallengeRun(token: string, entryId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("challenge_unlog", { p_token: token, p_entry: entryId });
  if (error) return { ok: false, error: "Nie udało się usunąć." };
  revalidatePath("/wyzwania", "layout");
  return { ok: true };
}

const challengeSchema = z
  .object({
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,60}$/, "Małe litery, cyfry i myślniki, np. styczen-2027"),
    title: z.string().trim().min(3, "Podaj nazwę").max(120),
    description: z.string().trim().max(2000),
    kind: z.enum(["km", "runs"]),
    goal: z.string().trim().refine((v) => v === "" || /^\d{1,5}([.,]\d)?$/.test(v), "Liczba"),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data startu"),
    ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data końca"),
    visible: z.boolean(),
  })
  .refine((v) => v.ends_on >= v.starts_on, { message: "Koniec nie może być przed startem", path: ["ends_on"] });
export type ChallengeInput = z.input<typeof challengeSchema>;

export async function saveChallenge(id: string | null, input: ChallengeInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Wyzwaniami zarządzają założyciele." };
    const parsed = challengeSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = { ...v, description: v.description || null, goal: v.goal ? Number(v.goal.replace(",", ".")) : null };
    const { error } = id ? await supabase.from("challenges").update(row).eq("id", id) : await supabase.from("challenges").insert(row);
    if (error) return error.code === "23505" ? { ok: false, error: "Ten adres (slug) jest już zajęty." } : dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/wyzwania", "layout");
    return { ok: true, message: "Zapisano." };
  });
}

export async function deleteChallenge(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/wyzwania", "layout");
    return { ok: true };
  });
}

/** Panel: remove a participant (e.g. obviously fake kilometres). */
export async function removeChallengeParticipant(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("challenge_participants").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/wyzwania", "layout");
    return { ok: true };
  });
}
