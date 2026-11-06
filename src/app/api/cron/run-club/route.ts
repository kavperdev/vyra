import { NextResponse } from "next/server";
import { MAILS, mailConfigured, sendMailOnce, whenPl } from "@/lib/mail";
import { refreshInstagramToken } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Daily job (vercel.json → crons): reminds everyone signed up for tomorrow's Run Club.
 * With CRON_SECRET set, only Vercel's scheduler (which sends it) may call this.
 * Repeated calls are harmless: each reminder goes out once.
 */
export async function GET(request: Request) {
  const cron = process.env.CRON_SECRET;
  if (cron ? request.headers.get("authorization") !== `Bearer ${cron}` : !request.headers.get("user-agent")?.includes("vercel-cron")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Keep the Instagram feed token alive (renews once a week; harmless when not configured).
  const instagram = await refreshInstagramToken().catch(() => "error");
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!secret || !mailConfigured()) return NextResponse.json({ sent: 0, reason: "mail not configured", instagram });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_club_reminders", { p_secret: secret });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as { event_id: string; email: string; full_name: string; title: string; starts_at: string; place: string; map_url: string | null; pace: string | null }[];
  let sent = 0;
  for (const r of rows) {
    const ok = await sendMailOnce(
      `rc:${r.event_id}:${r.email}`,
      r.email,
      MAILS.runClubReminder({ name: r.full_name, title: r.title, when: whenPl(r.starts_at), place: r.place, map: r.map_url, pace: r.pace }),
    );
    if (ok) sent++;
  }
  return NextResponse.json({ sent, total: rows.length });
}
