import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { exchange, saveLink, stateCookie } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(`${u.origin}/app/dziennik?strava=${q}`);
  const jar = await cookies();
  const state = jar.get(stateCookie)?.value;
  jar.delete(stateCookie);
  const code = u.searchParams.get("code");
  if (u.searchParams.get("error") || !code) return back("denied");
  if (!state || state !== u.searchParams.get("state")) return back("error");
  if (!(u.searchParams.get("scope") ?? "").includes("activity:read")) return back("scope");
  const t = await exchange({ grant_type: "authorization_code", code });
  if (!t) return back("error");
  await saveLink({ a: t.access_token, r: t.refresh_token, e: t.expires_at, n: t.athlete?.firstname ?? "" });
  return back("ok");
}
