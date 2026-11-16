"use client";

import { saveReadiness } from "@/lib/actions/readiness";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Sheet } from "@/components/app/sheet";
import { CountUp, ParticleRing } from "@/components/charts/particle-ring";
import { Card } from "@/components/app/ui";
import { readinessLevel } from "@/lib/readiness";
import { cn } from "@/lib/utils";
import { save } from "@/lib/app/store";

type Hour = { time: string; temp: number | null; wind: number | null; humidity: number | null; rain: number | null; symbol: string | null };
type Conditions = {
  hours: Hour[];
  air: { level: number; label: string; station: string; km: number } | null;
  sun: { today: { sunrise: string | null; sunset: string | null }; tomorrow: { sunrise: string | null; sunset: string | null } };
};
export type Place = { lat: number; lon: number; label: string };
type Check = { sleep: number; energy: number; soreness: number; pain: boolean };

export const CITIES: Place[] = [
  { label: "Warszawa", lat: 52.23, lon: 21.01 },
  { label: "Kraków", lat: 50.06, lon: 19.94 },
  { label: "Wrocław", lat: 51.11, lon: 17.03 },
  { label: "Poznań", lat: 52.41, lon: 16.93 },
  { label: "Gdańsk", lat: 54.35, lon: 18.65 },
  { label: "Łódź", lat: 51.76, lon: 19.46 },
  { label: "Katowice", lat: 50.26, lon: 19.02 },
  { label: "Lublin", lat: 51.25, lon: 22.57 },
  { label: "Szczecin", lat: 53.43, lon: 14.55 },
  { label: "Białystok", lat: 53.13, lon: 23.16 },
  { label: "Rzeszów", lat: 50.04, lon: 22.0 },
  { label: "Siedlce", lat: 52.17, lon: 22.29 },
];

const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    save(k, v);
  },
};

const dayKey = () => `vyra-ready-${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date())}`;
const hhmm = (iso: string) => new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(iso));

/** Wind chill (°C, wind in m/s), used below 10°C with some wind. */
function feels(t: number, w: number) {
  const v = w * 3.6;
  if (t > 10 || v < 4.8) return t;
  return 13.12 + 0.6215 * t - 11.37 * Math.pow(v, 0.16) + 0.3965 * t * Math.pow(v, 0.16);
}

function isDark(iso: string, c: Conditions) {
  const t = Date.parse(iso);
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date(iso));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  const s = d === today ? c.sun.today : c.sun.tomorrow;
  if (!s.sunrise || !s.sunset) return false;
  return t < Date.parse(s.sunrise) || t > Date.parse(s.sunset);
}

function hourScore(h: Hour, c: Conditions) {
  let s = 100;
  if (h.temp != null) s -= h.temp < 5 ? (5 - h.temp) * 3 : h.temp > 18 ? (h.temp - 18) * 4 : 0;
  if (h.rain != null) s -= h.rain >= 1 ? 55 : h.rain > 0.1 ? 30 : 0;
  if (h.wind != null && h.wind > 6) s -= (h.wind - 6) * 6;
  if (isDark(h.time, c)) s -= 20;
  return Math.max(0, Math.min(100, Math.round(s)));
}

function outfit(t: number, rain: boolean, wind: boolean, dark: boolean) {
  // Dress as if it were about 10°C warmer: you'll heat up after 10 minutes.
  const L: string[] = [];
  if (t >= 18) L.push("Koszulka i spodenki");
  else if (t >= 12) L.push("Koszulka, spodenki albo krótkie legginsy");
  else if (t >= 6) L.push("Koszulka z długim rękawem", "Spodenki albo cienkie legginsy");
  else if (t >= 0) L.push("Długi rękaw i lekka kurtka", "Długie legginsy", "Cienkie rękawiczki");
  else if (t >= -6) L.push("Bielizna termiczna i kurtka", "Długie legginsy", "Czapka i rękawiczki");
  else L.push("Termo, warstwa środkowa i kurtka", "Ocieplane legginsy", "Czapka, rękawiczki, komin na twarz");
  if (rain) L.push("Kurtka przeciwdeszczowa albo czapka z daszkiem");
  else if (wind && t < 12) L.push("Wiatrówka na wierzch");
  if (dark) L.push("Odblask albo czołówka");
  return L;
}

