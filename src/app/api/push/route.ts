import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { translateNotification } from "@/lib/i18n/messages";
import { vapidKeys, vapidSubject } from "@/lib/push-config";
import { createClient } from "@/lib/supabase/server";

/**
 * Called by the database (pg_net) right after a notification row is created: { id }.
 * take_push_job() hands out that notification once, with the user's subscriptions,
 * and this route delivers it with Web Push. No key is needed to call it: only the
 * database knows fresh notification ids, and each can be claimed one time.
 */
export async function POST(request: NextRequest) {
  const keys = vapidKeys();
  if (!keys) return NextResponse.json({ sent: 0, reason: "push not configured" });

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    webpush.setVapidDetails(vapidSubject(), keys.publicKey, keys.privateKey);
  } catch (e) {
    console.error("[push] vapid", e);
    return NextResponse.json({ error: "vapid" }, { status: 500 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("take_push_job", { p_id: id });
  if (error) {
    console.error("[push] take_push_job", error.message);
    return NextResponse.json({ error: "job" }, { status: 500 });
  }

  type Job = { title: string; body: string | null; link: string | null; endpoint: string; p256dh: string; auth: string; lang?: string | null };
  const jobs = (data ?? []) as Job[];
  let sent = 0;
  await Promise.all(
    jobs.map(async (j) => {
      try {
        await webpush.sendNotification(
          { endpoint: j.endpoint, keys: { p256dh: j.p256dh, auth: j.auth } },
          JSON.stringify({
            title: translateNotification(j.title, j.lang === "en" ? "en" : "pl"),
            body: translateNotification(j.body ?? "", j.lang === "en" ? "en" : "pl"),
            link: j.link ?? "/panel",
            tag: id,
          }),
          // High urgency: delivered right away even when the phone is locked or the app is closed.
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        console.error("[push] send", status, (e as { body?: string }).body ?? e);
        if (status === 404 || status === 410) await supabase.rpc("drop_push_subscription", { p_endpoint: j.endpoint });
      }
    }),
  );
  return NextResponse.json({ sent });
}
