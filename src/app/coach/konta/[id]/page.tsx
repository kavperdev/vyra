import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FounderAccountActions } from "@/components/coach/founder-account-actions";
import { FounderNotify } from "@/components/coach/founder-notify";
import { PageHeader } from "@/components/ui/misc";
import { analyse, mmss } from "@/lib/app/form";
import type { Run } from "@/lib/app/log";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Konto zawodnika" };

type Entry = { value: unknown; updated_at: string };
type Acc = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
  method_access: boolean;
  method_until: string | null;
  devices: number;
  state: Record<string, Entry>;
  notifications: { title: string; body: string | null; created_at: string; read_at: string | null }[];
};

const dt = (s: string | null | undefined) => (s ? new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(s)) : "nigdy");
const d = (s: string) => new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${s}T12:00:00Z`));
const pace = (sec: number, km: number) => (km ? `${Math.floor(sec / km / 60)}:${String(Math.round((sec / km) % 60)).padStart(2, "0")}/km` : "");
const KEY_NAMES: Record<string, string> = {
  "vyra-log": "Dziennik biegów",
  "vyra-goal-plan": "Plan pod start",
  "vyra-start-plan": "Zacznij biegać (zrobione treningi)",
  "vyra-result": "Wynik do obliczeń",
  "vyra-me": "Ankieta startowa",
  "vyra-week-goal": "Cel tygodnia",
  "vyra-course-done": "Kurs (ukończone lekcje)",
  "vyra-badges-seen": "Odznaki",
  "vyra-swaps": "Zamiany treningów",
  "vyra-onboarded": "Przeszedł powitanie",
  "vyra-start-on": "Zacznij biegać włączone",
  "vyra-log-del": "Usunięte biegi",
};

export default async function FounderAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("founder_account", { p_user: id });
  if (error)
    return <p className="rounded-xl border border-border p-4 text-sm text-muted">Wgląd w konta zadziała po uruchomieniu w Supabase pliku supabase/data/founder_panel.sql.</p>;
  const a = data as Acc | null;
  if (!a) notFound();

  const log = (Array.isArray(a.state["vyra-log"]?.value) ? (a.state["vyra-log"].value as Run[]) : []).filter((r) => r && typeof r.day === "string")
    .map((r) => ({ ...r, km: Number(r.km) || 0, sec: Number(r.sec) || 0, rpe: Number(r.rpe) || 0, note: typeof r.note === "string" ? r.note : "" }));
  const result = a.state["vyra-result"]?.value as { dist?: string; time?: string } | undefined;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  const f = analyse(log, today, null);
  const goal = a.state["vyra-goal-plan"]?.value as { name?: string; dist?: string; race?: string; days?: number; done?: string[] } | null | undefined;
  const lastActive = Object.values(a.state).reduce<string | null>((m, e) => (!m || e.updated_at > m ? e.updated_at : m), null);
  const km30 = log.filter((r) => r.day > new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)).reduce((s, r) => s + (r.km || 0), 0);

  return (
    <div className="grid gap-6">
      <Link href="/coach/konta" className="flex w-fit items-center gap-1.5 text-sm text-muted">
        <ArrowLeft className="size-4" /> Wszystkie konta
      </Link>
      <PageHeader eyebrow="Konto w aplikacji" title={a.full_name || a.email} description={a.email} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Założone", dt(a.created_at)],
          ["Ostatnie logowanie", dt(a.last_sign_in)],
          ["Ostatnia aktywność", dt(lastActive)],
          ["Powiadomienia push", a.devices ? `${a.devices} urządz.` : "wyłączone"],
          ["VYRA Method", a.method_access ? (a.method_until ? `do ${dt(a.method_until).split(",")[0]}` : "bez końca") : "nie"],
          ["Biegi w dzienniku", String(log.length)],
          ["Km w 30 dni", km30.toFixed(1).replace(".", ",")],
          ["Forma", f.state.label],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border p-3">
            <p className="text-[12px] text-muted">{k}</p>
            <p className="mt-1 font-medium">{v}</p>
          </div>
        ))}
      </div>

      {log.length ? (
        <div className="grid gap-2 rounded-2xl border border-border p-4">
          <p className="font-medium">Forma (tak jak widzi ją w aplikacji)</p>
          <p className="text-sm text-muted">
            Kondycja {f.fitness} · Zmęczenie {f.fatigue} · Balans {f.balance > 0 ? "+" : ""}
            {f.balance}
            {f.p5k ? ` · 5 km dziś ok. ${mmss(f.p5k)}` : ""}
            {f.ratioZone ? ` · ryzyko: ${{ low: "niskie obciążenie", safe: "bezpiecznie", watch: "podwyższone", risk: "wysokie" }[f.ratioZone]}` : ""}
          </p>
          {f.insights.length ? (
            <ul className="grid gap-1 text-sm">
              {f.insights.map((i) => (
                <li key={i.title}>
                  <span className="font-medium">{i.title}</span> <span className="text-muted">{i.body}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <FounderAccountActions id={a.id} fullName={a.full_name ?? ""} />
          <FounderNotify userId={a.id} name={a.full_name || a.email} />
        </div>
        <div className="grid content-start gap-4">
          <div className="rounded-2xl border border-border p-4 text-sm">
            <p className="font-medium">Plany</p>
            <p className="mt-1 text-muted">
              {goal?.race ? `Plan pod start: ${goal.name || goal.dist} · ${goal.race} · ${goal.days ?? "?"} dni/tydz. · zrobione treningi: ${goal.done?.length ?? 0}` : "Brak planu pod start."}
            </p>
            <p className="mt-1 text-muted">{result?.time ? `Wynik do obliczeń: ${result.dist} w ${result.time}` : "Brak wpisanego wyniku."}</p>
          </div>
          <div className="rounded-2xl border border-border">
            <p className="p-4 pb-2 font-medium">Ostatnie biegi</p>
            {log.length ? (
              <ul className="divide-y divide-border text-sm">
                {log.slice(0, 15).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 px-4 py-2">
                    <span className="capitalize text-muted">{d(r.day)}</span>
                    <span className="tabular-nums">
                      {r.km ? `${String(r.km).replace(".", ",")} km · ` : ""}
                      {mmss(r.sec)} {r.km ? `· ${pace(r.sec, r.km)}` : ""}
                      {r.rpe ? ` · RPE ${r.rpe}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 pb-4 text-sm text-muted">Brak biegów zapisanych na koncie.</p>
            )}
          </div>
          <div className="rounded-2xl border border-border p-4 text-sm">
            <p className="font-medium">Ostatnie powiadomienia</p>
            {a.notifications.length ? (
              <ul className="mt-2 grid gap-1.5">
                {a.notifications.map((n) => (
                  <li key={n.created_at + n.title} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{n.title}</span>
                    <span className="shrink-0 text-muted">{dt(n.created_at)} {n.read_at ? "· przeczytane" : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted">Brak.</p>
            )}
          </div>
          <details className="rounded-2xl border border-border p-4 text-sm">
            <summary className="cursor-pointer font-medium">Wszystkie dane z aplikacji</summary>
            <ul className="mt-3 grid gap-3">
              {Object.entries(a.state).map(([k, e]) => (
                <li key={k}>
                  <p className="font-medium">
                    {KEY_NAMES[k] ?? k} <span className="font-normal text-muted">· {dt(e.updated_at)}</span>
                  </p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-xl bg-surface p-2 text-[11px] leading-snug">{JSON.stringify(e.value, null, 1).slice(0, 4000)}</pre>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
