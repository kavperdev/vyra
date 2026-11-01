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

const consent = z.literal(true, {
  errorMap: () => ({ message: "Zaznacz zgodę, żebyśmy mogli się z Tobą skontaktować" }),
});

const campSchema = z.object({
  kind: z.literal("camp"),
  full_name: z.string().trim().min(2, "Podaj imię").max(120),
  email: emailField,
  consent,
  website: z.string().max(0).optional(),
});

const coachingSchema = z.object({
  kind: z.literal("coaching"),
  full_name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  email: emailField,
  goal: z.string().trim().min(3, "Napisz w kilku słowach, jaki masz cel").max(1000),
  records: optional(500),
  message: optional(2000),
  consent,
  website: z.string().max(0).optional(),
});

const applicationSchema = z.discriminatedUnion("kind", [campSchema, coachingSchema]);

export type ApplicationInput = z.input<typeof applicationSchema>;

export async function submitApplication(input: ApplicationInput): Promise<ActionResult> {
  // Honeypot: a hidden field only bots fill in. Pretend success so they do not retry.
  if (input.website) return { ok: true };
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { website, ...row } = parsed.data;
  if (website) return { ok: true };
  const supabase = await createClient();
  // No .select() after insert: visitors may write an application but never read one back.
  const { error } = await supabase.from("applications").insert({ ...row, status: "new" });
  if (error) return dbError(error);
  return { ok: true };
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
