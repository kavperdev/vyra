/**
 * Digital Asset Links: lets the Android app open vyraathl.pl full screen (no browser bar).
 * The first key signs the APK from the website. Google Play re-signs the store build with its own key:
 * put that SHA-256 (Play Console → Test and release → App integrity) in Vercel as ANDROID_PLAY_SHA256.
 */
const SITE_KEY = "1B:9A:5D:5E:0B:47:37:FB:84:50:EF:3D:C0:22:BB:A0:B9:8C:F5:35:AF:1C:F5:37:5D:AE:E8:C7:15:8C:1A:DF";

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
