import { NextResponse, type NextRequest } from "next/server";
import { sunTimes } from "@/lib/app/sun";

/**
 * Running conditions for a place: hourly weather (MET Norway, CC BY 4.0), air quality from the nearest
 * GIOŚ station and daylight. Coordinates are rounded to ~1 km and never stored.
 */

const UA = "VYRA/1.0 (https://vyraathl.pl; kontakt@vyraathl.pl)";
const GIOS = "https://api.gios.gov.pl/pjp-api/v1/rest";

interface MetSeries {
  time: string;
  data: {
    instant: { details: { air_temperature?: number; wind_speed?: number; relative_humidity?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
  };
}

interface Station {
  id: number;
  name: string;
  city: string | null;
  lat: number;
  lon: number;
}

async function stations(): Promise<Station[]> {
  const out: Station[] = [];
  for (let page = 0; page < 6; page++) {
    const r = await fetch(`${GIOS}/station/findAll?page=${page}&size=500`, { next: { revalidate: 86400 } });
    if (!r.ok) break;
    const j = (await r.json()) as Record<string, unknown>;
    const list = (j["Lista stacji pomiarowych"] ?? []) as Record<string, unknown>[];
    for (const s of list) {
      const lat = Number(s["WGS84 φ N"]);
      const lon = Number(s["WGS84 λ E"]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) out.push({ id: Number(s["Identyfikator stacji"]), name: String(s["Nazwa stacji"] ?? ""), city: (s["Nazwa miasta"] as string) ?? null, lat, lon });
    }
    const total = Number(j.totalPages ?? 1);
    if (page + 1 >= total) break;
  }
  return out;
}

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

const AQ: Record<string, number> = { "Bardzo dobry": 0, Dobry: 1, Umiarkowany: 2, Dostateczny: 3, Zły: 4, "Bardzo zły": 5 };

async function air(lat: number, lon: number) {
  try {
    const all = await stations();
    const near = all
      .map((s) => ({ s, d: km({ lat, lon }, s) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { s, d } of near) {
      if (d > 40) break;
      const r = await fetch(`${GIOS}/aqindex/getIndex/${s.id}`, { next: { revalidate: 1800 } });
      if (!r.ok) continue;
      const j = (await r.json()) as { AqIndex?: Record<string, unknown> };
      const name = j.AqIndex?.["Nazwa kategorii indeksu"];
      if (typeof name === "string" && name in AQ) return { level: AQ[name], label: name, station: s.city || s.name, km: Math.round(d) };
    }
  } catch (e) {
    console.error("[conditions] air", e);
  }
  return null;
}

async function weather(lat: number, lon: number) {
  const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
    headers: { "User-Agent": UA },
    next: { revalidate: 1800 },
  });
  if (!r.ok) throw new Error(`met ${r.status}`);
  const j = (await r.json()) as { properties: { timeseries: MetSeries[] } };
  const now = Date.now() - 3600e3;
  return j.properties.timeseries
    .filter((t) => Date.parse(t.time) >= now)
    .slice(0, 18)
    .map((t) => ({
      time: t.time,
      temp: t.data.instant.details.air_temperature ?? null,
      wind: t.data.instant.details.wind_speed ?? null,
      humidity: t.data.instant.details.relative_humidity ?? null,
      rain: t.data.next_1_hours?.details?.precipitation_amount ?? null,
      symbol: t.data.next_1_hours?.summary?.symbol_code ?? null,
    }));
}

export async function GET(req: NextRequest) {
  const lat = Math.round(Number(req.nextUrl.searchParams.get("lat")) * 100) / 100;
  const lon = Math.round(Number(req.nextUrl.searchParams.get("lon")) * 100) / 100;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 45 || lat > 60 || lon < 10 || lon > 30) {
    return NextResponse.json({ error: "Lokalizacja poza zasięgiem." }, { status: 400 });
  }
  try {
    const [hours, aq] = await Promise.all([weather(lat, lon), air(lat, lon)]);
    const today = sunTimes(new Date(), lat, lon);
    const tomorrow = sunTimes(new Date(Date.now() + 864e5), lat, lon);
    return NextResponse.json(
      { hours, air: aq, sun: { today, tomorrow }, sources: { weather: "MET Norway", air: aq ? "GIOŚ" : null } },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch (e) {
    console.error("[conditions]", e);
    return NextResponse.json({ error: "Nie udało się pobrać pogody. Spróbuj za chwilę." }, { status: 502 });
  }
}
