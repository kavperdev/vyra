import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Cookie that keeps the free plan open on this device. Set by the server, so Safari does not trim it after 7 days. */
const COOKIE = "vyra_fp";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isPlanToken = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export async function rememberPlan(token: string) {
  (await cookies()).set(COOKIE, token, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function planCookie(): Promise<string | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  return isPlanToken(v) ? v : null;
}

/** Registers the e-mail. Null when the database does not have the table yet (migration not run). */
export async function startPlan(email: string, name: string): Promise<{ token: string; isNew: boolean } | null> {
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!secret) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("free_plan_start", { p_secret: secret, p_email: email, p_name: name });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.token) return null;
  return { token: String(row.token), isNew: !!row.is_new };
}
