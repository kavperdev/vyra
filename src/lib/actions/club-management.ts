"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { publicOrigin } from "@/lib/env";
import { mailConfigured, sendMailBatch } from "@/lib/mail";
import { warsawToISO, zl } from "@/lib/clubs/schedule";
import type { ActionResult } from "@/lib/types";
import { toText } from "@/lib/validation/fields";
import { dbError, validationError, withUser } from "./helpers";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Wybierz datę");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Godzina w formacie HH:MM");

function refresh() {
  revalidatePath("/coach/klub");
  revalidatePath("/athlete", "layout");
}
const forbidden = (m?: string) => (m?.includes("FORBIDDEN") || m?.includes("row-level security") ? { ok: false as const, error: "Nie masz uprawnień do zarządzania tym klubem." } : null);

// ---------------------------------------------------------------- groups
const groupSchema = z.object({
  id: z.string().optional(),
  club_id: uuid,
  name: z.string().trim().min(1, "Podaj nazwę grupy").max(80),
  description: z.string().trim().max(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function saveGroup(input: z.input<typeof groupSchema>): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase }) => {
    const p = groupSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const row = { club_id: p.data.club_id, name: p.data.name, description: toText(p.data.description), color: p.data.color };
    const res = p.data.id
      ? await supabase.from("club_groups").update(row).eq("id", p.data.id).select("id").single()
      : await supabase.from("club_groups").insert(row).select("id").single();
    if (res.error) return forbidden(res.error.message) ?? dbError(res.error);
    refresh();
    return { ok: true, data: { id: (res.data as { id: string }).id }, message: p.data.id ? "Zapisano grupę." : "Dodano grupę." };
  });
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("club_groups").delete().eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Usunięto grupę. Treningi i wyniki zawodników zostały." };
  });
}

/** Replace the group's members with the given athletes. */
export async function setGroupMembers(groupId: string, athleteIds: string[]): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const ids = [...new Set(athleteIds.filter((x) => uuid.safeParse(x).success))];
    const { data: current, error: e1 } = await supabase.from("club_group_members").select("athlete_id").eq("group_id", groupId);
    if (e1) return dbError(e1);
    const have = new Set(((current ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id));
    const remove = [...have].filter((x) => !ids.includes(x));
    const add = ids.filter((x) => !have.has(x));
    if (remove.length) {
      const { error } = await supabase.from("club_group_members").delete().eq("group_id", groupId).in("athlete_id", remove);
      if (error) return forbidden(error.message) ?? dbError(error);
    }
    if (add.length) {
      const { error } = await supabase.from("club_group_members").insert(add.map((athlete_id) => ({ group_id: groupId, athlete_id })));
      if (error) return forbidden(error.message) ?? dbError(error);
    }
    refresh();
    return { ok: true, message: `Zapisano skład grupy (${ids.length}).` };
  });
}

// ---------------------------------------------------------------- schedule and events
const slotSchema = z
  .object({ group_id: uuid, weekday: z.number().int().min(1).max(7), start_time: time, end_time: time, place: z.string().trim().max(160) })
  .refine((v) => v.end_time > v.start_time, { message: "Koniec musi być po początku", path: ["end_time"] });

export async function addSlot(input: z.input<typeof slotSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = slotSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const { error } = await supabase.from("club_schedule").insert({ ...p.data, place: toText(p.data.place) });
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Dodano stały termin treningu." };
  });
}

export async function deleteSlot(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("club_schedule").delete().eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Usunięto termin z harmonogramu." };
  });
}

const eventSchema = z.object({
  club_id: uuid,
  group_id: z.string(),
  kind: z.enum(["training", "competition", "meeting", "other"]),
  title: z.string().trim().min(1, "Podaj nazwę").max(160),
  date: isoDate,
  start: time,
  end: z.string(),
  place: z.string().trim().max(160),
  note: z.string().trim().max(1000),
});

/** One-off event (competition, meeting, extra session). Members get a notification. */
export async function addEvent(input: z.input<typeof eventSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = eventSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const v = p.data;
    const { error } = await supabase.from("club_events").insert({
      club_id: v.club_id,
      group_id: v.group_id || null,
      kind: v.kind,
      title: v.title,
      starts_at: warsawToISO(v.date, v.start),
      ends_at: /^\d{2}:\d{2}$/.test(v.end) ? warsawToISO(v.date, v.end) : null,
      place: toText(v.place),
      note: toText(v.note),
    });
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Dodano wydarzenie. Zawodnicy dostali powiadomienie." };
  });
}

