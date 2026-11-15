"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Share2 } from "lucide-react";
import { levelOf, weekStreak, weeklyKm } from "@/lib/app/badges";
import { useLog } from "@/lib/app/log";
import { todayWaw, useStore } from "@/lib/app/store";
import { Card } from "@/components/app/ui";
import { fmtTime } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

const GOAL = "vyra-week-goal";
const pl = (n: number) => n.toFixed(1).replace(".", ",");

export function useWeekNumbers() {
  const log = useLog();
  const [goalRaw, setGoal] = useStore<number | null>(GOAL, null);
  return useMemo(() => {
    const today = todayWaw();
    const weeks = weeklyKm(log, today, 6);
    const cur = weeks[weeks.length - 1];
    const prev = weeks[weeks.length - 2];
    const avg = weeks.slice(0, -1).reduce((s, w) => s + w.km, 0) / 5;
    const suggested = Math.max(5, Math.round((avg > 0 ? avg * 1.1 : 10) / 5) * 5);
    const goal = typeof goalRaw === "number" && goalRaw > 0 ? goalRaw : suggested;
    const sec = log.filter((r) => r.day >= cur.monday).reduce((s, r) => s + r.sec, 0);
    const total = log.reduce((s, r) => s + r.km, 0);
    return { cur, prev, goal, setGoal, sec, streak: weekStreak(log, today), level: levelOf(total), total, pct: Math.min(1, cur.km / goal) };
  }, [log, goalRaw, setGoal]);
}

/** Draws the week as a 1080×1920 story image, in the app's look. */
async function storyImage(d: { km: number; runs: number; sec: number; streak: number; diff: number | null; level: string; range: string }): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1920;
  const x = c.getContext("2d");
  if (!x) return null;
  x.fillStyle = "#000";
  x.fillRect(0, 0, 1080, 1920);
  const g = x.createRadialGradient(540, 760, 60, 540, 760, 900);
  g.addColorStop(0, "rgba(229,52,59,0.38)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 1080, 1920);
  const font = (w: number, s: number) => `${w} ${s}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  x.textAlign = "center";
  await new Promise<void>((res) => {
    const img = new Image();
    img.onload = () => {
      const w = 300;
      x.drawImage(img, 540 - w / 2, 200, w, (img.height / img.width) * w);
      res();
    };
    img.onerror = () => res();
    img.src = "/branding/vyra-logo-white.png";
  });
  x.fillStyle = "rgba(255,255,255,0.55)";
  x.font = font(500, 40);
  x.fillText("MÓJ TYDZIEŃ", 540, 420);
  x.font = font(400, 34);
  x.fillText(d.range, 540, 476);
  x.fillStyle = "#fff";
  x.font = font(300, 330);
  x.fillText(pl(d.km), 540, 900);
  x.fillStyle = "rgba(255,255,255,0.6)";
  x.font = font(500, 56);
  x.fillText("kilometrów", 540, 990);
  const cells: [string, string][] = [
    [String(d.runs), d.runs === 1 ? "trening" : "treningów"],
    [fmtTime(d.sec), "w ruchu"],
    [d.streak ? `${d.streak}` : "–", "tyg. z rzędu"],
  ];
  cells.forEach(([v, l], i) => {
    const cx = 200 + i * 340;
    x.fillStyle = "#fff";
    x.font = font(500, 76);
    x.fillText(v, cx, 1230);
    x.fillStyle = "rgba(255,255,255,0.5)";
    x.font = font(400, 34);
    x.fillText(l, cx, 1284);
  });
  if (d.diff != null) {
    x.fillStyle = d.diff >= 0 ? "#4fd08b" : "rgba(255,255,255,0.6)";
    x.font = font(500, 44);
    x.fillText(`${d.diff >= 0 ? "+" : ""}${pl(d.diff)} km do poprzedniego tygodnia`, 540, 1420);
  }
  x.fillStyle = "rgba(255,255,255,0.75)";
  x.font = font(500, 42);
  x.fillText(`Poziom: ${d.level}`, 540, 1560);
  x.fillStyle = "rgba(255,255,255,0.4)";
  x.font = font(400, 34);
  x.fillText("vyraathl.pl/app", 540, 1760);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

export function WeekSummary() {
  const w = useWeekNumbers();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const diff = w.prev.km || w.cur.km ? w.cur.km - w.prev.km : null;
  const range = (() => {
    const f = (iso: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
    const end = new Date(`${w.cur.monday}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    return `${f(w.cur.monday)} – ${f(end.toISOString().slice(0, 10))}`;
  })();

  const share = async () => {
    setBusy(true);
    try {
      const blob = await storyImage({ km: w.cur.km, runs: w.cur.runs, sec: w.sec, streak: w.streak, diff, level: w.level.name, range });
      if (!blob) return;
      const file = new File([blob], "vyra-moj-tydzien.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title?: string }) => Promise<void> };
      if (nav.canShare?.({ files: [file] }) && nav.share) await nav.share({ files: [file], title: "Mój tydzień w VYRA" }).catch(() => undefined);
      else setUrl(URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-white/45">Ten tydzień · {range}</p>
          <p className="mt-1 text-[40px] font-light leading-none tabular-nums tracking-tight">
            {pl(w.cur.km)} <span className="text-[14px] text-white/45">/ {w.goal} km</span>
          </p>
        </div>
        <button type="button" disabled={busy || !w.cur.runs} onClick={share} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-black active:scale-95 disabled:opacity-30">
          <Share2 className="size-4" /> {busy ? "Chwila…" : "Udostępnij"}
        </button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={cn("h-full rounded-full transition-all duration-700", w.pct >= 1 ? "bg-emerald-400" : "bg-[var(--accent)]")} style={{ width: `${Math.round(w.pct * 100)}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-[12.5px] text-white/55">
        <span>
          {w.cur.runs} {w.cur.runs === 1 ? "trening" : "treningów"} · {fmtTime(w.sec)}
          {diff != null && w.prev.km ? <span className={diff >= 0 ? "text-emerald-300" : ""}> · {diff >= 0 ? "+" : ""}{pl(diff)} km do poprz.</span> : null}
        </span>
        <span className="flex items-center gap-1">
          <span className="mr-1 text-white/35">Cel</span>
          <button type="button" aria-label="Mniejszy cel" onClick={() => w.setGoal(Math.max(5, w.goal - 5))} className="grid size-7 place-items-center rounded-full bg-white/[0.07] active:scale-90">
            <Minus className="size-3.5" />
          </button>
          <button type="button" aria-label="Większy cel" onClick={() => w.setGoal(Math.min(300, w.goal + 5))} className="grid size-7 place-items-center rounded-full bg-white/[0.07] active:scale-90">
            <Plus className="size-3.5" />
          </button>
        </span>
      </div>
      {w.pct >= 1 ? <p className="mt-2 text-[12.5px] text-emerald-300">Cel tygodnia zrobiony. Reszta to bonus, nie obowiązek.</p> : null}
      {url ? (
        <a href={url} download="vyra-moj-tydzien.png" className="mt-3 block rounded-full bg-white/[0.08] py-2.5 text-center text-[13.5px] font-medium">
          Pobierz obrazek na Instagram
        </a>
      ) : null}
      {w.level.next ? (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-medium">
              Poziom {w.level.n}: {w.level.name}
            </span>
            <span className="text-white/45">
              jeszcze {pl(w.level.next.left)} km do: {w.level.next.name}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-white/60" style={{ width: `${Math.round(w.level.next.progress * 100)}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12.5px] font-medium">Poziom {w.level.n}: {w.level.name}</p>
      )}
    </Card>
  );
}
