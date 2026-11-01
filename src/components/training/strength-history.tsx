import Link from "next/link";
import { EmptyState } from "@/components/ui/misc";
import type { StrengthHistoryEntry } from "@/lib/data/people";
import { formatDate, formatKg, formatNumber } from "@/lib/format";
import { bestSet, estimateOneRepMax, exerciseKey, totalReps, volumeLoad } from "@/lib/training/strength";
import { tl } from "@/lib/i18n/runtime";

interface ExerciseSummary {
  name: string;
  sessions: number;
  lastDate: string;
  bestLoad: { load: number; reps: number; date: string } | null;
  bestE1rm: { value: number; date: string } | null;
  lastVolume: number;
  entries: StrengthHistoryEntry[];
}

export function summarizeExercises(entries: StrengthHistoryEntry[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>();
  for (const e of entries) {
    const key = exerciseKey(e.exercise_name);
    const cur = map.get(key) ?? { name: e.exercise_name, sessions: 0, lastDate: e.performed_on, bestLoad: null, bestE1rm: null, lastVolume: volumeLoad(e.sets), entries: [] };
    cur.sessions += 1;
    cur.entries.push(e);
    if (e.performed_on > cur.lastDate) {
      cur.lastDate = e.performed_on;
      cur.lastVolume = volumeLoad(e.sets);
    }
    const b = bestSet(e.sets);
    if (b && (!cur.bestLoad || b.load_kg > cur.bestLoad.load || (b.load_kg === cur.bestLoad.load && b.reps > cur.bestLoad.reps))) {
      cur.bestLoad = { load: b.load_kg, reps: b.reps, date: e.performed_on };
    }
    for (const s of e.sets) {
      const v = s.completed === false ? null : estimateOneRepMax(s.load_kg, s.reps);
      if (v && (!cur.bestE1rm || v > cur.bestE1rm.value)) cur.bestE1rm = { value: v, date: e.performed_on };
    }
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

export function StrengthHistory({ entries, sessionHref }: { entries: StrengthHistoryEntry[]; sessionHref: (id: string) => string }) {
  const exercises = summarizeExercises(entries);
  if (!exercises.length) return <EmptyState title={tl("Brak historii siłowej", "No strength history")} description={tl("Historia pojawi się po zapisaniu pierwszego treningu siłowego.", "History appears after your first strength session is logged.")} />;
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left text-[12px] text-muted">
            <tr>
              <th className="px-3 py-2.5 font-medium">{tl("Ćwiczenie", "Exercise")}</th>
              <th className="px-3 py-2.5 font-medium">{tl("Treningi", "Sessions")}</th>
              <th className="px-3 py-2.5 font-medium">{tl("Ostatnio", "Last")}</th>
              <th className="px-3 py-2.5 font-medium">{tl("Najcięższa seria", "Heaviest set")}</th>
              <th className="px-3 py-2.5 font-medium">{tl("Szac. 1RM", "Est. 1RM")}</th>
              <th className="px-3 py-2.5 font-medium">{tl("Ostatnia objętość", "Latest volume")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {exercises.map((x) => (
              <tr key={x.name}>
                <td className="px-3 py-2.5 font-medium">{x.name}</td>
                <td className="num px-3 py-2.5">{x.sessions}</td>
                <td className="num px-3 py-2.5 text-muted">{formatDate(x.lastDate, "d MMM")}</td>
                <td className="num px-3 py-2.5">{x.bestLoad ? `${formatKg(x.bestLoad.load)} × ${x.bestLoad.reps}` : "–"}</td>
                <td className="num px-3 py-2.5">{x.bestE1rm ? `≈ ${formatNumber(x.bestE1rm.value)} kg` : "–"}</td>
                <td className="num px-3 py-2.5 text-muted">{x.lastVolume ? `${formatNumber(x.lastVolume, 0)} kg` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-subtle">{tl("Szacowane 1RM liczone wzorem Epleya z serii do 12 powtórzeń. Warianty ćwiczeń o różnych nazwach nie są łączone.", "Estimated 1RM uses the Epley formula from sets of up to 12 reps. Exercise variants with different names aren’t combined.")}</p>
      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-4 py-2.5 text-sm">{tl("Wszystkie zapisane serie", "All logged sets")}</summary>
        <ul className="divide-y divide-border border-t border-border">
          {entries.map((e, i) => (
            <li key={`${e.session_id}-${e.exercise_name}-${i}`} className="grid gap-1 px-4 py-2.5 text-sm">
              <p>
                <span className="num text-muted">{formatDate(e.performed_on, "d MMM yy")}</span> · <span className="font-medium">{e.exercise_name}</span> ·{" "}
                <Link href={sessionHref(e.session_id)} className="text-muted underline-offset-4 hover:underline">
                  {e.session_title}
                </Link>
              </p>
              <p className="num text-[12px] text-muted">
                {e.sets.map((s, j) => (
                  <span key={j} className={s.completed ? "" : "line-through"}>
                    {j > 0 ? " · " : ""}
                    {s.reps ?? "–"}
                    {s.load_kg != null ? `×${formatNumber(s.load_kg)}kg` : ""}
                  </span>
                ))}
                {" "}— {totalReps(e.sets)} powt., {formatNumber(volumeLoad(e.sets), 0)} kg
              </p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
