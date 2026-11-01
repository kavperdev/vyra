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
