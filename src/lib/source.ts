import "server-only";
import { cookies } from "next/headers";
import type { ServerSupabase } from "@/lib/supabase/server";

export const SOURCE_COOKIE = "vyra-src";

/** Where the visitor came from (set by SourceTracker on the site). Null when unknown. */
export async function readSource(): Promise<string | null> {
  const v = (await cookies()).get(SOURCE_COOKIE)?.value;
  if (!v) return null;
  let raw = v;
  try {
    raw = decodeURIComponent(v);
  } catch {
    // keep the raw value
  }
  const clean = raw.toLowerCase().replace(/[^a-z0-9:._-]/g, "").slice(0, 60);
  return clean || null;
}


/**
 * Inserts an application with its source. If the `source` column does not exist yet
 * (migration not run), retries without it so no request is ever lost.
 */
export async function insertApplication(supabase: ServerSupabase, row: Record<string, unknown>, explicitSource?: string | null) {
  const source = explicitSource ?? (await readSource());
  const first = await supabase.from("applications").insert(source ? { ...row, source } : row);
  if (first.error && source && (first.error.code === "42703" || first.error.code === "PGRST204" || /source/.test(first.error.message ?? ""))) {
    return supabase.from("applications").insert(row);
  }
  return first;
}
