"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendMailOnce } from "@/lib/mail";
import { getT } from "@/lib/i18n/server";
import { SITE } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

const disciplines = ["ulica", "ultra", "triathlon", "hyrox", "inne"] as const;

/** Application to VYRA Team from the /team page. A short note goes to the VYRA inbox. */
export async function applyToTeam(input: {
  name: string;
  email: string;
  discipline: string;
  city: string;
  pbs: string;
  about: string;
  link: string;
  consent: boolean;
  website?: string;
}): Promise<ActionResult> {
  if (input.website) return { ok: true };
  const { t } = await getT();
  const parsed = z
    .object({
      name: z.string().trim().min(2, t("Podaj imię i nazwisko", "Enter your name")).max(80),
      email: z.string().trim().toLowerCase().email(t("Podaj poprawny adres e-mail", "Enter a valid email address")).max(254),
      discipline: z.enum(disciplines),
      city: z.string().trim().max(60),
      pbs: z.string().trim().min(3, t("Wpisz najważniejsze wyniki", "Enter your key results")).max(400),
      about: z.string().trim().max(1200),
      link: z.string().trim().max(300),
      consent: z.literal(true, { errorMap: () => ({ message: t("Zaznacz zgodę", "Please tick the consent") }) }),
    })
    .safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("team_apply", {
    p_name: v.name,
    p_email: v.email,
    p_discipline: v.discipline,
    p_city: v.city,
    p_pbs: v.pbs,
    p_about: v.about,
    p_link: v.link,
  });
  if (error) {
    if (/TOO_MANY/.test(error.message)) return { ok: false, error: t("Twoje zgłoszenie już do nas dotarło. Odezwiemy się.", "We already have your application. We’ll be in touch.") };
    return { ok: false, error: t("Nie udało się wysłać. Spróbuj ponownie.", "Couldn’t send. Please try again.") };
  }
  if (SITE.email) {
    await sendMailOnce(`teamapp:${v.email}:${Date.now()}`, SITE.email, {
      subject: `VYRA Team: zgłoszenie od ${v.name}`,
      preview: `${v.discipline} · ${v.pbs.slice(0, 80)}`,
      title: "Nowe zgłoszenie do VYRA Team",
      paragraphs: [`${v.name} (${v.email})`, `Dyscyplina: ${v.discipline}${v.city ? ` · ${v.city}` : ""}`, `Wyniki: ${v.pbs}`, ...(v.about ? [v.about] : []), ...(v.link ? [`Link: ${v.link}`] : [])],
      after: ["Wszystkie zgłoszenia są w panelu: Strona → VYRA Team."],
    });
  }
  return { ok: true };
}

const memberSchema = z.object({
  name: z.string().trim().min(2, "Imię i nazwisko").max(80),
  discipline: z.enum(disciplines),
  city: z.string().trim().max(60),
  photo_url: z.string().trim().max(500),
  bio: z.string().trim().max(1200),
  pbs: z.string().trim().max(400),
  goal: z.string().trim().max(160),
  quote: z.string().trim().max(240),
  instagram: z.string().trim().max(60),
  tiktok: z.string().trim().max(60),
  strava_url: z.string().trim().max(300).refine((v) => v === "" || /^https:\/\//.test(v), "Pełny link https://…"),
  sort: z.string().trim().refine((v) => v === "" || /^-?\d+$/.test(v), "Liczba"),
  visible: z.boolean(),
});
export type TeamMemberInput = z.input<typeof memberSchema>;

export async function saveTeamMember(id: string | null, input: TeamMemberInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "VYRA Team prowadzą założyciele." };
    const parsed = memberSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const handle = (h: string) => h.replace(/^@/, "") || null;
    const row = {
      ...v,
      city: v.city || null,
      photo_url: v.photo_url || null,
      bio: v.bio || null,
      pbs: v.pbs || null,
      goal: v.goal || null,
      quote: v.quote || null,
      instagram: handle(v.instagram),
      tiktok: handle(v.tiktok),
      strava_url: v.strava_url || null,
      sort: v.sort ? Number(v.sort) : 0,
    };
    const { error } = id ? await supabase.from("team_members").update(row).eq("id", id) : await supabase.from("team_members").insert(row);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/team");
    return { ok: true, message: "Zapisano." };
  });
}

export async function deleteTeamMember(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/team");
    return { ok: true };
  });
}

export async function deleteTeamApplication(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("team_applications").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    return { ok: true };
  });
}
