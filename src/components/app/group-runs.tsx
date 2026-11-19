"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Clock, Flag, MapPin, Plus, ShieldCheck, Users, X } from "lucide-react";
import {
  acceptGroupRunTerms,
  cancelGroupRun,
  createGroupRun,
  groupRunPeople,
  groupRuns,
  joinGroupRun,
  leaveGroupRun,
  reportGroupRun,
  type GroupRun,
  type GroupRunInput,
} from "@/lib/actions/group-runs";
import { load, save } from "@/lib/app/store";
import { cn } from "@/lib/utils";

const CITIES = ["Warszawa", "Kraków", "Wrocław", "Poznań", "Gdańsk", "Łódź", "Lublin", "Siedlce"];
const LEVEL = { easy: "Spokojnie", steady: "Średnio", fast: "Szybko" } as const;
const LEVEL_TONE = { easy: "bg-[#6ee7a1]/15 text-[#6ee7a1]", steady: "bg-[#fbbf24]/15 text-[#fbbf24]", fast: "bg-[#ff5a60]/15 text-[#ff8a8f]" } as const;
const card = "rounded-[22px] border border-white/[0.06] bg-[#111113]";
const when = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** The rules everyone accepts once, before posting or joining. */
function Terms({ onDone }: { onDone: () => void }) {
  const [adult, setAdult] = useState(false);
  const [rules, setRules] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className={cn(card, "p-5")}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#e5343b]/15 text-[#ff8a8f]">
          <ShieldCheck className="size-5" />
        </span>
        <h2 className="text-[19px] font-semibold leading-tight">Zanim dołączysz: zasady</h2>
      </div>
      <ul className="mt-4 grid gap-2.5 text-[15px] leading-relaxed text-white/80">
        <li>• VYRA tylko pokazuje ogłoszenia biegaczy. Nie organizuje tych biegów, nie sprawdza uczestników i nie prowadzi ich.</li>
        <li>• Biegasz na własną odpowiedzialność. Za swoje zdrowie, bezpieczeństwo i rzeczy odpowiadasz sam.</li>
        <li>• Umawiaj się tylko w publicznych, oświetlonych miejscach. Nie podawaj adresu domowego.</li>
        <li>• Coś jest nie tak? Zgłoś ogłoszenie przyciskiem „Zgłoś”. W zagrożeniu dzwoń pod 112.</li>
      </ul>
      <Link href="/app/wspolne-biegi/zasady" className="mt-3 inline-block text-[14px] font-medium text-[#ff8a8f] underline underline-offset-2">
        Pełne zasady wspólnych biegów
      </Link>
      <label className="mt-5 flex items-start gap-3 text-[15px]">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 size-5 accent-[#e5343b]" />
        Mam ukończone 18 lat.
      </label>
      <label className="mt-3 flex items-start gap-3 text-[15px]">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-0.5 size-5 accent-[#e5343b]" />
        Akceptuję zasady i rozumiem, że VYRA nie jest organizatorem wspólnych biegów i nie odpowiada za nie.
      </label>
      {err ? <p className="mt-3 text-[14px] text-[#ff8a8f]">{err}</p> : null}
      <button
        type="button"
        disabled={!adult || !rules || pending}
        onClick={() =>
          start(async () => {
            const r = await acceptGroupRunTerms(adult);
            if (r.ok) onDone();
            else setErr(r.error);
          })
        }
        className="mt-5 h-12 w-full rounded-full bg-white text-[16px] font-semibold text-black disabled:opacity-30"
      >
        Akceptuję i przechodzę dalej
      </button>
    </section>
  );
}

function NewRun({ city, onClose, onSaved }: { city: string; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<GroupRunInput>({ city, place: "", when: "", distance: "5", pace: "", level: "easy", note: "", max: "8" });
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof GroupRunInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const input = "mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[16px] outline-none";
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#0c0c0e] p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold">Twój bieg</h2>
          <button type="button" aria-label="Zamknij" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/[0.07]">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="text-[14px] text-white/70">
            Miasto
            <input className={input} value={v.city} onChange={set("city")} placeholder="np. Siedlce" />
          </label>
          <label className="text-[14px] text-white/70">
            Miejsce zbiórki
            <input className={input} value={v.place} onChange={set("place")} placeholder="np. Park Aleksandria, przy łosiu" />
            <span className="mt-1.5 block text-[13px] text-white/45">Publiczne, oświetlone miejsce. Nigdy adres domowy.</span>
          </label>
          <label className="text-[14px] text-white/70">
            Dzień i godzina
            <input type="datetime-local" className={input} value={v.when} onChange={set("when")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[14px] text-white/70">
              Dystans (km)
              <input inputMode="decimal" className={input} value={v.distance} onChange={set("distance")} />
            </label>
            <label className="text-[14px] text-white/70">
              Tempo
              <input className={input} value={v.pace} onChange={set("pace")} placeholder="np. 6:00/km" />
            </label>
          </div>
          <div>
            <p className="text-[14px] text-white/70">Charakter</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(Object.keys(LEVEL) as (keyof typeof LEVEL)[]).map((k) => (
                <button key={k} type="button" onClick={() => setV({ ...v, level: k })} className={cn("h-11 rounded-full text-[14.5px] font-medium", v.level === k ? "bg-white text-black" : "bg-white/[0.06] text-white/75")}>
                  {LEVEL[k]}
                </button>
              ))}
            </div>
          </div>
          <label className="text-[14px] text-white/70">
            Ile osób maksymalnie (razem z Tobą)
            <input inputMode="numeric" className={input} value={v.max} onChange={set("max")} />
          </label>
          <label className="text-[14px] text-white/70">
            Dodatkowe info (opcjonalnie)
            <textarea className={cn(input, "h-24 py-3")} value={v.note} onChange={set("note")} maxLength={300} placeholder="np. biegniemy pętlę 2,5 km dwa razy, czekamy na wszystkich" />
          </label>
          {err ? <p className="text-[14px] text-[#ff8a8f]">{err}</p> : null}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await createGroupRun(v);
                if (r.ok) onSaved();
                else setErr(r.error);
              })
            }
            className="h-13 h-[52px] rounded-full bg-[#e5343b] text-[16px] font-semibold text-white disabled:opacity-50"
          >
            Opublikuj bieg
          </button>
        </div>
      </div>
    </div>
  );
}