/** Cancel (or bring back) one occurrence of a weekly slot, or a one-off event. */
export async function setOccurrenceCancelled(input: {
  club_id: string;
  group_id: string | null;
  slot_id: string | null;
  event_id: string | null;
  date: string;
  start: string;
  title: string;
  place: string | null;
  cancelled: boolean;
  note?: string;
}): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    if (input.event_id) {
      const { error } = await supabase.from("club_events").update({ cancelled: input.cancelled, note: toText(input.note ?? "") }).eq("id", input.event_id);
      if (error) return forbidden(error.message) ?? dbError(error);
    } else if (input.slot_id && input.cancelled) {
      const { error } = await supabase.from("club_events").insert({
        club_id: input.club_id,
        group_id: input.group_id,
        schedule_id: input.slot_id,
        occurs_on: input.date,
        kind: "training",
        title: input.title,
        starts_at: warsawToISO(input.date, input.start),
        place: input.place,
        cancelled: true,
        note: toText(input.note ?? ""),
      });
      if (error) return forbidden(error.message) ?? dbError(error);
    } else {
      return { ok: false, error: "Nie znaleziono terminu." };
    }
    refresh();
    return { ok: true, message: input.cancelled ? "Odwołano. Zawodnicy dostali powiadomienie." : "Przywrócono termin." };
  });
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("club_events").delete().eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Usunięto wydarzenie." };
  });
}

// ---------------------------------------------------------------- fees
const bankSchema = z.object({
  bank_account: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => v === "" || /^(PL)?[\d ]{26,40}$/i.test(v), "Numer konta: 26 cyfr (może być z PL)"),
  bank_recipient: z.string().trim().max(160),
});

export async function saveClubBank(clubId: string, input: z.input<typeof bankSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = bankSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const { data, error } = await supabase
      .from("sport_clubs")
      .update({ bank_account: toText(p.data.bank_account), bank_recipient: toText(p.data.bank_recipient) })
      .eq("id", clubId)
      .select("id");
    if (error) return dbError(error);
    if (!data?.length) return { ok: false, error: "Nie możesz zmieniać danych tego klubu." };
    refresh();
    return { ok: true, message: "Zapisano dane do przelewu." };
  });
}

const planSchema = z.object({
  id: z.string().optional(),
  club_id: uuid,
  group_id: z.string(),
  name: z.string().trim().min(1, "Podaj nazwę składki").max(120),
  amount: z.string().trim().regex(/^\d{1,5}([.,]\d{1,2})?$/, "Kwota, np. 120 albo 99,50"),
  due_day: z.number().int().min(1).max(28),
  active: z.boolean(),
});

export async function saveFeePlan(input: z.input<typeof planSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = planSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const row = {
      club_id: p.data.club_id,
      group_id: p.data.group_id || null,
      name: p.data.name,
      amount: Number(p.data.amount.replace(",", ".")),
      due_day: p.data.due_day,
      active: p.data.active,
    };
    const res = p.data.id ? await supabase.from("fee_plans").update(row).eq("id", p.data.id) : await supabase.from("fee_plans").insert(row);
    if (res.error) return forbidden(res.error.message) ?? dbError(res.error);
    refresh();
    return { ok: true, message: "Zapisano składkę." };
  });
}

export async function deleteFeePlan(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("fee_plans").delete().eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Usunięto składkę. Naliczone wcześniej opłaty zostały." };
  });
}

/** Percent discount for one athlete on one fee (null removes it). */
export async function setDiscount(input: { athlete_id: string; fee_plan_id: string; percent: number | null; note: string }): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    if (input.percent === null) {
      const { error } = await supabase.from("fee_discounts").delete().eq("athlete_id", input.athlete_id).eq("fee_plan_id", input.fee_plan_id);
      if (error) return forbidden(error.message) ?? dbError(error);
    } else {
      if (!(input.percent > 0 && input.percent <= 100)) return { ok: false, error: "Zniżka od 1 do 100%." };
      const { error } = await supabase
        .from("fee_discounts")
        .upsert({ athlete_id: input.athlete_id, fee_plan_id: input.fee_plan_id, percent: input.percent, note: toText(input.note) }, { onConflict: "athlete_id,fee_plan_id" });
      if (error) return forbidden(error.message) ?? dbError(error);
    }
    refresh();
    return { ok: true, message: "Zapisano zniżkę. Obejmie kolejne naliczenia." };
  });
}

export async function generateCharges(clubId: string, month: string): Promise<ActionResult<{ count: number }>> {
  return withUser("coach", async ({ supabase }) => {
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(month)) return { ok: false, error: "Wybierz miesiąc." };
    const { data, error } = await supabase.rpc("generate_fee_charges", { p_club: clubId, p_month: month.length === 7 ? `${month}-01` : month });
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    const n = Number(data ?? 0);
    return { ok: true, data: { count: n }, message: n ? `Naliczono ${n} ${n === 1 ? "opłatę" : n < 5 ? "opłaty" : "opłat"}. Zawodnicy z kontem dostali powiadomienie.` : "Wszystkie opłaty za ten miesiąc są już naliczone." };
  });
}

