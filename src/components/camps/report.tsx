import type { Camp, CampParticipant, CampTest } from "@/lib/camps";
import { campDates } from "@/lib/camps";
import { formatPace } from "@/lib/format";

type Metric = {
  label: string;
  unit: string;
  get: (t: CampTest) => number | null;
  fmt?: (v: number) => string;
  /** +1 when a higher value is better, −1 when lower is better, 0 when neutral. */
  better: 1 | -1 | 0;
};

const n1 = (v: number) => v.toLocaleString("pl-PL", { maximumFractionDigits: 1 });

const METRICS: Metric[] = [
  { label: "VO2max", unit: "ml/kg/min", get: (t) => t.vo2max, fmt: n1, better: 1 },
  { label: "Tempo na progu tlenowym (LT1)", unit: "min/km", get: (t) => t.lt1_pace_s, fmt: formatPace, better: -1 },
  { label: "Tempo na progu beztlenowym (LT2)", unit: "min/km", get: (t) => t.lt2_pace_s, fmt: formatPace, better: -1 },
  { label: "Tętno na LT1", unit: "bpm", get: (t) => t.lt1_hr, better: 0 },
  { label: "Tętno na LT2", unit: "bpm", get: (t) => t.lt2_hr, better: 0 },
  { label: "Tętno maks.", unit: "bpm", get: (t) => t.hr_max, better: 0 },
  { label: "Tętno spoczynkowe", unit: "bpm", get: (t) => t.hr_rest, better: -1 },
  { label: "Masa ciała", unit: "kg", get: (t) => t.weight_kg, fmt: n1, better: 0 },
  { label: "Tkanka tłuszczowa", unit: "%", get: (t) => t.body_fat_pct, fmt: n1, better: -1 },
  { label: "Masa mięśniowa", unit: "kg", get: (t) => t.muscle_kg, fmt: n1, better: 1 },
  { label: "Skok CMJ", unit: "cm", get: (t) => t.cmj_cm, fmt: n1, better: 1 },
];

function change(m: Metric, a: number | null, b: number | null) {
  if (a == null || b == null) return null;
  const d = b - a;
  if (d === 0) return { text: "bez zmian", tone: "text-muted" };
  const abs = Math.abs(d);
  const text = `${d > 0 ? "+" : "−"}${m.fmt === formatPace ? `${Math.round(abs)} s` : (m.fmt ?? String)(abs)}`;
  const good = m.better === 0 ? null : m.better * d > 0;
  return { text, tone: good == null ? "text-muted" : good ? "text-done" : "text-warning" };
}

/** Three-zone model from the lactate thresholds (orientation only). */
function zones(t: CampTest | undefined) {
  if (!t?.lt1_hr || !t.lt2_hr) return null;
  return [
    {
      name: "Strefa 1 · spokojna",
      hr: `poniżej ${t.lt1_hr} bpm`,
      pace: t.lt1_pace_s ? `wolniej niż ${formatPace(t.lt1_pace_s)} /km` : null,
      use: "większość kilometrów, rozbiegania, regeneracja",
    },
    {
      name: "Strefa 2 · próg",
      hr: `${t.lt1_hr}–${t.lt2_hr} bpm`,
      pace: t.lt1_pace_s && t.lt2_pace_s ? `${formatPace(t.lt2_pace_s)}–${formatPace(t.lt1_pace_s)} /km` : null,
      use: "tempo, bieg progowy, długie odcinki",
    },
    {
      name: "Strefa 3 · wysoka intensywność",
      hr: `powyżej ${t.lt2_hr} bpm`,
      pace: t.lt2_pace_s ? `szybciej niż ${formatPace(t.lt2_pace_s)} /km` : null,
      use: "interwały, krótkie odcinki, starty",
    },
  ];
}

export function CampReport({ camp, participant, tests }: { camp: Camp; participant: CampParticipant; tests: CampTest[] }) {
  const start = tests.find((t) => t.phase === "start");
  const end = tests.find((t) => t.phase === "end");
  const rows = METRICS.filter((m) => (start && m.get(start) != null) || (end && m.get(end) != null));
  const z = zones(end ?? start);
  const dates = campDates(camp);

  return (
    <section className="grid gap-6 rounded-lg border border-border p-6 print:border-0 print:p-0">
      <div className="grid gap-1">
        <p className="eyebrow">Raport VYRA · {camp.title}</p>
        <h2 className="display text-2xl">{participant.full_name}</h2>
        <p className="text-sm text-muted">{[dates, camp.location].filter(Boolean).join(" · ")}</p>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted">
                <th className="py-2 pr-3 font-medium">Parametr</th>
                <th className="py-2 pr-3 font-medium">Start</th>
                <th className="py-2 pr-3 font-medium">Koniec</th>
                <th className="py-2 font-medium">Zmiana</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const a = start ? m.get(start) : null;
                const b = end ? m.get(end) : null;
                const f = m.fmt ?? String;
                const c = change(m, a, b);
                return (
                  <tr key={m.label} className="border-b border-border last:border-b-0">
                    <td className="py-2.5 pr-3">
                      {m.label} <span className="text-subtle">({m.unit})</span>
                    </td>
                    <td className="num py-2.5 pr-3">{a == null ? "–" : f(a)}</td>
                    <td className="num py-2.5 pr-3 font-semibold">{b == null ? "–" : f(b)}</td>
                    <td className={`num py-2.5 ${c?.tone ?? "text-subtle"}`}>{c?.text ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted">Brak wyników testów. Wpisz je powyżej, a raport uzupełni się automatycznie.</p>
      )}

      {z ? (
        <div className="grid gap-3">
          <h3 className="font-semibold">Strefy treningowe z ostatniego testu</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {z.map((zone) => (
              <div key={zone.name} className="grid gap-1 rounded-lg border border-border p-4">
                <p className="text-sm font-semibold">{zone.name}</p>
                <p className="num text-sm">{zone.hr}</p>
                {zone.pace ? <p className="num text-sm text-muted">{zone.pace}</p> : null}
                <p className="text-[13px] text-muted">{zone.use}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-subtle">Strefy wyznaczone z progów mleczanowych (model trzystrefowy), do potwierdzenia w treningu.</p>
        </div>
      ) : null}

      {[start?.notes, end?.notes].some(Boolean) ? (
        <div className="grid gap-2">
          <h3 className="font-semibold">Uwagi i zalecenia</h3>
          {start?.notes ? <p className="whitespace-pre-wrap text-sm"><span className="text-muted">Start: </span>{start.notes}</p> : null}
          {end?.notes ? <p className="whitespace-pre-wrap text-sm"><span className="text-muted">Koniec: </span>{end.notes}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
