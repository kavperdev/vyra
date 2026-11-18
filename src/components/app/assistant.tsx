"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, X } from "lucide-react";
import { readLog } from "@/lib/app/log";
import { load, save, todayWaw } from "@/lib/app/store";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "vyra-puls";
const SEEN = "vyra-puls-seen";
const HIDE_ON = ["/app/zestaw", "/app/timer", "/app/bieg", "/app/start", "/app/witaj"];
const ASK = ["Jak szybko biegać spokojnie?", "Co daje VYRA Method?", "Jak połączyć Stravę?", "Boli mnie kolano, co robić?", "Kiedy jest Run Club?"];

/** The avatar: a pulse line in a dark circle, with a slow ring around it. */
function Avatar({ size = 52, ping = false }: { size?: number; ping?: boolean }) {
  return (
    <span className="relative grid place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#2a2a30,#0c0c0e)] shadow-[0_8px_30px_rgba(229,52,59,0.35)] ring-1 ring-white/15" style={{ width: size, height: size }}>
      {ping ? <span className="absolute inset-0 animate-ping rounded-full bg-[#ff5a60]/25 [animation-duration:2.4s]" /> : null}
      <svg viewBox="0 0 32 32" className="relative" style={{ width: size * 0.52, height: size * 0.52 }} aria-hidden>
        <path d="M2 17h6l3-7 5 14 4-10 2 3h8" fill="none" stroke="#ff5a60" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Paths like /app/cwiczenia in an answer become links. */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(\/app\/[a-z0-9-]+(?:\/[a-z0-9-]+)?|vyraathl\.pl\/[a-z0-9-]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\/app\//.test(p) ? (
          <Link key={i} href={p} className="font-medium text-[#ff8a8f] underline underline-offset-2">
            {p}
          </Link>
        ) : /^vyraathl\.pl\//.test(p) ? (
          <a key={i} href={`https://${p}`} className="font-medium text-[#ff8a8f] underline underline-offset-2">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** What Puls should know about this runner, from this phone (no names, no e-mail). */
function context(path: string) {
  const since = new Date(Date.parse(`${todayWaw()}T12:00:00Z`) - 14 * 864e5).toISOString().slice(0, 10);
  const runs = readLog().filter((r) => r.day >= since);
  const km = runs.reduce((a, r) => a + r.km, 0);
  const res = load<{ dist: string; time: string } | null>("vyra-result", null);
  const goal = load<{ dist: string; race: string; name?: string } | null>("vyra-goal-plan", null);
  const lvl = load<string | null>("vyra-nocna-level", null);
  return [
    `ekran: ${path}`,
    `ostatnie 14 dni: ${runs.length} biegów, ${km.toFixed(1)} km`,
    res ? `wynik: ${res.dist} w ${res.time}` : null,
    goal ? `cel: ${goal.name || goal.dist} ${goal.race}` : null,
    lvl ? `Nocna Ekipa poziom: ${lvl}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

/**
 * Puls: the assistant one tap away on every app screen. Training questions and "how does the app
 * work". The conversation stays on this phone.
 */
export function Assistant({ signedIn }: { signedIn: boolean }) {
  const path = usePathname() ?? "/app";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs(load<Msg[]>(KEY, []));
    setFresh(!load<boolean>(SEEN, false));
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);

  if (HIDE_ON.some((p) => path.startsWith(p))) return null;

  const ask = async (q: string) => {
    const said = q.trim();
    if (!said || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: said }];
    setMsgs(next);
    setText("");
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-10), ctx: context(path) }) });
      const j = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !j.answer) throw new Error(j.error ?? "Puls nie odpowiedział.");
      const all: Msg[] = [...next, { role: "assistant", content: j.answer }];
      setMsgs(all);
      save(KEY, all.slice(-30));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Puls nie odpowiedział.");
    } finally {
      setBusy(false);
    }
  };
  const openIt = () => {
    setOpen(true);
    if (fresh) {
      save(SEEN, true);
      setFresh(false);
    }
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={openIt}
          aria-label="Zapytaj Pulsa, asystenta VYRA"
          className="fixed right-4 z-40 flex items-center gap-2 transition active:scale-90 lg:bottom-6 lg:right-6"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
        >
          {fresh ? <span className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black shadow-lg">Zapytaj Pulsa</span> : null}
          <Avatar ping={fresh} />
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm lg:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Puls, asystent VYRA"
            onClick={(e) => e.stopPropagation()}
            className="flex h-[82dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0c0c0e] lg:h-[70vh] lg:rounded-[28px]"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <Avatar size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold leading-tight">Puls</p>
                <p className="text-[12px] text-white/45">Asystent AI VYRA · trening i aplikacja</p>
              </div>
              {msgs.length ? (
                <button type="button" onClick={() => { setMsgs([]); save(KEY, []); }} className="rounded-full px-3 py-1.5 text-[12px] text-white/50 active:bg-white/10">
                  Wyczyść
                </button>
              ) : null}
              <button type="button" aria-label="Zamknij" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-white/[0.06] active:scale-90">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2.5 text-[14px] leading-relaxed text-white/85">
                Cześć, tu Puls. Pytaj o trening: tempo, tętno, ból, start. Albo o to, gdzie co jest w aplikacji. Jestem asystentem AI, nie lekarzem: przy bólu, który nie mija, idź do specjalisty.
              </div>
              {!signedIn ? (
                <div className="mt-3 rounded-2xl border border-white/10 p-3.5 text-[13.5px] text-white/70">
                  Zaloguj się, żeby pisać z Pulsem.{" "}
                  <Link href="/login?next=/app" className="font-semibold text-white underline underline-offset-2">
                    Zaloguj
                  </Link>
                </div>
              ) : null}
              <div className="mt-3 grid gap-2.5">
                {msgs.map((m, i) =>
                  m.role === "user" ? (
                    <p key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#e5343b] px-3.5 py-2.5 text-[14px] leading-snug text-white">
                      {m.content}
                    </p>
                  ) : (
                    <p key={i} className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2.5 text-[14px] leading-relaxed text-white/85">
                      <Linked text={m.content} />
                    </p>
                  ),
                )}
                {busy ? (
                  <p className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white/[0.06] px-4 py-3.5">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="size-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </p>
                ) : null}
                {err ? <p className="text-[13px] text-[#ff8a8f]">{err}</p> : null}
              </div>
              <div ref={end} />
            </div>

            {signedIn && !msgs.length ? (
              <div className="app-scroll flex gap-1.5 overflow-x-auto px-4 pb-2">
                {ASK.map((a) => (
                  <button key={a} type="button" onClick={() => ask(a)} className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12.5px] text-white/80 active:scale-95">
                    {a}
                  </button>
                ))}
              </div>
            ) : null}
            <form
              className="flex items-center gap-2 border-t border-white/[0.06] px-3 pt-2.5"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
              onSubmit={(e) => {
                e.preventDefault();
                ask(text);
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} disabled={!signedIn} placeholder={signedIn ? "Napisz pytanie…" : "Zaloguj się, żeby pisać"} enterKeyHint="send" className="h-11 w-full min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[16px] outline-none placeholder:text-white/30" />
              <button type="button" onClick={() => ask(text)} aria-label="Wyślij" disabled={!text.trim() || busy || !signedIn} className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-white text-black transition active:scale-90", (!text.trim() || busy) && "opacity-30")}>
                <ArrowUp className="size-5" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
