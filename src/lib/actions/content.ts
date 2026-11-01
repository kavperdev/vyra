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
  lang: z.enum(["pl", "en"]).optional(),
  lang_was: z.enum(["pl", "en"]).optional(),
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
      // Written only for English articles, so Polish articles save even before the translation migration.
      ...(v.lang === "en" || v.lang_was === "en" ? { lang: v.lang ?? "pl" } : {}),
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
  role_label_en: optionalText(120),
  bio_en: optionalText(1200),
  areas_en: optionalText(300),
  had_en: z.boolean().optional(),
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
      ...(v.had_en || v.role_label_en || v.bio_en || v.areas_en
        ? { role_label_en: toText(v.role_label_en), bio_en: toText(v.bio_en), areas_en: toText(v.areas_en) }
        : {}),
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

const planSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę pakietu").max(60),
  tagline: optionalText(200),
  kind: z.enum(["monthly", "once"]),
  price_pln: z.string().trim().regex(/^\d{1,6}$/, "Podaj cenę w zł"),
  commit_price_pln: z.string().trim().refine((v) => v === "" || /^\d{1,6}$/.test(v), "Podaj cenę w zł albo zostaw puste"),
  features: optionalText(3000),
  badge: optionalText(40),
  highlighted: z.boolean(),
  visible: z.boolean(),
  sort: z.string().trim().refine((v) => v === "" || /^-?\d+$/.test(v), "Liczba"),
  name_en: optionalText(60),
  tagline_en: optionalText(200),
  features_en: optionalText(3000),
  badge_en: optionalText(40),
  had_en: z.boolean().optional(),
});

export type CoachingPlanInput = z.input<typeof planSchema>;

export async function saveCoachingPlan(id: string | null, input: CoachingPlanInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Ofertą zarządzają założyciele." };
    const parsed = planSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      name: v.name,
      tagline: toText(v.tagline),
      kind: v.kind,
      price_pln: Number(v.price_pln),
      commit_price_pln: v.kind === "monthly" && v.commit_price_pln !== "" ? Number(v.commit_price_pln) : null,
      features: toText(v.features),
      badge: toText(v.badge),
      highlighted: v.highlighted,
      visible: v.visible,
      sort: v.sort === "" ? 0 : Number(v.sort),
      ...(v.had_en || v.name_en || v.tagline_en || v.features_en || v.badge_en
        ? { name_en: toText(v.name_en), tagline_en: toText(v.tagline_en), features_en: toText(v.features_en), badge_en: toText(v.badge_en) }
        : {}),
    };
    const { error } = id ? await supabase.from("coaching_plans").update(row).eq("id", id) : await supabase.from("coaching_plans").insert(row);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/prowadzenie");
    return { ok: true, message: "Zapisano pakiet." };
  });
}

export async function deleteCoachingPlan(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("coaching_plans").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    revalidatePath("/prowadzenie");
    return { ok: true };
  });
}