function Scale({ label, value, onChange, low, high }: { label: string; value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div>
      <p className="text-[13px] text-white/70">{label}</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn("h-11 rounded-xl text-[15px] font-medium transition active:scale-95", value === n ? "bg-white text-black" : "bg-white/[0.06] text-white/70")}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-white/35">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

/**
 * Home screen pieces. part="ready": the morning check as one compact card. part="weather": running conditions in one card
 * with details on tap. Both read the same saved answers and place, so they can sit apart on the screen.
 */
export function Today({ synced = null, athlete = false, part = "ready" }: { synced?: Check | null; athlete?: boolean; part?: "ready" | "weather" }) {
  const [more, setMore] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [cond, setCond] = useState<Conditions | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [sheet, setSheet] = useState<"check" | "place" | null>(null);
  const [draft, setDraft] = useState<Check>({ sleep: 3, energy: 3, soreness: 2, pain: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlace(store.get<Place>("vyra-place"));
    // Signed-in athletes share one morning check-in with the training platform.
    const local = store.get<Check>(dayKey());
    if (!local && synced) store.set(dayKey(), synced);
    // Answered here before the account knew about it: send it to the plan too.
    if (local && !synced && athlete) saveReadiness(local).catch(() => undefined);
    setCheck(local ?? synced);
    setReady(true);
  }, [synced, athlete]);

  useEffect(() => {
    if (!place || part !== "weather") return;
    setErr(null);
    fetch(`/api/app/conditions?lat=${place.lat}&lon=${place.lon}`)
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setCond(j)))
      .catch(() => setErr("Brak połączenia. Spróbuj za chwilę."));
  }, [place, part]);

  const choose = (p: Place) => {
    store.set("vyra-place", p);
    setPlace(p);
    setSheet(null);
  };
  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => choose({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Twoja okolica" }),
      () => setErr("Nie mamy dostępu do lokalizacji. Wybierz miasto z listy."),
      { maximumAge: 3600e3, timeout: 10000 },
    );
  };
  const save = () => {
    store.set(dayKey(), draft);
    setCheck(draft);
    setSheet(null);
    if (athlete) saveReadiness(draft).catch(() => undefined);
    try {
      navigator.vibrate?.([10, 40, 10]);
    } catch {
      /* no vibration */
    }
  };

  const level = check ? readinessLevel(check) : null;
  const score = check ? (check.pain ? 25 : Math.round(((check.sleep + check.energy + (6 - check.soreness) - 3) / 12) * 100)) : null;
  const advice =
    level === "good"
      ? { title: "Dobry dzień na trening", body: "Rób to, co masz w planie. Mocny trening? Dziś jest na to dobry moment.", tone: "good" as const }
      : level === "watch"
        ? { title: "Trenuj, ale spokojniej", body: "Zamień mocny trening na spokojny bieg albo skróć go o jedną trzecią.", tone: "quiet" as const }
        : level === "low"
          ? { title: "Dziś odpuść", body: check?.pain ? "Coś boli: zrób dzień przerwy albo spacer. Jeśli ból nie mija, skonsultuj się z fizjoterapeutą." : "Organizm prosi o odpoczynek. Spacer, rozciąganie i wcześniej spać.", tone: "accent" as const }
          : null;

  const view = useMemo(() => {
    if (!cond || !cond.hours.length) return null;
    const hours = cond.hours.slice(0, 12);
    const now = hours[0];
    const scored = hours.map((h) => ({ h, s: hourScore(h, cond) }));
    const best = scored.reduce((a, b) => (b.s > a.s ? b : a), scored[0]);
    const t = now.temp ?? 0;
    const f = Math.round(feels(t, now.wind ?? 0));
    const rainSoon = hours.slice(0, 3).some((h) => (h.rain ?? 0) > 0.1);
    const windy = (now.wind ?? 0) > 6;
    const dark = isDark(now.time, cond);
    return { hours: scored, best, f, t: Math.round(t), rainSoon, windy, dark, wear: outfit(f, rainSoon, windy, isDark(best.h.time, cond)) };
  }, [cond]);

  const sunset = cond?.sun.today.sunset;

  return (
    <div className="grid grid-cols-1">
      {part === "ready" ? (
        <button
          type="button"
          onClick={() => setSheet("check")}
          className={cn("flex w-full items-center gap-4 rounded-[22px] border p-3 pr-4 text-left transition active:scale-[0.985]", score == null ? "border-white/15 bg-white/[0.04]" : "border-white/[0.06] bg-[#111113]")}
        >
          <ParticleRing value={score} size={84}>
            {score != null ? <CountUp value={score} className="text-[24px] font-light leading-none tabular-nums" /> : <span className="text-[22px] font-light text-white/40">?</span>}
          </ParticleRing>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] text-white/45">Gotowość na dziś</span>
            {advice ? (
              <>
                <span className={cn("mt-0.5 block text-[16px] font-semibold leading-snug", advice.tone === "accent" && "text-[#ff6a6f]", advice.tone === "quiet" && "text-amber-200")}>{advice.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-white/50">{advice.body}</span>
              </>
            ) : ready ? (
              <>
                <span className="mt-0.5 block text-[16px] font-semibold leading-snug">Jak się dziś czujesz?</span>
                <span className="mt-0.5 block text-[12.5px] text-white/50">4 pytania, 20 sekund. Dopasujemy trening.</span>
              </>
            ) : null}
          </span>
          {score == null && ready ? <span className="app-pulse-ring shrink-0 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black">Start</span> : null}
        </button>
      ) : null}

      {part === "weather" ? (
        !place ? (
          <Card className="p-4">
            <p className="text-[15px] font-medium">Kiedy dziś biec i co założyć</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/50">Pogoda, smog i najlepsza pora. Lokalizacji nie zapisujemy na serwerze.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={locate} className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-[13px] font-semibold text-black active:scale-[0.97]">
                <LocateFixed className="size-4" /> Moja okolica
              </button>
              <button type="button" onClick={() => setSheet("place")} className="rounded-full bg-white/[0.07] py-2.5 text-[13px] font-medium active:scale-[0.97]">
                Wybierz miasto
              </button>
            </div>
          </Card>
        ) : err ? (
          <Card className="p-4 text-[13px] text-white/60">{err}</Card>
        ) : !view ? (
          <div className="h-[104px] animate-pulse rounded-[20px] bg-white/[0.04]" />
        ) : (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] text-white/45">Najlepiej biec o</p>
                <p className="mt-0.5 text-[30px] font-light leading-none tabular-nums">{hhmm(view.best.h.time)}</p>
              </div>
              <div className="text-right text-[12.5px] leading-relaxed text-white/60">
                <p>
                  <span className="text-white">{view.f}°</span> odczuwalna
                </p>
                <p className={cn(cond?.air && cond.air.level >= 3 && "text-[#ff6a6f]")}>Powietrze: {cond?.air ? cond.air.label.toLowerCase() : "brak danych"}</p>
                <button type="button" onClick={() => setSheet("place")} className="flex items-center justify-end gap-1 text-white/40">
                  <MapPin className="size-3" /> {place.label}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {view.wear.map((w) => (
                <span key={w} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] text-white/75">
                  {w}
                </span>
              ))}
            </div>
            {more ? (
              <>
                <div className="mt-4 flex h-12 items-end gap-[3px]">
                  {view.hours.map(({ h, s }) => (
                    <span key={h.time} className={cn("app-bar-grow flex-1 rounded-[3px]", h === view.best.h ? "bg-[var(--accent)]" : isDark(h.time, cond!) ? "bg-white/15" : "bg-white/40")} style={{ height: `${Math.max(8, s * 0.4)}px` }} />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10.5px] text-white/35">
                  <span>{hhmm(view.hours[0].h.time)}</span>
                  <span>{sunset ? `zachód ${hhmm(sunset)}` : ""}</span>
                  <span>{hhmm(view.hours[view.hours.length - 1].h.time)}</span>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">
                  {view.best.h.temp != null ? `${Math.round(view.best.h.temp)}°C` : ""}
                  {(view.best.h.rain ?? 0) > 0.1 ? ", możliwy deszcz" : ", bez deszczu"}
                  {view.best.h.wind != null ? `, wiatr ${Math.round(view.best.h.wind)} m/s` : ""}
                  {cond?.air && cond.air.level >= 4 ? ". Powietrze jest złe: lepiej bieżnia albo krótki, spokojny bieg." : cond?.air && cond.air.level === 3 ? ". Powietrze dostateczne: odpuść mocny trening na zewnątrz." : "."} Ubieraj się tak, jakby było o 10°C cieplej.
                </p>
                <p className="mt-2 text-[10.5px] text-white/30">Pogoda: MET Norway. Powietrze: GIOŚ.</p>
              </>
            ) : null}
            <button type="button" onClick={() => setMore(!more)} className="mt-3 text-[12px] text-white/45">
              {more ? "Mniej" : "Pogoda godzina po godzinie"}
            </button>
          </Card>
        )
      ) : null}

      {/* Sheets */}
      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet === "check" ? "Jak się dziś czujesz?" : "Gdzie biegasz?"}>
            {sheet === "check" ? (
              <div className="grid gap-5">
                <Scale label="Sen tej nocy" value={draft.sleep} onChange={(v) => setDraft({ ...draft, sleep: v })} low="fatalnie" high="świetnie" />
                <Scale label="Energia" value={draft.energy} onChange={(v) => setDraft({ ...draft, energy: v })} low="brak" high="pełna" />
                <Scale label="Zakwasy, zmęczenie nóg" value={draft.soreness} onChange={(v) => setDraft({ ...draft, soreness: v })} low="brak" high="bardzo" />
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, pain: !draft.pain })}
                  className={cn("flex items-center justify-between rounded-2xl px-4 py-3.5 text-[14px]", draft.pain ? "bg-[var(--accent)]/15 text-white" : "bg-white/[0.06] text-white/70")}
                >
                  Coś mnie boli (nie zakwasy)
                  <span className={cn("h-6 w-10 rounded-full p-0.5 transition", draft.pain ? "bg-[var(--accent)]" : "bg-white/15")}>
                    <span className={cn("block size-5 rounded-full bg-white transition", draft.pain && "translate-x-4")} />
                  </span>
                </button>
                <button type="button" onClick={save} className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98]">
                  Zapisz
                </button>
                <p className="text-center text-[11px] text-white/35">Odpowiedzi zostają na Twoim telefonie.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                <button type="button" onClick={locate} className="flex items-center justify-center gap-2 rounded-full bg-white py-3 text-[14px] font-semibold text-black">
                  <LocateFixed className="size-4" /> Użyj mojej lokalizacji
                </button>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {CITIES.map((c) => (
                    <button key={c.label} type="button" onClick={() => choose(c)} className={cn("rounded-xl py-2.5 text-[13px]", place?.label === c.label ? "bg-white text-black" : "bg-white/[0.06] text-white/75")}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
      </Sheet>
    </div>
  );
}
