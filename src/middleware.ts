import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // The Android app file can't run on an iPhone: send iPhones to the install steps for Safari.
  if (request.nextUrl.pathname === "/download/vyra.apk" && !/android/i.test(request.headers.get("user-agent") ?? "")) {
    const url = request.nextUrl.clone();
    url.pathname = "/pobierz";
    url.search = "?apk=0";
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|branding/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|mp4|webm|html)$|sw\\.js$).*)"],
};
