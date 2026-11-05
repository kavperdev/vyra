import { NextResponse } from "next/server";

/**
 * Short links for the Run Club, one per channel: /rc/ig, /rc/fb, /rc/media, /rc/plakat…
 * Any short word works. It goes to /run-club and the sign-up form records the channel.
 */
export function GET(req: Request, { params }: { params: Promise<{ kanal: string }> }) {
  return params.then(({ kanal }) => {
    const k = kanal.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
    const url = new URL("/run-club", req.url);
    if (k) url.searchParams.set("kanal", k);
    return NextResponse.redirect(url, 307);
  });
}
