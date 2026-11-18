"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Flame, Trash2, UserPlus } from "lucide-react";
import { addFriend, friendsBoard, publishStats, removeFriend, type BoardRow, type Stats } from "@/lib/actions/friends";
import { weekStreak } from "@/lib/app/badges";
import { useLog, type Run } from "@/lib/app/log";
import { todayWaw } from "@/lib/app/store";
import { Seg } from "@/components/app/tools";
import { Card } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
  return d.toISOString().slice(0, 10);
};

export function statsOf(log: Run[], today: string): Stats {
  const weekStart = mondayOf(today);
  const month = today.slice(0, 7);
  const week = log.filter((r) => r.day >= weekStart);
  return {
    weekStart,
    weekKm: week.reduce((s, r) => s + r.km, 0),
    weekRuns: week.length,
    month,
    monthKm: log.filter((r) => r.day.slice(0, 7) === month).reduce((s, r) => s + r.km, 0),
    totalKm: log.reduce((s, r) => s + r.km, 0),
    streak: weekStreak(log, today),
  };
}

/** Keeps my numbers in the friends' ranking current. Lives in the app layout for signed-in runners. */
export function StatsPublisher({ signedIn }: { signedIn: boolean }) {
  const log = useLog();
  const key = useMemo(() => {
    const s = statsOf(log, todayWaw());
    return `${s.weekStart}|${s.weekKm.toFixed(1)}|${s.weekRuns}|${s.monthKm.toFixed(1)}|${s.totalKm.toFixed(0)}|${s.streak}`;
  }, [log]);
  useEffect(() => {
    if (!signedIn) return;
    const t = setTimeout(() => {
      let last = "";
      try {
        last = sessionStorage.getItem("vyra-stats-sent") ?? "";
      } catch {
        /* none */
      }
      if (last === key) return;
      publishStats(statsOf(log, todayWaw()))
        .then((code) => {
          if (code) sessionStorage.setItem("vyra-stats-sent", key);
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearTimeout(t);
    // key covers the log
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, signedIn]);
  return null;
}

export function FriendsView({ signedIn }: { signedIn: boolean }) {
  const log = useLog();
  const [code, setCode] = useState<string | null>(null);
  const [rows, setRows] = useState<BoardRow[] | null | undefined>(undefined);
  const [tab, setTab] = useState("week");
  const [input, setInput] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const today = todayWaw();

  const refresh = useCallback(async () => {
    const s = statsOf(log, today);
    const c = await publishStats(s).catch(() => null);
    setCode(c);
    setRows(c ? await friendsBoard(s.weekStart, s.month).catch(() => null) : null);
  }, [log, today]);

  useEffect(() => {
    if (!signedIn) return;
    const q = new URLSearchParams(window.location.search).get("kod");
    if (q) setInput(q.toUpperCase().slice(0, 6));
    void refresh();
    // on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  if (!signedIn)
    return (
      <Card className="p-5 text-center">
        <p className="text-[17px] font-semibold">Biegaj ze znajomymi</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">Załóż darmowe konto, podaj znajomym swój kod i porównujcie kilometry z tygodnia i miesiąca.</p>
        <Link href="/app/konto?next=/app/znajomi" className="mt-4 inline-block rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black active:scale-[0.98]">
          Załóż darmowe konto
        </Link>
      </Card>
    );
  if (rows === undefined) return <div className="h-60" />;
  if (rows === null || !code)
    return (
      <Card className="p-5 text-center">
        <p className="text-[15px] font-medium">Znajomi ruszą za chwilę</p>
        <p className="mt-1 text-[13px] text-white/50">Ta funkcja jest właśnie włączana. Zajrzyj tu później.</p>
      </Card>
    );

  const link = `https://vyraathl.pl/app/znajomi?kod=${code}`;
  const val = (r: BoardRow) => (tab === "week" ? r.week_km : tab === "month" ? r.month_km : r.total_km);
  const sorted = [...rows].sort((a, b) => val(b) - val(a));
  const top = Math.max(1, ...sorted.map(val));
  const add = () =>
    start(async () => {
      const r = await addFriend(input);
      setNote(r.ok ? `Dodano: ${r.name}. Widzicie się nawzajem w rankingu.` : r.error);
      if (r.ok) {
        setInput("");
        await refresh();
      }
    });

  return (
    <div className="grid gap-3">
      <Card className="p-4">
        <p className="text-[12px] text-white/45">Twój kod znajomego</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-[34px] font-light leading-none tracking-[0.12em] tabular-nums">{code}</p>
          <button
            type="button"
            onClick={() => {
              const done = () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              };
              const share = (navigator as Navigator & { share?: (d: { text: string; url: string }) => Promise<void> }).share;
              if (share) share.call(navigator, { text: "Dodaj mnie w VYRA i porównajmy kilometry:", url: link }).catch(() => undefined);
              else navigator.clipboard?.writeText(link).then(done).catch(() => undefined);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-semibold text-black active:scale-95"
          >
            <Copy className="size-4" /> {copied ? "Skopiowano" : "Wyślij znajomemu"}
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-white/40">Kto doda Twój kod, zobaczy Twoje imię, kilometry z tygodnia i miesiąca oraz serię. Treningi zobaczy w Ekipie tylko wtedy, gdy włączysz udostępnianie.</p>
      </Card>

      <Card className="p-4">
        <p className="text-[12px] text-white/45">Dodaj znajomego</p>
        <div className="mt-2 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="KOD" autoCapitalize="characters" className="h-12 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[18px] tracking-[0.2em] outline-none focus:border-white/30" />
          <button type="button" disabled={pending || input.length !== 6} onClick={add} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-[14px] font-semibold text-white active:scale-95 disabled:opacity-40">
            <UserPlus className="size-4" /> Dodaj
          </button>
        </div>
        {note ? <p className="mt-2 text-[12.5px] text-white/60">{note}</p> : null}
      </Card>

      <Seg
        value={tab}
        onChange={setTab}
        opts={[
          { k: "week", label: "Ten tydzień" },
          { k: "month", label: "Ten miesiąc" },
          { k: "all", label: "Razem" },
        ]}
      />
      <div className="divide-y divide-white/[0.05] overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]">
        {sorted.map((r, i) => (
          <div key={r.user_id} className={cn("relative flex items-center gap-3 px-4 py-3.5", r.me && "bg-white/[0.04]")}>
            <div aria-hidden className="absolute inset-y-0 left-0 bg-white/[0.035]" style={{ width: `${(val(r) / top) * 100}%` }} />
            <span className={cn("relative w-6 text-center text-[14px] tabular-nums", i === 0 ? "font-semibold text-amber-300" : "text-white/45")}>{i + 1}</span>
            <span className="relative min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">
                {r.name || "Biegacz"} {r.me ? <span className="text-[12px] font-normal text-white/40">(Ty)</span> : null}
              </span>
              <span className="flex items-center gap-2 text-[12px] text-white/45">
                {tab === "week" ? `${r.week_runs} ${r.week_runs === 1 ? "bieg" : "biegów"}` : null}
                {r.streak >= 2 ? (
                  <span className="flex items-center gap-0.5 text-[var(--accent)]">
                    <Flame className="size-3" /> {r.streak} tyg.
                  </span>
                ) : null}
              </span>
            </span>
            <span className="relative text-[17px] font-medium tabular-nums">
              {val(r).toFixed(1).replace(".", ",")} <span className="text-[12px] font-normal text-white/45">km</span>
            </span>
            {r.me ? null : (
              <button
                type="button"
                aria-label={`Usuń ${r.name}`}
                onClick={() => start(async () => {
                  await removeFriend(r.user_id);
                  await refresh();
                })}
                className="relative grid size-8 place-items-center rounded-full text-white/25 active:bg-white/10"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {rows.length <= 1 ? <p className="px-2 text-center text-[13px] leading-relaxed text-white/45">Na razie jesteś tu sam. Wyślij kod komuś, z kim biegasz: ranking ruszy, gdy doda Cię pierwsza osoba.</p> : null}
    </div>
  );
}