function RunCard({ r, terms, needTerms, refresh }: { r: GroupRun; terms: boolean; needTerms: () => void; refresh: () => void }) {
  const [pending, start] = useTransition();
  const [names, setNames] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const full = r.people >= r.max_people;
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const x = await fn();
      if (!x.ok) setErr(x.error ?? "Nie udało się.");
      else refresh();
    });
  return (
    <article className={cn(card, "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold capitalize text-[#ff8a8f]">{when(r.starts_at)}</p>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold", LEVEL_TONE[r.level])}>{LEVEL[r.level]}</span>
      </div>
      <p className="mt-1.5 flex items-start gap-1.5 text-[17px] font-semibold leading-snug">
        <MapPin className="mt-0.5 size-4 shrink-0 text-white/50" /> {r.place}, {r.city}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-white/65">
        {r.distance_km ? <span>{String(r.distance_km).replace(".", ",")} km</span> : null}
        {r.pace ? <span className="flex items-center gap-1"><Clock className="size-3.5" /> {r.pace}</span> : null}
        <span className="flex items-center gap-1">
          <Users className="size-3.5" /> {r.people}/{r.max_people}
        </span>
        <span>prowadzi: {r.mine ? "Ty" : r.host}</span>
      </div>
      {r.note ? <p className="mt-2 text-[14px] leading-relaxed text-white/60">{r.note}</p> : null}
      {names ? <p className="mt-2 text-[13.5px] text-white/60">Idą: {names.join(", ")}</p> : null}
      {err ? <p className="mt-2 text-[13.5px] text-[#ff8a8f]">{err}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {r.mine ? (
          <button type="button" disabled={pending} onClick={() => confirm("Odwołać ten bieg? Uczestnicy zobaczą, że go nie ma.") && act(() => cancelGroupRun(r.id))} className="h-10 rounded-full bg-white/[0.07] px-4 text-[14px]">
            Odwołaj bieg
          </button>
        ) : r.joined ? (
          <button type="button" disabled={pending} onClick={() => act(() => leaveGroupRun(r.id))} className="h-10 rounded-full bg-white/[0.07] px-4 text-[14px]">
            Jednak nie idę
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || full}
            onClick={() => (terms ? act(() => joinGroupRun(r.id)) : needTerms())}
            className="h-10 rounded-full bg-white px-5 text-[14px] font-semibold text-black disabled:opacity-40"
          >
            {full ? "Brak miejsc" : "Dołączam"}
          </button>
        )}
        {r.joined || r.mine ? (
          <button type="button" onClick={async () => setNames(await groupRunPeople(r.id))} className="h-10 rounded-full bg-white/[0.07] px-4 text-[14px]">
            Kto idzie?
          </button>
        ) : null}
        {!r.mine ? (
          <button
            type="button"
            onClick={() => {
              const why = prompt("Co jest nie tak z tym ogłoszeniem?");
              if (why) act(() => reportGroupRun(r.id, why));
            }}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] text-white/45"
          >
            <Flag className="size-3.5" /> Zgłoś
          </button>
        ) : null}
      </div>
    </article>
  );
}