export async function setChargeStatus(id: string, status: "due" | "paid" | "cancelled", method: "transfer" | "cash" | "other" = "transfer"): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const row =
      status === "paid"
        ? { status, method, paid_at: new Date().toISOString() }
        : { status, method: null, paid_at: null };
    const { error } = await supabase.from("fee_charges").update(row).eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: status === "paid" ? "Oznaczono jako opłacone." : status === "cancelled" ? "Anulowano opłatę." : "Przywrócono jako do zapłaty." };
  });
}

/** In-app reminders for athletes with an account, plus e-mails to athletes and guardians when mail is set up. */
export async function remindCharges(clubId: string, ids: string[]): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (!ids.length) return { ok: false, error: "Nie ma zaległych opłat do przypomnienia." };
    const { data, error } = await supabase.rpc("remind_fee_charges", { p_ids: ids });
    if (error) return forbidden(error.message) ?? dbError(error);
    const rows = (data ?? []) as { athlete_id: string; title: string; amount: number; due_date: string; code: string }[];
    let mailed = 0;
    if (rows.length && mailConfigured()) {
      const athleteIds = [...new Set(rows.map((r) => r.athlete_id))];
      const [{ data: club }, { data: people }, { data: guardians }] = await Promise.all([
        supabase.from("sport_clubs").select("name, bank_account, bank_recipient").eq("id", clubId).maybeSingle(),
        supabase.from("profiles").select("id, full_name, email, managed").in("id", athleteIds),
        supabase.from("athlete_guardians").select("athlete_id, full_name, email, access_token").in("athlete_id", athleteIds),
      ]);
      const c = club as { name: string; bank_account: string | null; bank_recipient: string | null } | null;
      const items = rows.flatMap((r) => {
        const a = ((people ?? []) as { id: string; full_name: string; email: string | null; managed: boolean }[]).find((p) => p.id === r.athlete_id);
        const gs = ((guardians ?? []) as { athlete_id: string; full_name: string; email: string | null; access_token: string }[]).filter((g) => g.athlete_id === r.athlete_id && g.email);
        const recipients = [...gs.map((g) => ({ to: g.email!, token: g.access_token })), ...(a?.email && !a.managed ? [{ to: a.email, token: "" }] : [])];
        return recipients.map(({ to, token }) => ({
          to,
          m: {
            subject: `Przypomnienie o składce: ${r.title}`,
            preview: `${zl(Number(r.amount))}, termin ${r.due_date.split("-").reverse().join(".")}`,
            title: `Składka ${a?.full_name ? `za ${a.full_name}` : ""}`.trim(),
            paragraphs: [
              `Przypominamy o opłacie: ${r.title}, ${zl(Number(r.amount))}, termin ${r.due_date.split("-").reverse().join(".")}.`,
              c?.bank_account ? `Przelew na konto ${c.bank_recipient || c.name}: ${c.bank_account}.` : "Szczegóły płatności poda trener.",
              "Jeśli opłata jest już zrobiona, zignoruj tę wiadomość.",
            ],
            highlight: { label: "Tytuł przelewu", value: r.code },
            ...(token ? { cta: { label: "Plan i składki dziecka", url: `${publicOrigin()}/rodzic/${token}` } } : {}),
            signature: `${user.profile.full_name}, ${c?.name ?? "klub"}`,
          },
        }));
      });
      mailed = await sendMailBatch(items);
    }
    refresh();
    return { ok: true, message: `Wysłano przypomnienia: ${rows.length}${mailed ? `, w tym ${mailed} e-mail` : ""}.` };
  });
}

/** Paste a bank statement: every unpaid charge whose code appears in it is marked as paid. */
export async function importStatement(clubId: string, text: string): Promise<ActionResult<{ matched: number }>> {
  return withUser("coach", async ({ supabase }) => {
    const codes = [...new Set((text.toUpperCase().match(/VY[0-9A-F]{7}/g) ?? []))];
    if (!codes.length) return { ok: false, error: "Nie znaleziono w wyciągu żadnego tytułu przelewu w formacie VY…" };
    const { data, error } = await supabase
      .from("fee_charges")
      .update({ status: "paid", method: "transfer", paid_at: new Date().toISOString() })
      .eq("club_id", clubId)
      .eq("status", "due")
      .in("code", codes)
      .select("id");
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    const n = data?.length ?? 0;
    return { ok: true, data: { matched: n }, message: n ? `Oznaczono jako opłacone: ${n}.` : "Wszystkie znalezione przelewy były już rozliczone." };
  });
}

