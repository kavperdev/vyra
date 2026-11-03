import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listRecords } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { formatDate } from "@/lib/format";
import { getLang } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { achievements, athleteStats } from "@/lib/training/badges";

export const runtime = "nodejs";

/** Instagram story card (1080 × 1920) for an earned badge. Only for the signed-in athlete. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ badgeId: string }> }) {
  const { badgeId } = await params;
  const lang = await getLang();
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "athlete") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const [sessions, records] = await Promise.all([
    listSessions(supabase, { athleteIds: [user.id], from: "2020-01-01", to: today }),
    listRecords(supabase, user.id),
  ]);
  const badge = achievements(athleteStats(sessions, records, today)).find((b) => b.id === badgeId);
  if (!badge || !badge.earned) return NextResponse.json({ error: "not found" }, { status: 404 });

  const root = process.cwd();
  const [font, photo] = await Promise.all([
    readFile(path.join(root, "src/assets/fonts/DejaVuSans-Bold.ttf")),
    readFile(path.join(root, "public/site/night-city.jpg")),
  ]);
  const en = lang === "en";
  const bigSize = badge.big.length > 6 ? 180 : badge.big.length > 3 ? 230 : 320;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#000", fontFamily: "VYRA" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={`data:image/jpeg;base64,${photo.toString("base64")}`} width={1080} height={1920} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0.92) 100%)" }} />
        <div style={{ position: "absolute", top: -260, right: -260, width: 760, height: 760, borderRadius: 760, display: "flex", background: "radial-gradient(circle, rgba(240,51,57,0.45) 0%, rgba(240,51,57,0) 70%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "120px 90px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ color: "#fff", fontSize: 44, letterSpacing: 22 }}>VYRA</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 24, letterSpacing: 8 }}>ELITE IS STANDARD</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <span style={{ color: "#F03339", fontSize: 40, letterSpacing: 10 }}>{en ? "BADGE UNLOCKED" : "NOWA ODZNAKA"}</span>
            <span style={{ color: "#fff", fontSize: bigSize, lineHeight: 1 }}>{badge.big}</span>
            <span style={{ color: "#fff", fontSize: 58, textTransform: "uppercase", letterSpacing: 3 }}>{badge.line}</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 34 }}>{[user.profile.full_name, formatDate(today, "d MMMM yyyy", lang)].join(" · ")}</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 28, letterSpacing: 6 }}>@VYRA.ATHL · VYRAATHL.PL</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: [{ name: "VYRA", data: font, weight: 700, style: "normal" }] },
  );
}
