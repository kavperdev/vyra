import { load, save, useStore } from "@/lib/app/store";

/**
 * The training log: every run from the GPS, the timer, a manual entry or Strava, plus other sports
 * (bike, swim, gym...). Entries ticked "done" in a plan without a recorded run are stored with
 * `auto: true` and the plan's planned values, so progress shows them too; a real run on the same
 * day replaces them.
 */
export type Sport = "run" | "bike" | "swim" | "gym" | "walk" | "mobility" | "ski" | "team" | "other";
export type Run = { id: string; day: string; km: number; sec: number; rpe: number; note: string; ref?: string; splits?: number[]; sport?: Sport; auto?: boolean };
export const LOG = "vyra-log";
const DEL = "vyra-log-del"; // removed ids, so the account sync does not bring them back

export const SPORTS: { k: Sport; name: string; dist: boolean }[] = [
  { k: "run", name: "Bieg", dist: true },
  { k: "bike", name: "Rower", dist: true },
  { k: "swim", name: "Pływanie", dist: true },
  { k: "gym", name: "Siłownia", dist: false },
  { k: "walk", name: "Marsz", dist: true },
  { k: "mobility", name: "Mobilność / joga", dist: false },
  { k: "ski", name: "Narty / biegówki", dist: true },
  { k: "team", name: "Gry zespołowe", dist: false },
  { k: "other", name: "Inny sport", dist: false },
];
export const sportName = (s?: Sport) => SPORTS.find((x) => x.k === (s ?? "run"))?.name ?? "Trening";
export const isRun = (r: Run) => !r.sport || r.sport === "run";

const valid = (v: unknown): Run[] => (Array.isArray(v) ? v.filter((r) => r && typeof r.id === "string" && typeof r.day === "string") : []);
const sort = (r: Run[]) => [...r].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
/** A recorded run on a day replaces the plan's estimated ("auto") run for that day. */
const dedupe = (all: Run[]) => {
  const real = new Set(all.filter((r) => isRun(r) && !r.auto).map((r) => r.day));
  return all.filter((r) => !(r.auto && isRun(r) && real.has(r.day)));
};

/** Every activity, all sports. */
export function readAll(): Run[] {
  return valid(load<unknown>(LOG, []));
}
/** Runs only (running stats, form, plans). */
export function readLog(): Run[] {
  return readAll().filter(isRun);
}
export function writeLog(r: Run[]) {
  save(LOG, sort(dedupe(r)));
}
export function addRun(r: Omit<Run, "id"> & { id?: string }): Run {
  const run: Run = { ...r, id: r.id ?? crypto.randomUUID(), km: Math.round(r.km * 100) / 100, note: (r.note ?? "").slice(0, 200) };
  writeLog([run, ...readAll().filter((x) => x.id !== run.id)]);
  return run;
}
export function removeRun(id: string) {
  writeLog(readAll().filter((r) => r.id !== id));
  save(DEL, [...new Set([...load<string[]>(DEL, []), id])].slice(-500));
}
export function deletedRuns(): string[] {
  return load<string[]>(DEL, []);
}

/**
 * Ticking a plan session as done: if nothing was recorded that day, log it from the plan
 * (planned distance and time) so kilometres and progress count it. Unticking removes it.
 */
export function logPlanned(ref: string, e: { day: string; km: number; sec: number; title: string; sport?: Sport }) {
  const all = readAll();
  const sport = e.sport ?? "run";
  if (all.some((r) => r.ref === ref)) return;
  if (sport === "run" && all.some((r) => isRun(r) && r.day === e.day && !r.auto)) return;
  addRun({ id: `plan-${ref}`, day: e.day, km: e.km, sec: e.sec, rpe: 0, note: e.title, ref, sport, auto: true });
}
export function unlogPlanned(ref: string) {
  const all = readAll();
  const hit = all.filter((r) => r.ref === ref && r.auto);
  if (hit.length) writeLog(all.filter((r) => !(r.ref === ref && r.auto)));
}

/** Union of two logs without removed runs (used by the account sync). */
export function mergeLogs(a: unknown, b: unknown, del: string[]): Run[] {
  const m = new Map<string, Run>();
  for (const r of [...valid(a), ...valid(b)]) if (!del.includes(r.id)) m.set(r.id, r);
  return sort(dedupe([...m.values()]));
}
/** Runs only. */
export function useLog(): Run[] {
  const [v] = useStore<unknown>(LOG, []);
  return valid(v).filter(isRun);
}
/** Every activity, all sports. */
export function useActivities(): Run[] {
  const [v] = useStore<unknown>(LOG, []);
  return valid(v);
}
