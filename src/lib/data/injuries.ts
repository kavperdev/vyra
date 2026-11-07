import type { ServerSupabase } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/runtime";

export type InjuryArea =
  | "stopa" | "pieta_achilles" | "lydka" | "piszczel" | "kolano" | "udo_przod" | "udo_tyl"
  | "biodro_pachwina" | "posladek" | "pasmo_bt" | "plecy_ledzwia" | "kostka" | "inne";
export type InjuryStatus = "active" | "healing" | "healed" | "recurring";

export interface Injury {
  id: string;
  athlete_id: string;
  area: InjuryArea;
  side: "lewa" | "prawa" | "obie" | null;
  name: string;
  status: InjuryStatus;
  severity: 1 | 2 | 3;
  started_on: string | null;
  ended_on: string | null;
  triggers: string | null;
  restrictions: string | null;
  helps: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const INJURY_AREAS: InjuryArea[] = ["stopa", "pieta_achilles", "lydka", "piszczel", "kolano", "udo_przod", "udo_tyl", "biodro_pachwina", "posladek", "pasmo_bt", "plecy_ledzwia", "kostka", "inne"];

export const AREA_LABEL: Record<InjuryArea, string> = localized<InjuryArea>(
  { stopa: "Stopa / rozcięgno", pieta_achilles: "Pięta / Achilles", lydka: "Łydka", piszczel: "Piszczel", kolano: "Kolano", udo_przod: "Udo przód", udo_tyl: "Udo tył (dwugłowy)", biodro_pachwina: "Biodro / pachwina", posladek: "Pośladek", pasmo_bt: "Pasmo biodrowo-piszczelowe", plecy_ledzwia: "Plecy / lędźwia", kostka: "Kostka (skręcenia)", inne: "Inne" },
  { stopa: "Foot / plantar", pieta_achilles: "Heel / Achilles", lydka: "Calf", piszczel: "Shin", kolano: "Knee", udo_przod: "Front thigh", udo_tyl: "Hamstring", biodro_pachwina: "Hip / groin", posladek: "Glute", pasmo_bt: "IT band", plecy_ledzwia: "Lower back", kostka: "Ankle (sprains)", inne: "Other" },
);

export const STATUS_LABEL: Record<InjuryStatus, string> = localized<InjuryStatus>(
  { active: "aktywna", healing: "w trakcie powrotu", healed: "wyleczona", recurring: "nawracająca" },
  { active: "active", healing: "returning", healed: "healed", recurring: "recurring" },
);

export const SEVERITY_LABEL: Record<"1" | "2" | "3", string> = localized<"1" | "2" | "3">(
  { "1": "lekka (biega z ograniczeniami)", "2": "średnia (przerwa do 3 tyg.)", "3": "poważna (dłuższa przerwa)" },
  { "1": "mild (runs with limits)", "2": "moderate (up to 3 weeks off)", "3": "serious (longer break)" },
);

/** Injury history, the ones that matter now first. Empty before migration 20261108000300. */
export async function listInjuries(supabase: ServerSupabase, athleteId: string): Promise<Injury[]> {
  const { data, error } = await supabase.from("athlete_injuries").select("*").eq("athlete_id", athleteId).order("started_on", { ascending: false, nullsFirst: false });
  if (error) return [];
  const order: Record<InjuryStatus, number> = { active: 0, recurring: 1, healing: 2, healed: 3 };
  return ((data ?? []) as Injury[]).sort((a, b) => order[a.status] - order[b.status]);
}

export interface PainSummary {
  area: string;
  days: number;
  last: string;
}

/** Pain reported in the morning check over the last half year, grouped by area. */
export async function painHistory(supabase: ServerSupabase, athleteId: string, from: string): Promise<PainSummary[]> {
  const { data } = await supabase.from("readiness").select("day, pain, pain_area").eq("athlete_id", athleteId).eq("pain", true).gte("day", from);
  const map = new Map<string, PainSummary>();
  for (const r of (data ?? []) as { day: string; pain_area: string | null }[]) {
    const area = (r.pain_area ?? "").trim().toLowerCase() || "bez podanego miejsca";
    const p = map.get(area) ?? { area, days: 0, last: r.day };
    p.days += 1;
    if (r.day > p.last) p.last = r.day;
    map.set(area, p);
  }
  return [...map.values()].sort((a, b) => b.days - a.days);
}
