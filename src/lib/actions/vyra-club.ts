"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAILS, mailConfigured, sendMailBatch, sendMailOnce } from "@/lib/mail";
import { getT } from "@/lib/i18n/server";
import { publicOrigin } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

/** Join VYRA Club. New members land on their page straight away; the link also goes by e-mail. */
export async function joinClub(input: {
  name: string;
  email: string;
  newsletter: boolean;
  consent: boolean;
  via?: string | null;
  website?: string;
}): Promise<ActionResult<{ token: string | null }>> {
  if (input.website) return { ok: true, data: { token: null } };
  const { t } = await getT();
  const parsed = z
    .object({
      name: z.string().trim().min(2, t("Podaj imię", "Enter your name")).max(60),
      email: z.string().trim().toLowerCase().email(t("Podaj poprawny adres e-mail", "Enter a valid email address")).max(254),
      newsletter: z.boolean(),
      consent: z.literal(true, { errorMap: () => ({ message: t("Zaznacz zgodę", "Please tick the consent") }) }),
    })
    .safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const via = (input.via ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "strona";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("club_join", { p_email: v.email, p_name: v.name, p_newsletter: v.newsletter, p_via: via });
  if (error) return { ok: false, error: t("Nie udało się zapisać. Spróbuj ponownie.", "Couldn’t sign you up. Please try again.") };
  const row = (Array.isArray(data) ? data[0] : data) as { token: string | null; member_no: number; is_new: boolean };
  if (row.is_new && row.token) {
    await sendMailOnce(`clubjoin:${v.email}`, v.email, MAILS.clubWelcome({ name: v.name, memberNo: row.member_no, token: row.token }));
    revalidatePath("/klub");
    return { ok: true, data: { token: row.token } };
  }
  const { data: tok } = await supabase.rpc("member_token", { p_secret: process.env.VYRA_PURCHASE_SECRET ?? "", p_email: v.email });
  if (typeof tok === "string") {
    const day = new Date().toISOString().slice(0, 10);
    await sendMailOnce(`clublink:${v.email}:${day}`, v.email, MAILS.clubWelcome({ name: v.name, memberNo: row.member_no, token: tok, again: true }));
  }
  return { ok: true, data: { token: null } };
}

export async function setNewsletter(token: string, on: boolean): Promise<ActionResult<{ on: boolean }>> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false, error: "Nieprawidłowy link." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("member_newsletter", { p_token: token, p_on: on });
  if (error || data == null) return { ok: false, error: "Nie udało się zapisać." };
  return { ok: true, data: { on: data === true } };
}

const postSchema = z.object({
  kind: z.enum(["plan", "news", "event"]),
  title: z.string().trim().min(2, "Podaj tytuł").max(120),
  body: z.string().trim().max(4000),
  link_url: z.string().trim().max(500).refine((v) => v === "" || /^(https?:\/\/|\/)/.test(v), "Pełny adres (https://…) albo ścieżka (/run-club)"),
  link_label: z.string().trim().max(60),
  visible: z.boolean(),
  sort: z.string().trim().refine((v) => v === "" || /^-?\d+$/.test(v), "Liczba"),
});
export type MemberPostInput = z.input<typeof postSchema>;

export async function saveMemberPost(id: string | null, input: MemberPostInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "VYRA Club prowadzą założyciele." };
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = { ...v, body: v.body || null, link_url: v.link_url || null, link_label: v.link_label || null, sort: v.sort ? Number(v.sort) : 0 };
    const { error } = id ? await supabase.from("member_posts").update(row).eq("id", id) : await supabase.from("member_posts").insert(row);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    return { ok: true, message: "Zapisano." };
  });
}

export async function deleteMemberPost(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("member_posts").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    return { ok: true };
  });
}

const issueSchema = z
  .object({
    subject: z.string().trim().min(3, "Podaj temat").max(140),
    body: z.string().trim().min(20, "Napisz treść").max(8000),
    cta_label: z.string().trim().max(60),
    cta_url: z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\//.test(v), "Pełny adres, np. https://vyraathl.pl/wyzwania"),
  })
  .refine((v) => !v.cta_label === !v.cta_url, { message: "Podaj i napis, i adres przycisku (albo oba puste)", path: ["cta_url"] });
export type NewsletterInput = z.input<typeof issueSchema>;

function issueMail(v: { subject: string; body: string; cta_label: string | null; cta_url: string | null }, token: string) {
  return MAILS.newsletter({ subject: v.subject, body: v.body, cta: v.cta_label && v.cta_url ? { label: v.cta_label, url: v.cta_url } : null, token });
}

/** Panel: send the draft only to yourself, to see how it looks. */
export async function sendNewsletterTest(input: NewsletterInput): Promise<ActionResult> {
  return withUser("coach", async ({ user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Newsletter wysyłają założyciele." };
    if (!mailConfigured()) return { ok: false, error: "Wysyłka maili nie jest skonfigurowana (RESEND_API_KEY)." };
    const parsed = issueSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    if (!user.email) return { ok: false, error: "Twoje konto nie ma adresu e-mail." };
    const v = parsed.data;
    const n = await sendMailBatch([{ to: user.email, m: issueMail({ ...v, subject: `[TEST] ${v.subject}`, cta_label: v.cta_label || null, cta_url: v.cta_url || null }, "00000000-0000-0000-0000-000000000000") }]);
    return n ? { ok: true, message: `Wysłano test na ${user.email}.` } : { ok: false, error: "Test nie wyszedł. Sprawdź ustawienia maili." };
  });
}

/** Panel: send to everyone with the newsletter switched on. One issue goes out once. */
export async function sendNewsletter(input: NewsletterInput): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Newsletter wysyłają założyciele." };
    if (!mailConfigured()) return { ok: false, error: "Wysyłka maili nie jest skonfigurowana (RESEND_API_KEY)." };
    const parsed = issueSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = { ...parsed.data, cta_label: parsed.data.cta_label || null, cta_url: parsed.data.cta_url || null };
    const { data: list, error: listError } = await supabase.from("vyra_members").select("email, token").eq("newsletter", true);
    if (listError) return dbError(listError);
    const people = (list ?? []) as { email: string; token: string }[];
    if (!people.length) return { ok: false, error: "Nikt jeszcze nie zapisał się na newsletter." };
    const { data: issue, error } = await supabase.from("newsletter_issues").insert({ ...v, sent_at: new Date().toISOString() }).select("id").single();
    if (error) return dbError(error);
    const origin = publicOrigin();
    const sent = await sendMailBatch(people.map((p) => ({ to: p.email, m: issueMail(v, p.token), unsubscribe: `${origin}/klub/newsletter?t=${p.token}&off=1` })));
    await supabase.from("newsletter_issues").update({ recipients: sent }).eq("id", (issue as { id: string }).id);
    revalidatePath("/coach/site");
    return sent ? { ok: true, message: `Wysłano do ${sent} z ${people.length} osób.` } : { ok: false, error: "Nie udało się wysłać. Sprawdź ustawienia maili." };
  });
}
