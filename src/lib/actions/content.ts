"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { slugify } from "@/lib/camps";
import { optionalText, toText } from "@/lib/validation/fields";
import { dbError, validationError, withUser } from "./helpers";

const articleSchema = z.object({
  title: z.string().trim().min(2, "Podaj tytuł").max(200),
  slug: z.string().trim().max(120),
  category: z.enum(["trening", "sila", "regeneracja", "starty", "zywienie", "obozy"]),
  excerpt: optionalText(400),
  body: z.string().max(60000, "Tekst jest za długi"),
  status: z.enum(["draft", "published"]),
});

export type ArticleInput = z.input<typeof articleSchema>;

export async function saveArticle(id: string | null, input: ArticleInput): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase }) => {
    const parsed = articleSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      title: v.title,
      slug: slugify(v.slug || v.title).slice(0, 120) || `artykul-${Date.now().toString(36)}`,
      category: v.category,
      excerpt: toText(v.excerpt),
      body: v.body,
      status: v.status,
    };
    const res = id
      ? await supabase.from("articles").update(row).eq("id", id).select("id").single()
      : await supabase.from("articles").insert(row).select("id").single();
    if (res.error) {
      if (res.error.message.includes("duplicate")) return { ok: false, error: "Artykuł o takim adresie już istnieje. Zmień adres." };
      return dbError(res.error);
    }
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return {
      ok: true,
      data: { id: (res.data as { id: string }).id },
      message: v.status === "published" ? "Artykuł opublikowany." : "Zapisano szkic.",
    };
  });
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

const teamSchema = z.object({
  full_name: optionalText(120),
  role_label: z.string().trim().min(2, "Podaj rolę").max(120),
  bio: optionalText(1200),
  areas: optionalText(300),
  sort: z.string().trim().refine((v) => v === "" || /^-?\d+$/.test(v), "Liczba"),
  visible: z.boolean(),
});

export type TeamCardInput = z.input<typeof teamSchema>;

export async function saveTeamCard(id: string | null, input: TeamCardInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Stroną zarządzają założyciele." };
    const parsed = teamSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      full_name: toText(v.full_name),
      role_label: v.role_label,
      bio: toText(v.bio),
      areas: toText(v.areas),
      sort: v.sort === "" ? 0 : Number(v.sort),
      visible: v.visible,
    };
    const { error } = id ? await supabase.from("site_team").update(row).eq("id", id) : await supabase.from("site_team").insert(row);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano kartę zespołu." };
  });
}

export async function deleteTeamCard(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("site_team").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

const packageSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę pakietu").max(80),
  tagline: optionalText(160),
  price_pln: z.string().trim().refine((v) => v === "" || /^\d{1,7}$/.test(v), "Cena w zł, bez groszy"),
  period: z.enum(["month", "once", "cycle"]),
  features: optionalText(3000),
  highlighted: z.boolean(),
  sort: z.string().trim().refine((v) => v === "" || /^-?\d+$/.test(v), "Liczba"),
  visible: z.boolean(),
});

export type PackageInput = z.input<typeof packageSchema>;

export async function savePackage(id: string | null, input: PackageInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Pakietami zarządzają założyciele." };
    const parsed = packageSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      name: v.name,
      tagline: toText(v.tagline),
      price_pln: v.price_pln === "" ? null : Number(v.price_pln),
      period: v.period,
      features: toText(v.features),
      highlighted: v.highlighted,
      sort: v.sort === "" ? 0 : Number(v.sort),
      visible: v.visible,
    };
    const { error } = id ? await supabase.from("site_packages").update(row).eq("id", id) : await supabase.from("site_packages").insert(row);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano pakiet." };
  });
}

export async function deletePackage(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("site_packages").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function setSiteMedia(slot: string, url: string | null, alt: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Zdjęciami strony zarządzają założyciele." };
    if (!/^[a-z0-9_]{2,40}$/.test(slot)) return { ok: false, error: "Nieznane miejsce zdjęcia." };
    // Only photos from our own storage bucket (the site renders them with next/image).
    const storage = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/site/`;
    if (url && (!url.startsWith(storage) || /\s/.test(url) || url.length > 1000)) {
      return { ok: false, error: "Nieprawidłowy adres zdjęcia." };
    }
    const { error } = url
      ? await supabase.from("site_media").upsert({ slot, url, alt: alt.trim().slice(0, 200) || null }, { onConflict: "slot" })
      : await supabase.from("site_media").delete().eq("slot", slot);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/", "layout");
    return { ok: true, message: url ? "Zdjęcie ustawione na stronie." : "Przywrócono domyślne zdjęcie." };
  });
}
