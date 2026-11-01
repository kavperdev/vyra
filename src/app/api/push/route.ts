import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { translateNotification } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/server";

/**
 * Called by the database (pg_net) right after a notification row is created: { id }.
 * take_push_job() hands out that notification once, with the user's subscriptions,
 * and this route delivers it with Web Push. No key is needed to call it: only the
 * database knows fresh notification ids, and each can be claimed one time.
 */
export async function POST(request: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return NextResponse.json({ sent: 0, reason: "push not configured" });

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:kontakt@vyra.app", publicKey, privateKey);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("take_push_job", { p_id: id });
  if (error) return NextResponse.json({ error: "job" }, { status: 500 });

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
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await supabase.rpc("drop_push_subscription", { p_endpoint: j.endpoint });
      }
    }),
  );
  return NextResponse.json({ sent });
}
