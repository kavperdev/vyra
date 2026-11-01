"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { emailField } from "@/lib/validation/forms";
import { dbError, validationError, withUser } from "./helpers";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksymalnie ${max} znaków`)
    .transform((v) => (v === "" ? null : v));

const applicationSchema = z.object({
  full_name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  email: emailField,
  phone: optional(40),
  package: z.enum(["plan", "coaching", "elite", "unsure"]),
  goal: z.string().trim().min(3, "Napisz w kilku słowach, jaki masz cel").max(1000),
  records: optional(500),
  weekly_km: optional(40),
  injuries: optional(1000),
  message: optional(2000),
  consent: z.literal(true, { errorMap: () => ({ message: "Zaznacz zgodę, żebyśmy mogli się z Tobą skontaktować" }) }),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

export type ApplicationInput = z.input<typeof applicationSchema>;

export async function submitApplication(input: ApplicationInput): Promise<ActionResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    if (input.website) return { ok: true };
    return validationError(parsed.error);
  }
  const { website, ...row } = parsed.data;
  if (website) return { ok: true };
  const supabase = await createClient();
  // No .select() after insert: visitors may write an application but never read one back.
  const { error } = await supabase.from("applications").insert({ ...row, status: "new" });
  if (error) return dbError(error);
  return { ok: true, message: "Dziękujemy! Odezwiemy się w ciągu 48 godzin." };
}

const STATUSES = ["new", "contacted", "invited", "rejected"] as const;

export async function setApplicationStatus(id: string, status: string): Promise<ActionResult> {
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false, error: "Nieznany status." };
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/applications");
    revalidatePath("/coach", "layout");
    return { ok: true };
  });
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/applications");
    revalidatePath("/coach", "layout");
    return { ok: true };
  });
}
