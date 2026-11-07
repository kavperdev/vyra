"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { INJURY_AREAS } from "@/lib/data/injuries";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

const text = (max: number) => z.string().trim().max(max, `Maksymalnie ${max} znaków`);
const date = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Wybierz datę");

const injurySchema = z
  .object({
    id: z.string().uuid().optional(),
    athlete_id: z.string().uuid(),
    area: z.enum(INJURY_AREAS as [string, ...string[]]),
    side: z.enum(["", "lewa", "prawa", "obie"]),
    name: z.string().trim().min(2, "Napisz, co to za uraz").max(160),
    status: z.enum(["active", "healing", "healed", "recurring"]),
    severity: z.enum(["1", "2", "3"]),
    started_on: date,
    ended_on: date,
    triggers: text(1000),
    restrictions: text(1000),
    helps: text(1000),
    notes: text(2000),
  })
  .refine((v) => !v.started_on || !v.ended_on || v.ended_on >= v.started_on, { path: ["ended_on"], message: "Koniec nie może być przed początkiem" });

export type InjuryInput = z.input<typeof injurySchema>;

/** Adds or updates an injury. The athlete and their coaches or physio can do it (RLS decides). */
export async function saveInjury(input: InjuryInput): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const parsed = injurySchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      athlete_id: v.athlete_id,
      area: v.area,
      side: v.side || null,
      name: v.name,
      status: v.status,
      severity: Number(v.severity),
      started_on: v.started_on || null,
      ended_on: v.ended_on || null,
      triggers: v.triggers || null,
      restrictions: v.restrictions || null,
      helps: v.helps || null,
      notes: v.notes || null,
    };
    const { error } = v.id ? await supabase.from("athlete_injuries").update(row).eq("id", v.id) : await supabase.from("athlete_injuries").insert(row);
    if (error) return dbError(error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano w historii kontuzji." };
  });
}

export async function deleteInjury(id: string): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const { error } = await supabase.from("athlete_injuries").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Usunięto wpis." };
  });
}
