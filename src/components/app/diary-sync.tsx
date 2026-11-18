"use client";

import { useEffect } from "react";
import { addRun, deletedRuns, readAll, unlogPlanned, type Sport } from "@/lib/app/log";

export type DoneSession = { id: string; day: string; kind: string; title: string; km: number; sec: number; rpe: number; note: string };
const SPORT: Record<string, Sport> = { running: "run", strength: "gym", mobility: "mobility" };

/**
 * Every session finished in the plan (from a coach or VYRA Method) lands in the diary, on any device:
 * the server hands over the done sessions and the missing ones are added. Removed entries stay removed.
 */
export function DiarySync({ done }: { done: DoneSession[] }) {
  useEffect(() => {
    if (!done.length) return;
    const have = new Set(readAll().map((r) => r.id));
    const gone = new Set(deletedRuns());
    for (const d of done) {
      const id = `exec-${d.id}`;
      if (have.has(id) || gone.has(id)) continue;
      const sport = SPORT[d.kind] ?? "other";
      if (sport === "run" && !d.km && !d.sec) continue;
      unlogPlanned(`sess:${d.id}`);
      addRun({ id, day: d.day, km: sport === "run" ? d.km : 0, sec: d.sec, rpe: d.rpe, note: d.note || d.title, ref: `sess:${d.id}`, sport });
    }
  }, [done]);
  return null;
}
