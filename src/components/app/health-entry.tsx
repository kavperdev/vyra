"use client";

import { useMemo, useState } from "react";
import { HEALTH_KEY, healthSignal, upsertDay, validHealth, type HealthDay, type HealthSignal } from "@/lib/app/health";
import { todayWaw, useStore } from "@/lib/app/store";
import { Sheet } from "@/components/app/sheet";
import { cn } from "@/lib/utils";

/** All morning numbers on this account, oldest first. */
export function useHealth(): [HealthDay[], (d: HealthDay) => void] {
  const [raw, setRaw] = useStore<unknown>(HEALTH_KEY, []);
  const all = useMemo(() => validHealth(raw), [raw]);
  return [all, (d) => setRaw(upsertDay(all, d))];
}

/** Today's verdict from the morning numbers. */
export function useHealthSignal(): HealthSignal {
  const [all] = useHealth();
  return useMemo(() => healthSignal(all, todayWaw()), [all]);
}

const field = "h-14 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[22px] font-semibold tabular-nums outline-none placeholder:text-white/20 focus:border-white/30";
const toNum = (s: string) => {
  const v = Number(s.replace(",", "."));
  return s.trim() && Number.isFinite(v) ? v : undefined;
};
/** "7:30", "7.5", "7,5" or "7h30" → hours. */
const toHours = (s: string) => {
  const m = s.trim().match(/^(\d{1,2})\s*[:h]\s*(\d{1,2})$/i);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  return toNum(s);
};
const hhmm = (h?: number) => (h == null ? "" : `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`);

/** The 10-second morning entry: resting HR, HRV, sleep (and weight, if the runner wants). */
export function HealthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [all, put] = useHealth();
  const day = todayWaw();
  const t = all.find((d) => d.day === day);
  const [v, setV] = useState({ rhr: t?.rhr?.toString() ?? "", hrv: t?.hrv?.toString() ?? "", sleep: hhmm(t?.sleep), weight: t?.weight?.toString() ?? "" });
  const [more, setMore] = useState(!!t?.weight);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const entry: HealthDay = { day, rhr: toNum(v.rhr), hrv: toNum(v.hrv), sleep: toHours(v.sleep), weight: more ? toNum(v.weight) : t?.weight };
  const any = entry.rhr != null || entry.hrv != null || entry.sleep != null;
  return (
    <Sheet open={open} onClose={onClose} title="Poranne liczby" sub="Z zegarka, zaraz po przebudzeniu. Wystarczy jedna, najlepiej wszystkie trzy.">
      <div className="grid gap-4">
        <label className="text-[14px] text-white/70">
          Tętno spoczynkowe
          <div className="relative mt-1.5">
            <input inputMode="numeric" className={field} value={v.rhr} onChange={set("rhr")} placeholder="np. 48" />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-white/40">ud./min</span>
          </div>
        </label>
        <label className="text-[14px] text-white/70">
          HRV
          <div className="relative mt-1.5">
            <input inputMode="numeric" className={field} value={v.hrv} onChange={set("hrv")} placeholder="np. 62" />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-white/40">ms</span>
          </div>
          <span className="mt-1 block text-[12.5px] text-white/40">W Garminie: Status HRV, średnia z nocy.</span>
        </label>
        <label className="text-[14px] text-white/70">
          Sen
          <div className="relative mt-1.5">
            <input inputMode="decimal" className={field} value={v.sleep} onChange={set("sleep")} placeholder="np. 7:30" />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-white/40">godz.</span>
          </div>
        </label>
        {more ? (
          <label className="text-[14px] text-white/70">
            Waga (opcjonalnie)
            <div className="relative mt-1.5">
              <input inputMode="decimal" className={field} value={v.weight} onChange={set("weight")} placeholder="np. 72,5" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-white/40">kg</span>
            </div>
          </label>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="w-fit text-[13.5px] text-white/55 underline underline-offset-2">
            Dodaj też wagę
          </button>
        )}
        <button
          type="button"
          disabled={!any}
          onClick={() => {
            put(entry);
            onClose();
          }}
          className={cn("mt-1 h-[52px] rounded-full bg-white text-[16px] font-semibold text-black transition active:scale-[0.98]", !any && "opacity-30")}
        >
          Zapisz
        </button>
        <p className="text-[12.5px] leading-relaxed text-white/40">
          VYRA porównuje każdą liczbę z Twoją normą z ostatnich tygodni (po 4 porankach już wie, co jest dla Ciebie normalne). Gdy coś odstaje, plan na dziś robi się lżejszy. To nie jest diagnoza: przy niepokojących objawach idź do lekarza.
        </p>
      </div>
    </Sheet>
  );
}
