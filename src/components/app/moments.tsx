"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bike, Dumbbell, EyeOff, Flame, Footprints, Lock, MessageCircle, Mountain, PersonStanding, Snowflake, Trash2, Users, Waves } from "lucide-react";
import { addComment, comments as loadComments, deleteComment, momentsFeed, react, shareMoments, unshareMoment, type Comment, type Moment, type ShareInput } from "@/lib/actions/moments";
import { sportName, useActivities, type Run, type Sport } from "@/lib/app/log";
import { load, save, todayWaw } from "@/lib/app/store";
import { fmtPace } from "@/lib/method/engine";
import { Card } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const ICON: Record<string, typeof Footprints> = { run: Footprints, bike: Bike, swim: Waves, gym: Dumbbell, walk: Mountain, mobility: PersonStanding, ski: Snowflake, team: Users, other: Activity };
const SHARE_KEY = "vyra-share";
const SENT_KEY = "vyra-share-sent";
type ShareSet = { on: boolean; asked?: boolean };
const AVATAR = ["#ff5a60", "#7c8cff", "#34d399", "#fbbf24", "#38bdf8", "#f472b6"];
const tone = (id: string) => AVATAR[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];

/** What a friend sees of one diary entry: sport, distance, time, and the plan's title. Never notes, pain or readiness. */
function toShare(r: Run, visibility: "friends" | "me"): ShareInput {
  return { runId: r.id, day: r.day, sport: r.sport ?? "run", km: r.km, sec: r.sec ?? 0, title: r.auto && r.note ? r.note.slice(0, 80) : null, visibility };
}
const sig = (s: ShareInput) => `${s.day}|${s.sport}|${s.km}|${s.sec}|${s.title ?? ""}|${s.visibility}`;
const since = () => new Date(Date.parse(`${todayWaw()}T12:00:00Z`) - 14 * 864e5).toISOString().slice(0, 10);

/** Keeps my shared trainings in step with the diary. Lives in the app layout; does nothing until sharing is switched on. */
export function ShareSync({ signedIn }: { signedIn: boolean }) {
  const all = useActivities();
  useEffect(() => {
    if (!signedIn) return;
    const set = load<ShareSet>(SHARE_KEY, { on: false });
    const sent = load<Record<string, string>>(SENT_KEY, {});
    if (!set.on && !Object.keys(sent).length) return;
    const t = setTimeout(async () => {
      const from = since();
      const vis = set.on ? "friends" : "me";
      const want = all.filter((r) => r.day >= from).map((r) => toShare(r, vis));
      const todo = want.filter((s) => sent[s.runId] !== sig(s));
      const gone = Object.keys(sent).filter((id) => !all.some((r) => r.id === id));
      if (!todo.length && !gone.length) return;
      const n = todo.length ? await shareMoments(todo).catch(() => 0) : 0;
      const next = { ...sent };
      todo.slice(0, n).forEach((s) => (next[s.runId] = sig(s)));
      for (const id of gone) if (await unshareMoment(id).catch(() => false)) delete next[id];
      save(SENT_KEY, next);
    }, 3000);
    return () => clearTimeout(t);
  }, [all, signedIn]);
  return null;
}

