"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, parseLang } from "@/lib/i18n/shared";

export async function setLanguage(value: string): Promise<void> {
  const lang = parseLang(value);
  if (!lang) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