/** Find a running crew nearby, or post your own run for others to join. */
export function GroupRuns() {
  const [city, setCity] = useState("");
  const [data, setData] = useState<{ runs: GroupRun[]; terms: boolean } | null | undefined>(undefined);
  const [showTerms, setShowTerms] = useState(false);
  const [adding, setAdding] = useState(false);

  const refresh = async (c = city) => setData(await groupRuns(c.trim() || null));
  useEffect(() => {
    const place = load<{ label?: string } | null>("vyra-place", null)?.label ?? "";
    const saved = load<string>("vyra-runs-city", "") || (place && !/okolica/i.test(place) ? place : "");
    setCity(saved);
    void refresh(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pick = (c: string) => {
    setCity(c);
    save("vyra-runs-city", c);
    void refresh(c);
  };

  if (data === undefined) return <p className="py-10 text-center text-[14px] text-white/45">Ładuję biegi…</p>;
  if (data === null)
    return (
      <section className={cn(card, "p-5 text-[15px] text-white/70")}>
        Wspólne biegi ruszają za chwilę. Zaloguj się, żeby zobaczyć biegi w swojej okolicy.
      </section>
    );

  return (
    <div className="grid gap-4">
      {showTerms || (!data.terms && adding) ? (
        <Terms
          onDone={() => {
            setShowTerms(false);
            void refresh();
          }}
        />
      ) : null}

      <div className="app-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" onClick={() => pick("")} className={cn("h-10 shrink-0 rounded-full px-4 text-[14px]", !city ? "bg-white font-semibold text-black" : "bg-white/[0.07] text-white/75")}>
          Wszędzie
        </button>
        {[...new Set([city, ...CITIES].filter(Boolean))].map((c) => (
          <button key={c} type="button" onClick={() => pick(c)} className={cn("h-10 shrink-0 rounded-full px-4 text-[14px]", city === c ? "bg-white font-semibold text-black" : "bg-white/[0.07] text-white/75")}>
            {c}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => (data.terms ? setAdding(true) : setShowTerms(true))}
        className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#e5343b] text-[16px] font-semibold text-white active:scale-[0.99]"
      >
        <Plus className="size-5" /> Dodaj swój bieg
      </button>

      {data.runs.length ? (
        data.runs.map((r) => <RunCard key={r.id} r={r} terms={data.terms} needTerms={() => setShowTerms(true)} refresh={() => void refresh()} />)
      ) : (
        <section className={cn(card, "p-5")}>
          <p className="text-[16px] font-semibold">{city ? `W tej chwili nikt nie biega w: ${city}` : "Na razie brak zaplanowanych biegów"}</p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/60">Bądź pierwszy: dodaj swój bieg, a inni z okolicy będą mogli dołączyć.</p>
        </section>
      )}

      {adding && data.terms ? (
        <NewRun
          city={city}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
