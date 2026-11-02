import "server-only";
import { cache } from "react";
import { SITE } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export interface CompanySettings {
  controller: string;
  address: string;
  tax_id: string;
  email: string;
  phone: string;
  instagram: string;
}

/** Company details from the panel, falling back to src/lib/site.ts (also before the migration). */
export const getCompany = cache(async (): Promise<CompanySettings> => {
  const base: CompanySettings = { controller: SITE.controller, address: SITE.address, tax_id: "", email: SITE.email, phone: "", instagram: SITE.instagram };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error || !data) return base;
    const d = data as Partial<Record<keyof CompanySettings, string | null>>;
    return {
      controller: d.controller?.trim() || base.controller,
      address: d.address?.trim() ?? base.address,
      tax_id: d.tax_id?.trim() ?? "",
      email: d.email?.trim() ?? base.email,
      phone: d.phone?.trim() ?? "",
      instagram: d.instagram?.trim() ?? base.instagram,
    };
  } catch {
    return base;
  }
});

export type LegalSlug = "regulamin" | "polityka-prywatnosci";

/** Custom text of a legal page, or null to use the built-in default. */
export async function getLegalOverride(slug: LegalSlug): Promise<{ body: string | null; body_en: string | null; updated_at: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_pages").select("body, body_en, updated_at").eq("slug", slug).maybeSingle();
    if (error || !data) return { body: null, body_en: null, updated_at: null };
    const d = data as { body: string | null; body_en: string | null; updated_at: string | null };
    return { body: d.body?.trim() || null, body_en: d.body_en?.trim() || null, updated_at: d.updated_at };
  } catch {
    return { body: null, body_en: null, updated_at: null };
  }
}
