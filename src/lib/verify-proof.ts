import "server-only";

export interface ProofReading {
  isRun: boolean;
  km: number | null;
  seconds: number | null;
  date: string | null;
}

/** Automatic check is on only when the key is set in Vercel. */
export function proofCheckConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Reads distance, time and date from a screenshot of a watch or running app.
 * Returns null when the check is not configured or the reading failed (the run then waits for a founder).
 */
export async function readProof(jpegBase64: string, mediaType = "image/jpeg"): Promise<ProofReading | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.PROOF_CHECK_MODEL || "claude-haiku-5-5",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: jpegBase64 } },
              {
                type: "text",
                text:
                  "This should be a screenshot of one running activity from a sports watch or app (Garmin, Strava, Apple, Polar, Coros, Suunto…). " +
                  "Reply with JSON only, no other text: " +
                  '{"is_run": true|false, "distance_km": number|null, "duration_seconds": number|null, "date": "YYYY-MM-DD"|null}. ' +
                  "distance_km: total distance in kilometres (convert miles). duration_seconds: total moving or elapsed time of the activity. " +
                  "date: the activity date if visible, else null. Use null for anything you cannot read with confidence.",
              },
            ],
          },
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[proof]", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === "text")?.text ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]) as { is_run?: boolean; distance_km?: number | null; duration_seconds?: number | null; date?: string | null };
    return {
      isRun: o.is_run !== false,
      km: typeof o.distance_km === "number" && o.distance_km > 0 ? o.distance_km : null,
      seconds: typeof o.duration_seconds === "number" && o.duration_seconds > 0 ? Math.round(o.duration_seconds) : null,
      date: typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null,
    };
  } catch (e) {
    console.error("[proof]", e);
    return null;
  }
}

/** Compares what was typed with what the screenshot shows. */
export function compareProof(r: ProofReading, typed: { km: number; seconds: number | null; day: string }): { ok: boolean; note: string } {
  const issues: string[] = [];
  if (!r.isRun) issues.push("zrzut nie wygląda na bieg");
  if (r.km == null) issues.push("nie widać dystansu");
  else if (Math.abs(r.km - typed.km) > Math.max(0.15, typed.km * 0.03)) issues.push(`na zrzucie ${r.km} km`);
  if (typed.seconds != null && r.seconds != null && Math.abs(r.seconds - typed.seconds) > Math.max(30, typed.seconds * 0.03)) issues.push("inny czas na zrzucie");
  if (r.date && r.date !== typed.day) issues.push(`data na zrzucie ${r.date}`);
  return issues.length ? { ok: false, note: `Automatycznie: ${issues.join(", ")}` } : { ok: true, note: "Zgodne ze zrzutem" };
}
