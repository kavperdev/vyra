"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayISO } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

const scale = z.number().int().min(1).max(5);
const schema = z.object({
  sleep: scale,
  energy: scale,
  soreness: scale,
  pain: z.boolean(),
  pain_area: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

export type ReadinessInput = z.input<typeof schema>;

export async function saveReadiness(input: ReadinessInput): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const { error } = await supabase.from("readiness").upsert(
      {
        athlete_id: user.id,
        day: todayISO(user.profile.timezone),
        sleep: v.sleep,
        energy: v.energy,
        soreness: v.soreness,
        pain: v.pain,
        pain_area: v.pain ? v.pain_area || null : null,
        note: v.note || null,
      },
      { onConflict: "athlete_id,day" },
    );
    if (error) return dbError(error);
    revalidatePath("/athlete");
    revalidatePath("/coach", "layout");
    return { ok: true, message: "Dziękujemy. Trener widzi Twoją gotowość." };
  });
}
