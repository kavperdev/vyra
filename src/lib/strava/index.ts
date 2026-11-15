import "server-only";
import { cookies } from "next/headers";

/** Strava link kept in an httpOnly cookie: works without a VYRA account, tokens never reach the browser's JS. */

export const COOKIE = "vyra_strava";
const STATE = "vyra_strava_state";
type Link = { a: string; r: string; e: number; n: string };

export const configured = () => !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
export const stateCookie = STATE;

const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };

export async function readLink(): Promise<Link | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  try {
    const j = JSON.parse(Buffer.from(v, "base64url").toString("utf8"));
    return j?.r ? (j as Link) : null;
  } catch {
    return null;
  }
}

export async function saveLink(l: Link) {
  (await cookies()).set(COOKIE, Buffer.from(JSON.stringify(l)).toString("base64url"), opts);
}

export async function clearLink() {
  (await cookies()).delete(COOKIE);
}

type TokenRes = { access_token: string; refresh_token: string; expires_at: number; athlete?: { firstname?: string; lastname?: string } };

export async function exchange(body: Record<string, string>): Promise<TokenRes | null> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET!, ...body }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenRes;
}

/** Valid access token, refreshed when it expires in under 5 minutes. */
export async function accessToken(): Promise<string | null> {
  const l = await readLink();
  if (!l) return null;
  if (l.e - 300 > Date.now() / 1000) return l.a;
  const t = await exchange({ grant_type: "refresh_token", refresh_token: l.r });
  if (!t) return null;
  await saveLink({ a: t.access_token, r: t.refresh_token, e: t.expires_at, n: l.n });
  return t.access_token;
}
