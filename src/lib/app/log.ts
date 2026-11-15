import { load, save, useStore } from "@/lib/app/store";

/** The run log: every run from the GPS, the timer, a manual entry or Strava. Ticks plan sessions by date. */
export type Run = { id: string; day: string; km: number; sec: number; rpe: number; note: string; ref?: string };
export const LOG = "vyra-log";
const DEL = "vyra-log-del"; // removed ids, so the account sync does not bring them back

const valid = (v: unknown): Run[] => (Array.isArray(v) ? v.filter((r) => r && typeof r.id === "string" && typeof r.day === "string") : []);
const sort = (r: Run[]) => [...r].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));

export function readLog(): Run[] {
  return valid(load<unknown>(LOG, []));
}
export function writeLog(r: Run[]) {
  save(LOG, sort(r));
}
export function addRun(r: Omit<Run, "id"> & { id?: string }): Run {
  const run: Run = { ...r, id: r.id ?? crypto.randomUUID(), km: Math.round(r.km * 100) / 100, note: (r.note ?? "").slice(0, 200) };
  writeLog([run, ...readLog().filter((x) => x.id !== run.id)]);
  return run;
}
export function removeRun(id: string) {
  writeLog(readLog().filter((r) => r.id !== id));
  save(DEL, [...new Set([...load<string[]>(DEL, []), id])].slice(-500));
}
export function deletedRuns(): string[] {
  return load<string[]>(DEL, []);
}
/** Union of two logs without removed runs (used by the account sync). */
export function mergeLogs(a: unknown, b: unknown, del: string[]): Run[] {
  const m = new Map<string, Run>();
  for (const r of [...valid(a), ...valid(b)]) if (!del.includes(r.id)) m.set(r.id, r);
  return sort([...m.values()]);
}
export function useLog(): Run[] {
  const [v] = useStore<unknown>(LOG, []);
  return valid(v);
}
