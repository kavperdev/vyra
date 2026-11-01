"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { slugify } from "@/lib/camps";
import { parsePace } from "@/lib/format";
import { decimalField, intField, isoDate, optionalText, paceField, toDecimal, toInt, toText } from "@/lib/validation/fields";
import { dbError, validationError, withUser } from "./helpers";

function revalidateSite() {
  revalidatePath("/", "layout");
}

const optionalDate = z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Wybierz datę");

const campSchema = z
  .object({
    title: z.string().trim().min(2, "Podaj nazwę obozu").max(160),
    slug: z.string().trim().max(80),
    format: z.enum(["weekend", "week", "other"]),
    status: z.enum(["draft", "published", "closed", "archived"]),
    starts_on: optionalDate,
    ends_on: optionalDate,
    location: optionalText(160),
    venue: optionalText(160),
    price_pln: intField(0, 1000000, "Cena w zł, bez groszy"),
    capacity: intField(1, 500, "Liczba miejsc 1–500"),
    summary: optionalText(600),
    description: optionalText(20000),
    included: optionalText(4000),
    title_en: optionalText(160),
    summary_en: optionalText(600),
    description_en: optionalText(20000),
    included_en: optionalText(3000),
    /** The record already had English texts, so empty fields must be cleared, not skipped. */
    had_en: z.boolean().optional(),
  })
  .refine((v) => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, {
    path: ["ends_on"],
    message: "Koniec nie może być przed początkiem",
  });

export type CampInput = z.input<typeof campSchema>;

export async function saveCamp(id: string | null, input: CampInput): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Obozami zarządzają założyciele." };
    const parsed = campSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const slug = slugify(v.slug || v.title) || `oboz-${Date.now().toString(36)}`;
    const row = {
      title: v.title,
      slug,
      format: v.format,
      status: v.status,
      starts_on: v.starts_on || null,
      ends_on: v.ends_on || null,
      location: toText(v.location),
      venue: toText(v.venue),
      price_pln: toInt(v.price_pln),
      capacity: toInt(v.capacity),
      summary: toText(v.summary),
      description: toText(v.description),
      included: toText(v.included),
      // English fields are written only when used, so the form keeps working before the translation migration.
      ...(v.had_en || v.title_en || v.summary_en || v.description_en || v.included_en
        ? {
            title_en: toText(v.title_en),
            summary_en: toText(v.summary_en),
            description_en: toText(v.description_en),
            included_en: toText(v.included_en),
          }
        : {}),
    };
    const res = id
      ? await supabase.from("camps").update(row).eq("id", id).select("id").single()
      : await supabase.from("camps").insert(row).select("id").single();
    if (res.error) {
      if (res.error.message.includes("duplicate")) return { ok: false, error: "Obóz o takim adresie już istnieje. Zmień adres (slug)." };
      return dbError(res.error);
    }
    revalidatePath("/coach/camps");
    revalidateSite();
    return { ok: true, data: { id: (res.data as { id: string }).id }, message: "Zapisano obóz." };
  });
}

export async function deleteCamp(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("camps").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/camps");
    revalidateSite();
    return { ok: true };
  });
}

const participantSchema = z.object({
  full_name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Podaj poprawny e-mail")]),
  phone: optionalText(40),
  status: z.enum(["interested", "registered", "paid", "attended", "cancelled"]),
  notes: optionalText(4000),
});

export type ParticipantInput = z.input<typeof participantSchema>;

export async function saveParticipant(campId: string, id: string | null, input: ParticipantInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const parsed = participantSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = { full_name: v.full_name, email: v.email || null, phone: toText(v.phone), status: v.status, notes: toText(v.notes) };
    const { error } = id
      ? await supabase.from("camp_participants").update(row).eq("id", id)
      : await supabase.from("camp_participants").insert({ ...row, camp_id: campId });
    if (error) {
      if (error.message.includes("duplicate")) return { ok: false, error: "Ta osoba jest już na liście tego obozu." };
      return dbError(error);
    }
    revalidatePath(`/coach/camps/${campId}`);
    revalidateSite();
    return { ok: true, message: "Zapisano." };
  });
}

