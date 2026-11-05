import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");

/** One Run Club session as a calendar file with a reminder 2 hours before. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.from("run_club_events").select("id, title, starts_at, place, map_url, pace, meeting_note").eq("id", id).eq("visible", true).maybeSingle();
  const e = data as { id: string; title: string; starts_at: string; place: string; map_url: string | null; pace: string | null; meeting_note?: string | null } | null;
  if (!e) return new NextResponse("Not found", { status: 404 });
  const start = new Date(e.starts_at);
  const end = new Date(start.getTime() + 75 * 60000);
  const url = `${publicOrigin()}/run-club`;
  const body = [e.meeting_note ? `Zbiórka: ${e.meeting_note}` : "", e.pace ? `Tempo: ${e.pace}` : "", "Weź wodę i ubierz się warstwowo.", url].filter(Boolean).join("\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VYRA//Run Club//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:runclub-${e.id}@vyraathl.pl`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.place)}`,
    `DESCRIPTION:${esc(body)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)}`,
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="vyra-run-club.ics"`, "Cache-Control": "no-store" },
  });
}
