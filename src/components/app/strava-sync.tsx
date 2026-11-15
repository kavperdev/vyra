"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Run } from "@/components/app/run-log";
import { cn } from "@/lib/utils";

const LAST = "vyra-strava-sync";
type SRun = { id: string; day: string; km: number; sec: number; name: string; hr: number | null; rpe: number | null };

const msg: Record<string, string> = {
  ok: "Połączono ze Stravą. Pobieram biegi…",
  denied: "Nie udzielono dostępu w Stravie.",
  scope: "Zaznacz w Stravie zgodę na odczyt aktywności i spróbuj jeszcze raz.",
  error: "Nie udało się połączyć ze Stravą. Spróbuj ponownie.",
  off: "Import ze Stravy jeszcze nie działa. Spróbuj później.",
};

/** Merge Strava runs into the phone log; skips runs already there (same id, or a GPS/manual run that day of the same distance). */
export function mergeStrava(log: Run[], runs: SRun[]): { next: Run[]; added: number } {
  const ids = new Set(log.map((r) => r.id));
  const add: Run[] = [];
  for (const s of runs) {
    if (ids.has(s.id)) continue;
    if (log.some((r) => r.day === s.day && Math.abs(r.km - s.km) <= Math.max(0.3, s.km * 0.04))) continue;
    add.push({ id: s.id, day: s.day, km: s.km, sec: s.sec, rpe: s.rpe ?? 0, note: ["Strava", s.name, s.hr ? `śr. tętno ${s.hr}` : ""].filter(Boolean).join(" · ") });
  }
  return { next: [...add, ...log].sort((a, b) => (a.day < b.day ? 1 : -1)), added: add.length };
}

export function StravaSync({ getLog, onImport }: { getLog: () => Run[]; onImport: (next: Run[]) => void }) {
  const [st, setSt] = useState<{ available: boolean; connected: boolean; name?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const once = useRef({ done: false });

  const sync = useCallback(
    async (force: boolean) => {
      let last = 0;
      try {
        last = Number(localStorage.getItem(LAST)) || 0;
      } catch {
        /* private mode */
      }
      if (!force && Date.now() - last < 60 * 60 * 1000) return;
      setBusy(true);
      try {
        const after = last ? Math.floor(last / 1000) - 3 * 86400 : 0;
        const res = await fetch(`/api/strava/activities${after ? `?after=${after}` : ""}`, { cache: "no-store" });
        const j = (await res.json()) as { connected: boolean; runs?: SRun[]; error?: string };
        if (!j.connected) {
          setSt((s) => (s ? { ...s, connected: false } : s));
          return;
        }
        const { next, added } = mergeStrava(getLog(), j.runs ?? []);
        if (added) onImport(next);
        setNote(j.error === "limit" ? "Strava chwilowo ogranicza pobieranie. Spróbuj za kwadrans." : added ? `Dodano ${added} ${added === 1 ? "bieg" : added < 5 ? "biegi" : "biegów"} ze Stravy.` : force ? "Wszystko aktualne." : null);
        if (!j.error) localStorage.setItem(LAST, String(Date.now()));
      } catch {
        setNote("Brak połączenia. Spróbuj później.");
      } finally {
        setBusy(false);
      }
    },
    [getLog, onImport],
  );

  useEffect(() => {
    if (once.current.done) return;
    once.current.done = true;
    const q = new URLSearchParams(window.location.search).get("strava");
    if (q && msg[q]) setNote(msg[q]);
    if (q) window.history.replaceState(null, "", window.location.pathname);
    fetch("/api/strava/activities?status=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setSt(j);
        if (j.connected) void sync(q === "ok");
      })
      .catch(() => setSt(null));
  }, [sync]);

  const disconnect = async () => {
    setBusy(true);
    await fetch("/api/strava/disconnect", { method: "POST" }).catch(() => null);
    try {
      localStorage.removeItem(LAST);
    } catch {
      /* private mode */
    }
    setSt((s) => (s ? { ...s, connected: false } : s));
    setNote("Odłączono Stravę. Zaimportowane biegi zostają w dzienniku.");
    setBusy(false);
  };

  if (!st?.available) return note ? <p className="px-2 text-center text-[12.5px] text-white/50">{note}</p> : null;

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
      {st.connected ? (
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FC4C02] text-[15px] font-bold text-white">S</span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Strava połączona{st.name ? `: ${st.name}` : ""}</p>
            <p className="mt-0.5 text-[12px] text-white/45">Biegi pobierają się same po otwarciu dziennika</p>
          </div>
          <button type="button" aria-label="Synchronizuj" disabled={busy} onClick={() => sync(true)} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.07] active:scale-90 disabled:opacity-50">
            <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          </button>
        </div>
      ) : (
        <div>
          <p className="text-[15px] font-medium">Biegasz z zegarkiem?</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/50">Połącz Stravę, a biegi z Garmina, Coros, Suunto czy Apple Watch same trafią do dziennika.</p>
          <a href="/api/strava/connect" className="mt-3 flex h-12 items-center justify-center rounded-full bg-[#FC4C02] text-[15px] font-semibold text-white active:scale-[0.98]">
            Połącz ze Stravą
          </a>
        </div>
      )}
      {note ? <p className="mt-3 text-[12.5px] text-white/60">{note}</p> : null}
      {st.connected ? (
        <div className="mt-3 flex items-center justify-between text-[11.5px] text-white/35">
          <span>Powered by Strava</span>
          <button type="button" onClick={disconnect} disabled={busy} className="underline-offset-2 active:underline">
            Odłącz
          </button>
        </div>
      ) : null}
    </div>
  );
}
