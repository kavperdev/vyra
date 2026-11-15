import { NextResponse, type NextRequest } from "next/server";
import { configured, stateCookie } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  if (!configured()) return NextResponse.redirect(`${origin}/app/dziennik?strava=off`);
  const state = crypto.randomUUID();
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${origin}/api/strava/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "activity:read_all");
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url.toString());
  res.cookies.set(stateCookie, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
