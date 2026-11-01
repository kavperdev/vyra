import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { formatDate } from "@/lib/format";
import { getLang } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { formatRecordValue } from "@/lib/training/records";
import type { PersonalRecord } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Instagram story card (1080 × 1920) for a personal record, in the VYRA style.
 * Only the athlete and their coaches can open it: the record is read with the viewer's rights (RLS).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const { recordId } = await params;
  const lang = await getLang();
  const supabase = await createClient();
  const { data } = await supabase.from("personal_records").select("*").eq("id", recordId).maybeSingle();
  const rec = data as PersonalRecord | null;
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: who } = await supabase.from("profiles").select("full_name").eq("id", rec.athlete_id).maybeSingle();
  const athleteName = (who as { full_name: string } | null)?.full_name ?? null;

  const root = process.cwd();
  const [font, photo] = await Promise.all([
    readFile(path.join(root, "src/assets/fonts/DejaVuSans-Bold.ttf")),
    readFile(path.join(root, "public/site/night-city.jpg")),
  ]);
  const value = formatRecordValue(rec);
  const en = lang === "en";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#000", fontFamily: "VYRA" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={`data:image/jpeg;base64,${photo.toString("base64")}`} width={1080} height={1920} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.9) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "120px 90px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ color: "#fff", fontSize: 44, letterSpacing: 22 }}>VYRA</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 24, letterSpacing: 8 }}>ELITE IS STANDARD</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <span style={{ color: "#F03339", fontSize: 40, letterSpacing: 10 }}>{en ? "NEW PB" : "NOWY REKORD"}</span>
            <span style={{ color: "#fff", fontSize: 64, letterSpacing: 4, textTransform: "uppercase" }}>{rec.label}</span>
            <span style={{ color: "#fff", fontSize: 210, lineHeight: 1 }}>{value}</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 34 }}>
              {[athleteName, formatDate(rec.achieved_on, "d MMMM yyyy", lang)].filter(Boolean).join(" · ")}
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 28, letterSpacing: 6 }}>@VYRA.ATHL</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: [{ name: "VYRA", data: font, weight: 700, style: "normal" }] },
  );
}
