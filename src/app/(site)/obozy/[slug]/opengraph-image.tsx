import { campDates, formatPLN } from "@/lib/camps";
import { getCamp } from "@/lib/data/camps";
import { OG_SIZE, ogImage } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Obóz VYRA";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const camp = await getCamp(supabase, { slug }).catch(() => null);
  const footer = camp ? [campDates(camp), camp.location, formatPLN(camp.price_pln)].filter(Boolean).join(" · ") : undefined;
  return ogImage({ eyebrow: "Obozy VYRA", title: camp?.title ?? "Obozy VYRA", footer });
}
