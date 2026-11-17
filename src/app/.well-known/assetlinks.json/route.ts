/**
 * Digital Asset Links: lets the Android app open vyraathl.pl full screen (no browser bar).
 * The first key signs the APK from the website. Google Play re-signs the store build with its own key:
 * put that SHA-256 (Play Console → Test and release → App integrity) in Vercel as ANDROID_PLAY_SHA256.
 */
const SITE_KEY = "93:FC:67:4B:C6:DD:D0:9B:9B:4F:3D:37:6B:49:C7:DD:56:77:10:9A:A9:0D:C8:B0:48:10:03:05:50:CF:D8:9B";

export const dynamic = "force-dynamic";

export function GET() {
  const extra = (process.env.ANDROID_PLAY_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: "pl.vyraathl.twa", sha256_cert_fingerprints: [SITE_KEY, ...extra.filter((k) => k !== SITE_KEY)] },
    },
  ];
  return Response.json(body, { headers: { "cache-control": "public, max-age=300" } });
}