// ---------------------------------------------------------------- guardians and documents
const guardianSchema = z.object({
  athlete_id: uuid,
  full_name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  email: z.string().trim().max(200).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Niepoprawny e-mail"),
  phone: z.string().trim().max(40),
  relation: z.string().trim().max(40),
});

export async function saveGuardian(input: z.input<typeof guardianSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = guardianSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const { error } = await supabase.from("athlete_guardians").insert({
      athlete_id: p.data.athlete_id,
      full_name: p.data.full_name,
      email: toText(p.data.email),
      phone: toText(p.data.phone),
      relation: toText(p.data.relation),
    });
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Dodano opiekuna. Skopiuj mu link do strony rodzica." };
  });
}

export async function deleteGuardian(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("athlete_guardians").delete().eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Usunięto opiekuna. Jego link przestał działać." };
  });
}

const docSchema = z.object({
  athlete_id: uuid,
  kind: z.enum(["medical", "rodo", "photo_consent", "other"]),
  title: z.string().trim().max(160),
  signed_on: z.string(),
  valid_until: z.string(),
  note: z.string().trim().max(500),
});

export async function saveDocument(input: z.input<typeof docSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = docSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const d = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const { error } = await supabase.from("athlete_documents").insert({
      athlete_id: p.data.athlete_id,
      kind: p.data.kind,
      title: toText(p.data.title),
      signed_on: d(p.data.signed_on),
      valid_until: d(p.data.valid_until),
      note: toText(p.data.note),
    });
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Zapisano dokument." };
  });
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("athlete_documents").delete().eq("id", id);
    if (error) return forbidden(error.message) ?? dbError(error);
    refresh();
    return { ok: true, message: "Usunięto dokument." };
  });
}

// ---------------------------------------------------------------- announcements
const annSchema = z.object({
  club_id: uuid,
  group_id: z.string(),
  title: z.string().trim().min(1, "Podaj tytuł").max(160),
  body: z.string().trim().min(1, "Napisz treść").max(4000),
  email: z.boolean(),
});

/** Notice to a group or the whole club: in-app and push for athletes, optionally e-mail to athletes and guardians. */
export async function postAnnouncement(input: z.input<typeof annSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    const p = annSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const v = p.data;
    const { data: ann, error } = await supabase
      .from("club_announcements")
      .insert({ club_id: v.club_id, group_id: v.group_id || null, title: v.title, body: v.body })
      .select("id")
      .single();
    if (error) return forbidden(error.message) ?? dbError(error);
    let mailed = 0;
    if (v.email && mailConfigured()) {
      const { data: club } = await supabase.from("sport_clubs").select("name").eq("id", v.club_id).maybeSingle();
      let athletes = ((await supabase.from("profiles").select("id, email, managed").eq("club_id", v.club_id).eq("role", "athlete")).data ?? []) as { id: string; email: string | null; managed: boolean }[];
      if (v.group_id) {
        const members = new Set((((await supabase.from("club_group_members").select("athlete_id").eq("group_id", v.group_id)).data ?? []) as { athlete_id: string }[]).map((m) => m.athlete_id));
        athletes = athletes.filter((a) => members.has(a.id));
      }
      const ids = athletes.map((a) => a.id);
      const guardians = ids.length ? (((await supabase.from("athlete_guardians").select("email, access_token, athlete_id").in("athlete_id", ids)).data ?? []) as { email: string | null; access_token: string }[]) : [];
      const clubName = (club as { name: string } | null)?.name ?? "Klub";
      const paragraphs = v.body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
      const items = [
        ...athletes.filter((a) => a.email && !a.managed).map((a) => ({ to: a.email!, token: "" })),
        ...guardians.filter((g) => g.email).map((g) => ({ to: g.email!, token: g.access_token })),
      ].map(({ to, token }) => ({
        to,
        m: {
          subject: `${clubName}: ${v.title}`,
          preview: v.body.slice(0, 120),
          title: v.title,
          paragraphs,
          ...(token ? { cta: { label: "Plan i składki dziecka", url: `${publicOrigin()}/rodzic/${token}` } } : {}),
          signature: `${user.profile.full_name}, ${clubName}`,
        },
      }));
      mailed = await sendMailBatch(items);
      if (mailed) await supabase.from("club_announcements").update({ emailed_at: new Date().toISOString() }).eq("id", (ann as { id: string }).id);
    }
    refresh();
    return { ok: true, message: `Wysłano komunikat${mailed ? ` (e-maile: ${mailed})` : ""}.` };
  });
}
