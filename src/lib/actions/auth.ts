"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { friendlyDbError } from "@/lib/utils";
import { forgotSchema, inviteSignupSchema, loginSchema, newPasswordSchema, signupSchema } from "@/lib/validation/forms";
import { validationError } from "./helpers";

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return siteUrl(host ? `${proto}://${host}` : undefined);
}

function safeNext(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function signIn(input: { email: string; password: string; next?: string }): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { ok: false, error: "Potwierdź adres e-mail, klikając link w wiadomości od nas." };
    }
    return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };
  }
  const user = await getCurrentUser();
  redirect(safeNext(input.next) ?? (user ? homeFor(user.profile.role) : "/panel"));
}

export async function signUpCoach(input: { full_name: string; email: string; password: string }): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name }, emailRedirectTo: `${await origin()}/auth/callback?next=/coach` },
  });
  if (error) return { ok: false, error: error.message.includes("Database error") ? friendlyDbError("COACH_SIGNUP_CLOSED") : signupMessage(error.message) };
  if (data.session) redirect("/coach");
  return { ok: true, message: "Sprawdź skrzynkę i potwierdź adres e-mail, aby się zalogować." };
}

export async function signUpWithInvite(input: { token: string; full_name: string; email: string; password: string }): Promise<ActionResult> {
  const parsed = inviteSignupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, invite_token: parsed.data.token },
      emailRedirectTo: `${await origin()}/auth/callback?next=/panel`,
    },
  });
  if (error) {
    // Errors raised in the sign-up trigger come back as a generic "Database error saving new user".
    if (error.message.includes("Database error")) {
      return { ok: false, error: "Nie udało się przyjąć zaproszenia. Sprawdź, czy używasz adresu e-mail, na który przyszło zaproszenie, i czy link jest aktualny." };
    }
    return { ok: false, error: signupMessage(error.message) };
  }
  if (data.session) redirect("/panel");
  return { ok: true, message: "Konto utworzone. Potwierdź adres e-mail linkiem z wiadomości, a potem zaloguj się." };
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  redirect("/athlete");
}

export async function requestPasswordReset(input: { email: string }): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the address exists, so accounts cannot be discovered.
  return { ok: true, message: "Jeśli konto istnieje, wysłaliśmy link do ustawienia nowego hasła." };
}

export async function updatePassword(input: { password: string; confirm: string }): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Link wygasł. Poproś o nowy link do zmiany hasła." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "Nie udało się zmienić hasła. " + (error.message.includes("different") ? "Nowe hasło musi różnić się od obecnego." : "") };
  return { ok: true, message: "Hasło zostało zmienione." };
}

function signupMessage(message: string): string {
  if (message.toLowerCase().includes("already registered")) return "Konto z tym adresem już istnieje. Zaloguj się.";
  if (message.toLowerCase().includes("password")) return "Hasło nie spełnia wymagań bezpieczeństwa.";
  return "Nie udało się utworzyć konta. Spróbuj ponownie.";
}
