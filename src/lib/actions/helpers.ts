import "server-only";
import type { ZodError } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import type { ActionResult, UserRole } from "@/lib/types";
import { friendlyDbError } from "@/lib/utils";

export type ActionFailure = Extract<ActionResult, { ok: false }>;

export function validationError(error: ZodError): ActionFailure {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: error.issues[0]?.message ?? "Sprawdź formularz.", fieldErrors };
}

export function dbError(error: { message?: string } | null | undefined): ActionFailure {
  if (error?.message) console.error("[db]", error.message);
  return { ok: false, error: friendlyDbError(error?.message) };
}

type Ctx = { supabase: ServerSupabase; user: CurrentUser };

/**
 * Runs an action for a signed-in user, optionally restricted to one role.
 * The role check is a fast path for clear messages; RLS enforces access regardless.
 */
export async function withUser<T>(role: UserRole | null, fn: (ctx: Ctx) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." };
  if (role && user.profile.role !== role) return { ok: false, error: "Ta operacja jest dostępna tylko dla roli: " + (role === "coach" ? "trener" : "zawodnik") + "." };
  const supabase = await createClient();
  try {
    return await fn({ supabase, user });
  } catch (e) {
    console.error("[action]", e);
    return { ok: false, error: "Coś poszło nie tak. Spróbuj ponownie." };
  }
}
