import type { Camp, CampParticipant, CampTest } from "@/lib/camps";
import { campDates } from "@/lib/camps";
import { formatPace } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

type Metric = {
  label: string;
  unit: string;
  get: (t: CampTest) => number | null;
  fmt?: (v: number) => string;
  /** +1 when a higher value is better, −1 when lower is better, 0 when neutral. */
  better: 1 | -1 | 0;
};

const n1 = (v: number) => v.toLocaleString("pl-PL", { maximumFractionDigits: 1 });

const metrics = (): Metric[] => [
  { label: "VO2max", unit: "ml/kg/min", get: (t) => t.vo2max, fmt: n1, better: 1 },
  { label: tl("Tempo na progu tlenowym (LT1)", "Pace at aerobic threshold (LT1)"), unit: "min/km", get: (t) => t.lt1_pace_s, fmt: formatPace, better: -1 },
  { label: tl("Tempo na progu beztlenowym (LT2)", "Pace at anaerobic threshold (LT2)"), unit: "min/km", get: (t) => t.lt2_pace_s, fmt: formatPace, better: -1 },
  { label: tl("Tętno na LT1", "HR at LT1"), unit: "bpm", get: (t) => t.lt1_hr, better: 0 },
  { label: tl("Tętno na LT2", "HR at LT2"), unit: "bpm", get: (t) => t.lt2_hr, better: 0 },
  { label: tl("Tętno maks.", "Max HR"), unit: "bpm", get: (t) => t.hr_max, better: 0 },
  { label: tl("Tętno spoczynkowe", "Resting HR"), unit: "bpm", get: (t) => t.hr_rest, better: -1 },
  { label: tl("Masa ciała", "Body weight"), unit: "kg", get: (t) => t.weight_kg, fmt: n1, better: 0 },
  { label: tl("Tkanka tłuszczowa", "Body fat"), unit: "%", get: (t) => t.body_fat_pct, fmt: n1, better: -1 },
  { label: tl("Masa mięśniowa", "Muscle mass"), unit: "kg", get: (t) => t.muscle_kg, fmt: n1, better: 1 },
  { label: tl("Skok CMJ", "CMJ jump"), unit: "cm", get: (t) => t.cmj_cm, fmt: n1, better: 1 },
];

function change(m: Metric, a: number | null, b: number | null) {
  if (a == null || b == null) return null;
  const d = b - a;
  if (d === 0) return { text: tl("bez zmian", "no change"), tone: "text-muted" };
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
      name: tl("Strefa 1 · spokojna", "Zone 1 · easy"),
      hr: tl(`poniżej ${t.lt1_hr} bpm`, `below ${t.lt1_hr} bpm`),
      pace: t.lt1_pace_s ? tl(`wolniej niż ${formatPace(t.lt1_pace_s)} /km`, `slower than ${formatPace(t.lt1_pace_s)} /km`) : null,
      use: tl("większość kilometrów, rozbiegania, regeneracja", "most of the mileage, easy runs, recovery"),
    },
    {
      name: tl("Strefa 2 · próg", "Zone 2 · threshold"),
      hr: `${t.lt1_hr}–${t.lt2_hr} bpm`,
      pace: t.lt1_pace_s && t.lt2_pace_s ? `${formatPace(t.lt2_pace_s)}–${formatPace(t.lt1_pace_s)} /km` : null,
      use: tl("tempo, bieg progowy, długie odcinki", "tempo, threshold runs, long reps"),
    },
    {
      name: tl("Strefa 3 · wysoka intensywność", "Zone 3 · high intensity"),
      hr: tl(`powyżej ${t.lt2_hr} bpm`, `above ${t.lt2_hr} bpm`),
      pace: t.lt2_pace_s ? tl(`szybciej niż ${formatPace(t.lt2_pace_s)} /km`, `faster than ${formatPace(t.lt2_pace_s)} /km`) : null,
      use: tl("interwały, krótkie odcinki, starty", "intervals, short reps, races"),
    },
  ];
}

export function CampReport({ camp, participant, tests }: { camp: Camp; participant: CampParticipant; tests: CampTest[] }) {
  const start = tests.find((t) => t.phase === "start");
  const end = tests.find((t) => t.phase === "end");
  const rows = metrics().filter((m) => (start && m.get(start) != null) || (end && m.get(end) != null));
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
                <th className="py-2 pr-3 font-medium">{tl("Parametr", "Metric")}</th>
                <th className="py-2 pr-3 font-medium">Start</th>
                <th className="py-2 pr-3 font-medium">{tl("Koniec", "End")}</th>
                <th className="py-2 font-medium">{tl("Zmiana", "Change")}</th>
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
        <p className="text-sm text-muted">{tl("Brak wyników testów. Wpisz je powyżej, a raport uzupełni się automatycznie.", "No test results. Enter them above and the report fills in automatically.")}</p>
      )}

      {z ? (
        <div className="grid gap-3">
          <h3 className="font-semibold">{tl("Strefy treningowe z ostatniego testu", "Training zones from the latest test")}</h3>
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
          <p className="text-[12px] text-subtle">{tl("Strefy wyznaczone z progów mleczanowych (model trzystrefowy), do potwierdzenia w treningu.", "Zones set from lactate thresholds (three-zone model), to be confirmed in training.")}</p>
        </div>
      ) : null}

      {[start?.notes, end?.notes].some(Boolean) ? (
        <div className="grid gap-2">
          <h3 className="font-semibold">{tl("Uwagi i zalecenia", "Notes and recommendations")}</h3>
          {start?.notes ? <p className="whitespace-pre-wrap text-sm"><span className="text-muted">{tl("Start:", "Start:")} </span>{start.notes}</p> : null}
          {end?.notes ? <p className="whitespace-pre-wrap text-sm"><span className="text-muted">{tl("Koniec:", "End:")} </span>{end.notes}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
