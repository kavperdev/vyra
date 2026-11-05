import { listRunClubEvents } from "@/lib/data/club";
import { OG_SIZE, ogImage } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "VYRA Run Club";
export const size = OG_SIZE;
export const contentType = "image/png";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", ...o }).format(new Date(iso));

/** Link preview with the next date, so a shared link already says when and where. */
export default async function Image() {
  const supabase = await createClient();
  const events = await listRunClubEvents(supabase, { upcoming: true }).catch(() => []);
  const next = events.find((e) => e.visible && new Date(e.starts_at) > new Date());
  if (!next) return ogImage({ eyebrow: "VYRA Run Club · za darmo", title: "Biegamy razem. Każdy poziom.", footer: "Zapisy: vyraathl.pl/run-club" });
  const day = fmt(next.starts_at, { weekday: "long" });
  const title = `${day.charAt(0).toUpperCase()}${day.slice(1)} ${fmt(next.starts_at, { day: "2-digit", month: "2-digit" })} · ${fmt(next.starts_at, { hour: "2-digit", minute: "2-digit" })}`;
  const footer = [next.place, next.meeting_note ? `zbiórka: ${next.meeting_note}` : null].filter(Boolean).join(" · ");
  return ogImage({ eyebrow: "VYRA Run Club · za darmo, każdy poziom", title, footer });
}
