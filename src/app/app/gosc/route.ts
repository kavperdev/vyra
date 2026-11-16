import { NextResponse } from "next/server";

/** Temporary guest entry while free accounts are not switched on yet. */
export function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/app", request.url));
  res.cookies.set("vyra_guest", "1", { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax", secure: true });
  return res;
}
