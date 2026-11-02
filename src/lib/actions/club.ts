"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

export async function signUpRunClub(input: { event_id: string; full_name: string; email: string; consent: boolean; website?: string }): Promise<ActionResult> {
  if (input.website) return { ok: true };
  const { t } = await getT();
  const parsed = z
    .object({
      event_id: z.string().uuid(),
      full_name: z.string().trim().min(2, t("Podaj imię", "Enter your name")).max(120),
      email: z.string().trim().toLowerCase().email(t("Podaj poprawny adres e-mail", "Enter a valid email address")).max(254),
      consent: z.literal(true, { errorMap: () => ({ message: t("Zaznacz zgodę", "Please tick the consent") }) }),
    })
    .safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { consent: _consent, ...row } = parsed.data;
  const { error } = await supabase.from("run_club_signups").insert(row);
  if (error) {
    if (error.message.includes("duplicate")) return { ok: true };
    return { ok: false, error: t("Nie udało się zapisać. Spróbuj ponownie.", "Couldn’t sign you up. Please try again.") };
  }
  revalidatePath("/run-club");
  return { ok: true };
}

const eventSchema = z.object({
  title: z.string().trim().min(2, "Podaj tytuł").max(120),
  starts_at: z.string().min(10, "Wybierz datę"),
  place: z.string().trim().min(2, "Podaj miejsce").max(160),
  map_url: z.string().trim().max(500),
  pace: z.string().trim().max(80),
  description: z.string().trim().max(2000),
  capacity: z.string().trim().refine((v) => v === "" || /^\d{1,3}$/.test(v), "Liczba"),
  visible: z.boolean(),
});
export type RunClubEventInput = z.input<typeof eventSchema>;

export async function saveRunClubEvent(id: string | null, input: RunClubEventInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Stroną zarządzają założyciele." };
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      title: v.title,
      starts_at: new Date(v.starts_at).toISOString(),
      place: v.place,
      map_url: v.map_url || null,
      pace: v.pace || null,
      description: v.description || null,
      capacity: v.capacity ? Number(v.capacity) : null,
      visible: v.visible,
    };
    const { error } = id ? await supabase.from("run_club_events").update(row).eq("id", id) : await supabase.from("run_club_events").insert(row);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/run-club");
    return { ok: true, message: "Zapisano." };
  });
}

export async function deleteRunClubEvent(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("run_club_events").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/run-club");
    return { ok: true };
  });
}

const testimonialSchema = z.object({
  name: z.string().trim().min(2, "Podaj imię").max(80),
  result: z.string().trim().max(120),
  quote: z.string().trim().min(5, "Wpisz opinię").max(600),
  quote_en: z.string().trim().max(600),
  sort: z.string().trim().refine((v) => v === "" || /^-?\d+$/.test(v), "Liczba"),
  visible: z.boolean(),
});
export type TestimonialInput = z.input<typeof testimonialSchema>;

export async function saveTestimonial(id: string | null, input: TestimonialInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Stroną zarządzają założyciele." };
    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = { name: v.name, result: v.result || null, quote: v.quote, quote_en: v.quote_en || null, sort: v.sort ? Number(v.sort) : 0, visible: v.visible };
    const { error } = id ? await supabase.from("testimonials").update(row).eq("id", id) : await supabase.from("testimonials").insert(row);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano." };
  });
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

const ambassadorSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Tylko małe litery, cyfry i myślniki, np. ania-biega")
    .max(40),
  name: z.string().trim().min(2, "Podaj imię").max(80),
  handle: z.string().trim().max(60),
  goal: z.string().trim().max(160),
  quote: z.string().trim().max(400),
  code: z.string().trim().toUpperCase().max(40),
  discount_pct: z.string().trim().refine((v) => /^\d{1,2}$/.test(v), "Liczba 0–90"),
  photo_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\//.test(v) || v.startsWith("/"), "Adres zdjęcia musi zaczynać się od https://"),
  visible: z.boolean(),
});
export type AmbassadorInput = z.input<typeof ambassadorSchema>;

export async function saveAmbassador(id: string | null, input: AmbassadorInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Stroną zarządzają założyciele." };
    const parsed = ambassadorSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      slug: v.slug,
      name: v.name,
      handle: v.handle || null,
      goal: v.goal || null,
      quote: v.quote || null,
      code: v.code || null,
      discount_pct: Number(v.discount_pct),
      photo_url: v.photo_url || null,
      visible: v.visible,
    };
    const { error } = id ? await supabase.from("ambassadors").update(row).eq("id", id) : await supabase.from("ambassadors").insert(row);
    if (error) return error.code === "23505" ? { ok: false, error: "Ten adres jest już zajęty.", fieldErrors: { slug: ["Ten adres jest już zajęty"] } } : dbError(error);
    revalidatePath("/coach/site");
    revalidatePath(`/z/${v.slug}`);
    return { ok: true, message: "Zapisano." };
  });
}

export async function deleteAmbassador(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("ambassadors").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    return { ok: true };
  });
}