function ago(day: string) {
  const d = Math.round((Date.parse(`${todayWaw()}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 864e5);
  if (d <= 0) return "dziś";
  if (d === 1) return "wczoraj";
  if (d < 7) return new Intl.DateTimeFormat("pl-PL", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")} h` : `${Math.round(s / 60)} min`);

/** Ekipa: what my friends trained, with 🔥 / 🙌 and comments. */
export function MomentsFeed({ signedIn, onAddFriends }: { signedIn: boolean; onAddFriends: () => void }) {
  const [feed, setFeed] = useState<Moment[] | null | undefined>(undefined);
  const [set, setSet] = useState<ShareSet>({ on: false });
  const all = useActivities();
  const refresh = useCallback(async () => setFeed(await momentsFeed().catch(() => null)), []);
  useEffect(() => {
    setSet(load<ShareSet>(SHARE_KEY, { on: false }));
    if (signedIn) refresh();
  }, [signedIn, refresh]);

  const toggleShare = async (on: boolean) => {
    const next = { on, asked: true };
    setSet(next);
    save(SHARE_KEY, next);
    // switch everything from the last 14 days at once, so turning it off hides it straight away
    const items = all.filter((r) => r.day >= since()).map((r) => toShare(r, on ? "friends" : "me"));
    const n = items.length ? await shareMoments(items).catch(() => 0) : 0;
    const sent = load<Record<string, string>>(SENT_KEY, {});
    items.slice(0, n).forEach((s) => (sent[s.runId] = sig(s)));
    save(SENT_KEY, sent);
    refresh();
  };

  const mine = useMemo(() => (feed ?? []).filter((m) => m.me), [feed]);
  const friends = useMemo(() => (feed ?? []).filter((m) => !m.me), [feed]);

  if (!signedIn)
    return (
      <Card className="p-5 text-center">
        <p className="text-[17px] font-semibold">Ekipa</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">Zobacz, co biegają znajomi, daj im 🔥 i napisz słowo po mocnym treningu. Załóż darmowe konto.</p>
        <Link href="/login?next=/app/znajomi" className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-black">
          Zaloguj się
        </Link>
      </Card>
    );
  if (feed === null)
    return (
      <Card className="p-5 text-center">
        <p className="text-[15px] font-medium">Ekipa rusza za chwilę</p>
        <p className="mt-1 text-[13px] text-white/50">Ta funkcja jest właśnie włączana. Zajrzyj tu później.</p>
      </Card>
    );

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <ShareCard on={set.on} onChange={toggleShare} count={mine.filter((m) => m.visibility === "friends").length} />

      {feed === undefined ? (
        [0, 1].map((i) => <div key={i} className="h-44 animate-pulse rounded-[24px] bg-white/[0.04]" />)
      ) : !friends.length ? (
        <Card className="p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/[0.06]">
            <Users className="size-5 text-white/70" />
          </span>
          <p className="mt-3 text-[16px] font-semibold">Tu pojawią się treningi znajomych</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">Wymieńcie się kodami. Każdy, kto włączy udostępnianie, pokaże tu swoje biegi.</p>
          <button type="button" onClick={onAddFriends} className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-black active:scale-95">
            Dodaj znajomego
          </button>
        </Card>
      ) : null}

      {(feed ?? []).map((m) => (
        <MomentCard key={m.id} m={m} onChange={(p) => setFeed((f) => (f ?? []).map((x) => (x.id === m.id ? { ...x, ...p } : x)))} />
      ))}
    </div>
  );
}

function ShareCard({ on, onChange, count }: { on: boolean; onChange: (on: boolean) => void; count: number }) {
  const [info, setInfo] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", on ? "bg-[#ff5a60]/18 text-[#ff8a8f]" : "bg-white/[0.06] text-white/60")}>{on ? <Users className="size-[18px]" /> : <EyeOff className="size-[18px]" />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold">{on ? "Znajomi widzą Twoje treningi" : "Twoje treningi widzisz tylko Ty"}</p>
          <p className="text-[12px] text-white/45">{on ? `${count} z ostatnich 14 dni · ` : "Włącz, a znajomi zobaczą Twoje biegi · "}
            <button type="button" onClick={() => setInfo((v) => !v)} className="underline underline-offset-2">
              co widać?
            </button>
          </p>
        </div>
        <button type="button" role="switch" aria-checked={on} aria-label="Udostępniaj znajomym" onClick={() => onChange(!on)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-[#e5343b]" : "bg-white/15")}>
          <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>
      {info ? (
        <div className="mt-3 grid gap-1.5 border-t border-white/[0.06] pt-3 text-[12.5px] leading-snug text-white/60">
          <p>✓ Sport, dystans, czas i tempo, nazwa treningu z planu.</p>
          <p>✓ Tylko znajomi, którym podałeś kod. Usunięcie znajomego od razu zabiera mu dostęp.</p>
          <p>✗ Nigdy: samopoczucie, ból, tętno, notatki, plan na przyszłość.</p>
          <p>Wyłączasz przełącznikiem i wszystko znika od razu. Pojedynczy trening ukryjesz na jego karcie.</p>
        </div>
      ) : null}
    </Card>
  );
}

function MomentCard({ m, onChange }: { m: Moment; onChange: (p: Partial<Moment>) => void }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const Icon = ICON[m.sport] ?? Activity;
  const run = m.sport === "run" && m.km > 0;
  const hidden = m.visibility === "me";

  const tap = async (kind: "fire" | "five") => {
    const was = kind === "fire" ? m.my_fire : m.my_five;
    const n = kind === "fire" ? m.fire : m.five;
    onChange(kind === "fire" ? { my_fire: !was, fire: n + (was ? -1 : 1) } : { my_five: !was, five: n + (was ? -1 : 1) });
    if (!was && "vibrate" in navigator) navigator.vibrate?.(12);
    const r = await react(m.id, kind).catch(() => null);
    if (r === null) onChange(kind === "fire" ? { my_fire: was, fire: n } : { my_five: was, five: n });
  };
  const openComments = async () => {
    setOpen((v) => !v);
    if (!list) setList(await loadComments(m.id).catch(() => []));
  };
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    setErr(null);
    const r = await addComment(m.id, body);
    if (!r.ok) return setErr(r.error ?? "Nie udało się.");
    setList(await loadComments(m.id).catch(() => []));
    onChange({ comments: m.comments + 1 });
  };
  const flipVisibility = async () => {
    const vis = hidden ? "friends" : "me";
    onChange({ visibility: vis });
    await shareMoments([{ runId: m.run_id, day: m.day, sport: m.sport, km: m.km, sec: m.sec, title: m.title, visibility: vis }]).catch(() => 0);
    const sent = load<Record<string, string>>(SENT_KEY, {});
    delete sent[m.run_id];
    save(SENT_KEY, sent);
  };

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#111113]", hidden && "opacity-60")}>
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-semibold text-black" style={{ background: tone(m.user_id) }}>
          {m.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold">{m.me ? "Ty" : m.name}</p>
          <p className="text-[12px] capitalize text-white/45">
            {ago(m.day)}
            {m.streak >= 2 ? (
              <span className="normal-case">
                {" · "}
                <Flame className="-mt-0.5 inline size-3 text-amber-400" /> {m.streak} tyg. z rzędu
              </span>
            ) : null}
          </p>
        </div>
        {m.me ? (
          <button type="button" onClick={flipVisibility} className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1.5 text-[11.5px] text-white/65 active:scale-95">
            {hidden ? <Lock className="size-3" /> : <Users className="size-3" />}
            {hidden ? "Tylko Ty" : "Znajomi"}
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3 px-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#ff5a60]/15 text-[#ff8a8f]">
          <Icon className="size-[18px]" />
        </span>
        <p className="min-w-0 truncate text-[15.5px] font-semibold">{m.title || sportName(m.sport as Sport)}</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        {[run || m.km > 0 ? { v: m.km.toFixed(1).replace(".", ","), u: "km" } : null, m.sec ? { v: dur(m.sec), u: "czas" } : null, run && m.sec ? { v: fmtPace(m.sec / m.km), u: "/km" } : null]
          .filter(Boolean)
          .map((s) => (
            <div key={s!.u} className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
              <p className="text-[19px] font-semibold leading-none tabular-nums">{s!.v}</p>
              <p className="mt-1 text-[11px] text-white/45">{s!.u}</p>
            </div>
          ))}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] px-3 py-2.5">
        <button type="button" onClick={() => tap("fire")} aria-label="Ogień" className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] tabular-nums transition active:scale-90", m.my_fire ? "bg-[#ff5a60]/20 text-white" : "bg-white/[0.05] text-white/60")}>
          <span className={cn("text-[16px] transition", m.my_fire && "scale-110")}>🔥</span>
          {m.fire || ""}
        </button>
        <button type="button" onClick={() => tap("five")} aria-label="Piątka" className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] tabular-nums transition active:scale-90", m.my_five ? "bg-amber-400/20 text-white" : "bg-white/[0.05] text-white/60")}>
          <span className="text-[16px]">🙌</span>
          {m.five || ""}
        </button>
        <button type="button" onClick={openComments} className="ml-auto flex h-9 items-center gap-1.5 rounded-full bg-white/[0.05] px-3 text-[13px] text-white/60 active:scale-95">
          <MessageCircle className="size-4" />
          {m.comments || "Napisz"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/[0.06] px-4 pb-3 pt-3">
          {list === null ? <p className="text-[12.5px] text-white/40">Ładuję…</p> : null}
          <div className="grid gap-2.5">
            {(list ?? []).map((c) => (
              <div key={c.id} className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-black" style={{ background: tone(c.user_id) }}>
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <p className="min-w-0 flex-1 break-words text-[13.5px] leading-snug text-white/80">
                  <span className="font-semibold text-white">{c.me ? "Ty" : c.name}</span> {c.body}
                </p>
                {c.me || m.me ? (
                  <button
                    type="button"
                    aria-label="Usuń komentarz"
                    onClick={async () => {
                      if (await deleteComment(c.id).catch(() => false)) {
                        setList((l) => (l ?? []).filter((x) => x.id !== c.id));
                        onChange({ comments: Math.max(0, m.comments - 1) });
                      }
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-white/30 active:bg-white/10"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              maxLength={300}
              enterKeyHint="send"
              placeholder={m.me ? "Odpisz…" : "Brawo, mocny trening!"}
              className="h-10 w-full min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[16px] outline-none placeholder:text-white/30"
            />
            <button type="button" onClick={send} disabled={!text.trim()} className={cn("h-10 shrink-0 rounded-full bg-white px-4 text-[13px] font-semibold text-black active:scale-95", !text.trim() && "opacity-30")}>
              Wyślij
            </button>
          </div>
          {err ? <p className="mt-2 text-[12.5px] text-[#ff8a8f]">{err}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
