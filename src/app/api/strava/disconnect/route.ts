import { NextResponse } from "next/server";
import { accessToken, clearLink } from "@/lib/strava";

export async function POST() {
  const token = await accessToken().catch(() => null);
  if (token) await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  await clearLink();
  return NextResponse.json({ ok: true });
}
