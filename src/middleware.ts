import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Inside the iPhone app only the app lives: the website (with prices and buying) is never opened there.
const STORE_OPEN = ["/app", "/athlete", "/coach", "/api", "/auth", "/panel", "/rc", "/rodzic", "/settings", "/notifications", "/polityka-prywatnosci", "/regulamin", "/usun-konto", "/kontakt", "/.well-known", "/download", "/manifest.webmanifest"];
const STORE_SHUT = ["/app/voucher", "/app/obozy"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Layouts read the path (e.g. to send a club member out of the runner app without breaking password reset).
  try {
    request.headers.set("x-vyra-path", path);
  } catch {
    /* read-only headers on this runtime: layouts then treat the path as unknown */
  }
  // The Android app file can't run on an iPhone: send iPhones to the install steps for Safari.
  if (path === "/download/vyra.apk" && !/android/i.test(request.headers.get("user-agent") ?? "")) {
    const url = request.nextUrl.clone();
    url.pathname = "/pobierz";
    url.search = "?apk=0";
    return NextResponse.redirect(url);
  }
  // Signing in happens inside the app, in its own look.
  const moved = { "/login": "/app/zaloguj", "/forgot-password": "/app/haslo" }[path];
  if (moved) {
    const url = request.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url);
  }

  // Google Play build: started with ?src=android (TWA start URL) or opened from the app (android-app:// referrer).
  const fromAndroid = request.nextUrl.searchParams.get("src") === "android" || (request.headers.get("referer") ?? "").startsWith("android-app://pl.vyraathl");
  // iOS shell (own cookie jar): only the app is reachable. Android shares Chrome's cookies with the website,
  // so there the app screens hide buying and the website itself stays untouched.
  const ios = /ios/i.test(request.cookies.get("app-platform")?.value ?? "");
  if (ios) {
    const open = STORE_OPEN.some((p) => path === p || path.startsWith(`${p}/`)) && !STORE_SHUT.some((p) => path === p || path.startsWith(`${p}/`));
    if (!open) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  const res = await updateSession(request);
  if (fromAndroid) res.cookies.set("app-platform", "android", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|branding/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|mp4|webm|html)$|sw\\.js$).*)"],
};
