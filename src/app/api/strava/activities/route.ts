import { NextResponse, type NextRequest } from "next/server";
import { accessToken, configured, readLink } from "@/lib/strava";

export const dynamic = "force-dynamic";

type Act = { id: number; name: string; sport_type?: string; type?: string; distance: number; moving_time: number; start_date_local: string; average_heartrate?: number; perceived_exertion?: number | null };
const RUN = new Set(["Run", "TrailRun", "VirtualRun"]);

/** Recent runs from Strava. ?after=unix seconds; without it, the last 60 days. */
export async function GET(req: NextRequest) {
  if (!configured()) return NextResponse.json({ connected: false, available: false });
  const link = await readLink();
  if (!link) return NextResponse.json({ connected: false, available: true });
  if (new URL(req.url).searchParams.get("status")) return NextResponse.json({ connected: true, available: true, name: link.n });

  const token = await accessToken();
  if (!token) return NextResponse.json({ connected: false, available: true, error: "token" });
  const after = Number(new URL(req.url).searchParams.get("after")) || Math.floor(Date.now() / 1000) - 60 * 86400;
  const runs: { id: string; day: string; km: number; sec: number; name: string; hr: number | null; rpe: number | null }[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 429) return NextResponse.json({ connected: true, name: link.n, runs, error: "limit" });
    if (!res.ok) return NextResponse.json({ connected: true, name: link.n, runs, error: "strava" });
    const acts = (await res.json()) as Act[];
    for (const a of acts) {
      if (!RUN.has(a.sport_type ?? a.type ?? "") || a.distance < 300 || !a.moving_time) continue;
      runs.push({
        id: `strava-${a.id}`,
        day: a.start_date_local.slice(0, 10),
        km: Math.round(a.distance / 10) / 100,
        sec: a.moving_time,
        name: (a.name ?? "").slice(0, 80),
        hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        rpe: a.perceived_exertion ?? null,
      });
    }
    if (acts.length < 100) break;
  }
  return NextResponse.json({ connected: true, name: link.n, runs });
}