export async function setParticipantStatus(campId: string, id: string, status: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const parsed = participantSchema.shape.status.safeParse(status);
    if (!parsed.success) return { ok: false, error: "Nieznany status." };
    const { error } = await supabase.from("camp_participants").update({ status: parsed.data }).eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/coach/camps/${campId}`);
    revalidateSite();
    return { ok: true };
  });
}

export async function deleteParticipant(campId: string, id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("camp_participants").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/coach/camps/${campId}`);
    revalidateSite();
    return { ok: true };
  });
}

const testSchema = z
  .object({
    tested_on: z.union([z.literal(""), isoDate]),
    vo2max: decimalField(10, 100, "VO2max 10–100"),
    hr_max: intField(100, 240),
    hr_rest: intField(25, 120),
    lt1_hr: intField(60, 230),
    lt2_hr: intField(60, 230),
    lt1_pace: paceField,
    lt2_pace: paceField,
    weight_kg: decimalField(20, 300),
    body_fat_pct: decimalField(2, 70),
    muscle_kg: decimalField(5, 150),
    cmj_cm: decimalField(1, 120),
    notes: optionalText(4000),
  });

export type TestInput = z.input<typeof testSchema>;

export async function saveCampTest(
  campId: string,
  participantId: string,
  phase: "start" | "end",
  input: TestInput,
): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const parsed = testSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const pace = (s: string) => {
      const p = parsePace(s);
      return p == null || !Number.isFinite(p) ? null : p;
    };
    const row = {
      participant_id: participantId,
      phase,
      tested_on: v.tested_on || null,
      vo2max: toDecimal(v.vo2max),
      hr_max: toInt(v.hr_max),
      hr_rest: toInt(v.hr_rest),
      lt1_hr: toInt(v.lt1_hr),
      lt2_hr: toInt(v.lt2_hr),
      lt1_pace_s: pace(v.lt1_pace),
      lt2_pace_s: pace(v.lt2_pace),
      weight_kg: toDecimal(v.weight_kg),
      body_fat_pct: toDecimal(v.body_fat_pct),
      muscle_kg: toDecimal(v.muscle_kg),
      cmj_cm: toDecimal(v.cmj_cm),
      notes: toText(v.notes),
    };
    const { error } = await supabase.from("camp_tests").upsert(row, { onConflict: "participant_id,phase" });
    if (error) return dbError(error);
    revalidatePath(`/coach/camps/${campId}/participants/${participantId}`);
    return { ok: true, message: phase === "start" ? "Zapisano test startowy." : "Zapisano test końcowy." };
  });
}

export async function saveCampPrivateInfo(campId: string, body: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Informacje dla uczestników edytują założyciele." };
    if (body.length > 20000) return { ok: false, error: "Tekst jest za długi." };
    const { error } = await supabase.from("camp_private_info").upsert({ camp_id: campId, body }, { onConflict: "camp_id" });
    if (error) return dbError(error);
    revalidatePath(`/coach/camps/${campId}`);
    revalidatePath("/athlete/camp");
    return { ok: true, message: "Zapisano. Uczestnicy z kontem dostali powiadomienie." };
  });
}

const budgetSchema = z.object({
  planned_participants: z.number().int().min(1).max(500),
  reserve_pct: z.number().min(0).max(100),
  founders: z.number().int().min(1).max(10),
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Podaj nazwę kosztu").max(160),
        kind: z.enum(["per_person", "fixed"]),
        amount_pln: z.number().min(0).max(10000000),
        note: z.string().trim().max(300).nullable(),
      }),
    )
    .max(100),
});

export type BudgetInput = z.input<typeof budgetSchema>;

export async function saveCampBudget(campId: string, input: BudgetInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Finanse obozu widzą tylko założyciele." };
    const parsed = budgetSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const up = await supabase.from("camp_budget").upsert(
      { camp_id: campId, planned_participants: v.planned_participants, reserve_pct: v.reserve_pct, founders: v.founders },
      { onConflict: "camp_id" },
    );
    if (up.error) return dbError(up.error);
    const del = await supabase.from("camp_budget_items").delete().eq("camp_id", campId);
    if (del.error) return dbError(del.error);
    if (v.items.length) {
      const ins = await supabase
        .from("camp_budget_items")
        .insert(v.items.map((i, sort) => ({ ...i, note: i.note || null, camp_id: campId, sort })));
      if (ins.error) return dbError(ins.error);
    }
    revalidatePath(`/coach/camps/${campId}/finance`);
    return { ok: true, message: "Zapisano budżet obozu." };
  });
}
