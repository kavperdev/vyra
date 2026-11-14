import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type WeekSession = { id: string; title: string; scheduled_date: string; planned_duration_s: number | null; status: string };

const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/** The athlete's plan for this week, straight from the platform, in the app's own look. */
export function MyWeek({ days, sessions, today }: { days: string[]; sessions: WeekSession[]; today: string }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]">
      <div className="grid grid-cols-7 gap-1 p-3">
        {days.map((d, i) => {
          const s = sessions.filter((x) => x.scheduled_date === d);
          const done = s.length && s.every((x) => x.status === "completed" || x.status === "partial");
          return (
            <div key={d} className="grid justify-items-center gap-1.5">
              <span className={cn("text-[11px]", d === today ? "text-white" : "text-white/40")}>{DOW[i]}</span>
              <span className={cn("grid size-8 place-items-center rounded-full text-[12px] tabular-nums", d === today ? "bg-white text-black" : done ? "bg-emerald-400/20 text-emerald-300" : s.length ? "bg-white/[0.09]" : "text-white/30")}>
                {done ? <Check className="size-3.5" /> : Number(d.slice(8))}
              </span>
              <span className={cn("size-1 rounded-full", s.length && !done ? "bg-[var(--accent)]" : "bg-transparent")} />
            </div>
          );
        })}
      </div>
      <div className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
        {sessions.length ? (
          sessions.map((s) => {
            const done = s.status === "completed" || s.status === "partial";
            const dow = DOW[days.indexOf(s.scheduled_date)] ?? "";
            return (
              <Link key={s.id} href={`/athlete/sessions/${s.id}`} className={cn("flex items-center gap-3 px-4 py-3 active:bg-white/[0.04]", s.scheduled_date < today && !done && "opacity-50")}>
                <span className={cn("w-7 text-[12px]", s.scheduled_date === today ? "font-semibold text-white" : "text-white/45")}>{dow}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[14.5px] font-medium", done && "text-white/50 line-through")}>{s.title}</span>
                  {s.planned_duration_s ? <span className="text-[12px] text-white/40">{Math.round(s.planned_duration_s / 60)} min</span> : null}
                </span>
                {done ? <Check className="size-4 text-emerald-300" /> : <ChevronRight className="size-4 text-white/25" />}
              </Link>
            );
          })
        ) : (
          <p className="px-4 py-4 text-[13px] text-white/45">Na ten tydzień nie ma jeszcze treningów.</p>
        )}
      </div>
    </div>
  );
}
