"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Clock, MapPin, Minus, Plus, Trash2, Undo2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form-controls";
import {
  deleteMatch,
  saveMatch,
  saveMatchResult,
  saveVolleyStats,
  setCallupAnswer,
  setCallupCategory,
  setCallups,
  setMatchStatus,
} from "@/lib/actions/club-sport";
import { minutesFairness, sumStats, volleyEfficiency, VOLLEY_STATS, weightGap, type VolleyStats } from "@/lib/clubs/sports";
import type { Callup, ClubMatch, Weight } from "@/lib/data/club-sport";
import { cn } from "@/lib/utils";

type Athlete = { id: string; full_name: string; group_ids: string[] };
type Group = { id: string; name: string; color: string };

const when = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" }) : "");

function matchName(m: ClubMatch, club: string) {
  if (m.kind === "tournament" || !m.opponent) return m.title ?? "Turniej";
  return m.home ? `${club} – ${m.opponent}` : `${m.opponent} – ${club}`;
}

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      if (r.message) toast.success(r.message);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

/** Team sports: matches with call-ups and parents' answers; martial arts / tennis: tournaments with weight categories. */
export function MatchesTab({
  clubId,
  clubName,
  sport,
  ready,
  groups,
  athletes,
  matches,
  callups,
  weights,
  tournaments,
}: {
  clubId: string;
  clubName: string;
  sport: string;
  ready: boolean;
  groups: Group[];
  athletes: Athlete[];
  matches: ClubMatch[];
  callups: Callup[];
  weights: Weight[];
  tournaments: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const now = new Date().toISOString();
  const upcoming = matches.filter((m) => m.starts_at >= now || m.status === "planned").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = matches.filter((m) => !upcoming.includes(m));
  const football = sport === "football";
  const word = tournaments ? { one: "turniej", add: "Dodaj turniej", list: "Turnieje" } : { one: "mecz", add: "Dodaj mecz", list: "Mecze" };

  if (!ready)
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted">Ta zakładka zacznie działać po uruchomieniu migracji 20261117000100_sport_modules.sql w Supabase.</CardContent>
      </Card>
    );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {tournaments
            ? "Zgłoś zawodników na turniej, ustaw kategorię wagową i zobacz, ile komu brakuje do limitu. Rodzice potwierdzają udział na swojej stronie."
            : "Powołaj zawodników, a oni i ich rodzice potwierdzą udział jednym kliknięciem. Po meczu wpisz wynik i minuty."}
        </p>
        <Button variant="accent" size="sm" onClick={() => setAdding(!adding)}>
          <CalendarPlus className="size-4" /> {word.add}
        </Button>
      </div>
      {adding ? <MatchForm clubId={clubId} groups={groups} tournament={tournaments} onDone={() => setAdding(false)} /> : null}

      <Section title={`Najbliższe ${tournaments ? "turnieje" : "mecze"}`} empty={`Brak zaplanowanych. Dodaj pierwszy ${word.one}.`} list={upcoming}>
        {(m) => (
          <MatchCard
            key={m.id}
            m={m}
            name={matchName(m, clubName)}
            open={open === m.id}
            onToggle={() => setOpen(open === m.id ? null : m.id)}
            groups={groups}
            athletes={athletes}
            callups={callups.filter((c) => c.match_id === m.id)}
            weights={weights}
            sport={sport}
            tournament={tournaments}
          />
        )}
      </Section>

      {football && past.some((m) => m.status === "played") ? <FairnessCard athletes={athletes} matches={matches} callups={callups} groups={groups} /> : null}
      {sport === "volleyball" ? <VolleySeasonCard athletes={athletes} callups={callups.filter((c) => matches.find((m) => m.id === c.match_id)?.status === "played")} /> : null}

      <Section title="Rozegrane" empty="Jeszcze nic." list={past}>
        {(m) => (
          <MatchCard
            key={m.id}
            m={m}
            name={matchName(m, clubName)}
            open={open === m.id}
            onToggle={() => setOpen(open === m.id ? null : m.id)}
            groups={groups}
            athletes={athletes}
            callups={callups.filter((c) => c.match_id === m.id)}
            weights={weights}
            sport={sport}
            tournament={tournaments}
          />
        )}
      </Section>
    </div>
  );
}

function Section({ title, empty, list, children }: { title: string; empty: string; list: ClubMatch[]; children: (m: ClubMatch) => React.ReactNode }) {
  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {list.length ? list.map(children) : <p className="text-sm text-muted">{empty}</p>}
    </div>
  );
}

function MatchForm({ clubId, groups, tournament, onDone }: { clubId: string; groups: Group[]; tournament: boolean; onDone: () => void }) {
  const { pending, run } = useAct();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
  const [v, setV] = useState({ group_id: groups[0]?.id ?? "", opponent: "", title: "", home: true, date: today, time: "10:00", meet_time: "", place: "", competition: "", duration_min: tournament ? "" : "60" });
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {tournament ? (
            <Field label="Nazwa turnieju" htmlFor="m-title">
              <Input id="m-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="np. Puchar Mazowsza" />
            </Field>
          ) : (
            <Field label="Przeciwnik" htmlFor="m-opp">
              <Input id="m-opp" value={v.opponent} onChange={(e) => setV({ ...v, opponent: e.target.value })} placeholder="np. Pogoń Siedlce U12" />
            </Field>
          )}
          <Field label="Grupa / drużyna" htmlFor="m-grp">
            <Select id="m-grp" value={v.group_id} onChange={(e) => setV({ ...v, group_id: e.target.value })}>
              <option value="">Cały klub</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          {tournament ? (
            <Field label="Miejsce" htmlFor="m-place">
              <Input id="m-place" value={v.place} onChange={(e) => setV({ ...v, place: e.target.value })} />
            </Field>
          ) : (
            <Field label="Gdzie" htmlFor="m-home">
              <Select id="m-home" value={v.home ? "1" : "0"} onChange={(e) => setV({ ...v, home: e.target.value === "1" })}>
                <option value="1">U siebie</option>
                <option value="0">Na wyjeździe</option>
              </Select>
            </Field>
          )}
          <Field label="Data" htmlFor="m-date">
            <Input id="m-date" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
          </Field>
          <Field label="Start" htmlFor="m-time">
            <Input id="m-time" type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} />
          </Field>
          <Field label="Zbiórka" htmlFor="m-meet" hint="Opcjonalnie">
            <Input id="m-meet" type="time" value={v.meet_time} onChange={(e) => setV({ ...v, meet_time: e.target.value })} />
          </Field>
          {!tournament ? (
            <Field label="Adres / boisko" htmlFor="m-place2">
              <Input id="m-place2" value={v.place} onChange={(e) => setV({ ...v, place: e.target.value })} />
            </Field>
          ) : null}
          <Field label="Rozgrywki" htmlFor="m-comp" hint="np. liga okręgowa, sparing">
            <Input id="m-comp" value={v.competition} onChange={(e) => setV({ ...v, competition: e.target.value })} />
          </Field>
          {!tournament ? (
            <Field label="Czas meczu" unit="min" htmlFor="m-dur" hint="Do licznika minut">
              <Input id="m-dur" inputMode="numeric" value={v.duration_min} onChange={(e) => setV({ ...v, duration_min: e.target.value.replace(/\D/g, "") })} />
            </Field>
          ) : null}
        </div>
        <Button
          className="w-fit"
          disabled={pending}
          onClick={() => run(() => saveMatch({ club_id: clubId, kind: tournament ? "tournament" : "match", ...v }), onDone)}
        >
          Zapisz
        </Button>
      </CardContent>
    </Card>
  );
}

function AnswerBadge({ c }: { c: Callup }) {
  const who = c.replied_by === "guardian" ? " (rodzic)" : c.replied_by === "coach" ? " (trener)" : "";
  if (c.status === "yes") return <Badge tone="done">będzie{who}</Badge>;
  if (c.status === "no") return <Badge tone="problem">nie będzie{who}</Badge>;
  return <Badge>czeka</Badge>;
}

function MatchCard({
  m,
  name,
  open,
  onToggle,
  groups,
  athletes,
  callups,
  weights,
  sport,
  tournament,
}: {
  m: ClubMatch;
  name: string;
  open: boolean;
  onToggle: () => void;
  groups: Group[];
  athletes: Athlete[];
  callups: Callup[];
  weights: Weight[];
  sport: string;
  tournament: boolean;
}) {
  const yes = callups.filter((c) => c.status === "yes").length;
  const no = callups.filter((c) => c.status === "no").length;
  const pend = callups.length - yes - no;
  const score = m.status === "played" && m.score_for != null ? `${m.score_for}:${m.score_against}` : null;
  return (
    <Card className={cn(m.status === "cancelled" && "opacity-60")}>
      <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="truncate font-semibold">
            {name} {score ? <span className="num ml-1">{score}</span> : null}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {when(m.starts_at)}
              {m.meet_at ? ` · zbiórka ${hhmm(m.meet_at)}` : ""}
            </span>
            {m.place ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {m.place}
              </span>
            ) : null}
            {m.competition ? <span>{m.competition}</span> : null}
            {m.group_id ? <span>{groups.find((g) => g.id === m.group_id)?.name}</span> : null}
          </p>
        </div>
        {m.status === "cancelled" ? (
          <Badge tone="problem">odwołany</Badge>
        ) : callups.length ? (
          <span className="flex items-center gap-1.5 text-[12px]">
            <Badge tone="done">{yes} tak</Badge>
            {no ? <Badge tone="problem">{no} nie</Badge> : null}
            {pend ? <Badge>{pend} czeka</Badge> : null}
          </span>
        ) : (
          <Badge tone="warning">brak powołań</Badge>
        )}
      </button>
      {open ? (
        <CardContent className="grid gap-6 border-t border-border pt-5">
          <CallupEditor m={m} athletes={athletes} groups={groups} callups={callups} weights={weights} tournament={tournament} />
          {callups.length && m.status !== "cancelled" ? (
            sport === "volleyball" ? (
              <VolleyTracker m={m} athletes={athletes} callups={callups} />
            ) : (
              <ResultEditor m={m} athletes={athletes} callups={callups} tournament={tournament} football={sport === "football"} />
            )
          ) : null}
          <MatchActions m={m} />
        </CardContent>
      ) : null}
    </Card>
  );
}

function CallupEditor({ m, athletes, groups, callups, weights, tournament }: { m: ClubMatch; athletes: Athlete[]; groups: Group[]; callups: Callup[]; weights: Weight[]; tournament: boolean }) {
  const { pending, run } = useAct();
  const [edit, setEdit] = useState(!callups.length);
  const [pick, setPick] = useState<Set<string>>(new Set(callups.map((c) => c.athlete_id)));
  const roster = athletes.filter((a) => !m.group_id || a.group_ids.includes(m.group_id));
  const others = athletes.filter((a) => !roster.includes(a));
  const name = (id: string) => athletes.find((a) => a.id === id)?.full_name ?? "Zawodnik";
  const lastWeight = (id: string) => weights.filter((w) => w.athlete_id === id).sort((a, b) => b.measured_on.localeCompare(a.measured_on))[0] ?? null;

  if (edit)
    return (
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">
            <Users className="mr-1 inline size-4" /> Kogo powołujesz? <span className="text-muted">({pick.size})</span>
          </p>
          <button type="button" className="text-[13px] text-muted hover:text-foreground" onClick={() => setPick(new Set(roster.map((a) => a.id)))}>
            Zaznacz całą grupę
          </button>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...roster, ...others].map((a) => (
            <label key={a.id} className={cn("flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm", !roster.includes(a) && "opacity-70")}>
              <Checkbox
                checked={pick.has(a.id)}
                onChange={(e) => {
                  const n = new Set(pick);
                  if (e.target.checked) n.add(a.id);
                  else n.delete(a.id);
                  setPick(n);
                }}
              />
              <span className="truncate">{a.full_name}</span>
            </label>
          ))}
        </div>
        {groups.length && m.group_id ? <p className="text-[12px] text-subtle">Wyszarzeni: zawodnicy spoza tej grupy.</p> : null}
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => setCallups(m.id, [...pick]), () => setEdit(false))}>
            Zapisz powołania
          </Button>
          {callups.length ? (
            <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>
              Anuluj
            </Button>
          ) : null}
        </div>
      </div>
    );

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Powołani i odpowiedzi</p>
        <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
          Zmień skład
        </Button>
      </div>
      <ul className="grid gap-1.5">
        {callups
          .slice()
          .sort((a, b) => name(a.athlete_id).localeCompare(name(b.athlete_id), "pl"))
          .map((c) => {
            const w = lastWeight(c.athlete_id);
            const gap = weightGap(w?.weight_kg ?? null, c.category_kg);
            return (
              <li key={c.athlete_id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{name(c.athlete_id)}</span>
                {tournament ? (
                  <span className="flex items-center gap-2">
                    <Input
                      aria-label="Kategoria wagowa (kg)"
                      inputMode="decimal"
                      defaultValue={c.category_kg ?? ""}
                      placeholder="kat. kg"
                      className="h-8 w-20"
                      onBlur={(e) => {
                        const v = e.target.value.trim().replace(",", ".");
                        const n = v ? Number(v) : null;
                        if (n === c.category_kg || (v && !Number.isFinite(n))) return;
                        run(() => setCallupCategory(m.id, c.athlete_id, n));
                      }}
                    />
                    {gap !== null ? (
                      <span className={cn("num text-[12px]", gap > 0 ? "text-problem" : "text-done")}>
                        {w!.weight_kg.toLocaleString("pl-PL")} kg · {gap > 0 ? `${gap.toLocaleString("pl-PL")} kg ponad limit` : "w limicie"}
                      </span>
                    ) : w ? (
                      <span className="num text-[12px] text-muted">{w.weight_kg.toLocaleString("pl-PL")} kg</span>
                    ) : null}
                  </span>
                ) : null}
                <AnswerBadge c={c} />
                {m.status === "planned" ? (
                  <span className="flex gap-1">
                    <button type="button" aria-label="Oznacz: będzie" className="rounded p-1 text-muted hover:text-done" onClick={() => run(() => setCallupAnswer(m.id, c.athlete_id, "yes"))}>
                      <Check className="size-4" />
                    </button>
                    <button type="button" aria-label="Oznacz: nie będzie" className="rounded p-1 text-muted hover:text-problem" onClick={() => run(() => setCallupAnswer(m.id, c.athlete_id, "no"))}>
                      <X className="size-4" />
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

function ResultEditor({ m, athletes, callups, tournament, football }: { m: ClubMatch; athletes: Athlete[]; callups: Callup[]; tournament: boolean; football: boolean }) {
  const { pending, run } = useAct();
  const playing = callups.filter((c) => c.status !== "no");
  const [score, setScore] = useState({ f: m.score_for?.toString() ?? "", a: m.score_against?.toString() ?? "" });
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      playing.map((c) => [
        c.athlete_id,
        { minutes: c.minutes?.toString() ?? "", goals: c.goals, assists: c.assists, rating: c.rating?.toString() ?? "", starter: c.starter, result: c.result ?? "" },
      ]),
    ),
  );
  const name = (id: string) => athletes.find((a) => a.id === id)?.full_name ?? "Zawodnik";
  const set = (id: string, patch: Partial<(typeof rows)[string]>) => setRows({ ...rows, [id]: { ...rows[id], ...patch } });
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">{tournament ? "Wyniki zawodników" : "Wynik i statystyki"}</p>
      {!tournament ? (
        <div className="flex items-center gap-2">
          <Input aria-label="Bramki/punkty nasze" inputMode="numeric" className="h-10 w-16 text-center" value={score.f} onChange={(e) => setScore({ ...score, f: e.target.value.replace(/\D/g, "") })} />
          <span className="text-muted">:</span>
          <Input aria-label="Bramki/punkty rywala" inputMode="numeric" className="h-10 w-16 text-center" value={score.a} onChange={(e) => setScore({ ...score, a: e.target.value.replace(/\D/g, "") })} />
          <span className="text-[12px] text-muted">nasi : rywal</span>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-[12px] text-muted">
            <tr>
              <th className="py-1.5 font-medium">Zawodnik</th>
              {tournament ? (
                <th className="py-1.5 font-medium">Wynik / miejsce</th>
              ) : (
                <>
                  <th className="py-1.5 font-medium">Od początku</th>
                  <th className="py-1.5 font-medium">Minuty</th>
                  {football ? (
                    <>
                      <th className="py-1.5 font-medium">Gole</th>
                      <th className="py-1.5 font-medium">Asysty</th>
                    </>
                  ) : (
                    <th className="py-1.5 font-medium">Punkty</th>
                  )}
                  <th className="py-1.5 font-medium">Ocena 1–10</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {playing.map((c) => {
              const r = rows[c.athlete_id];
              return (
                <tr key={c.athlete_id} className="border-t border-border">
                  <td className="py-1.5 pr-2">{name(c.athlete_id)}</td>
                  {tournament ? (
                    <td className="py-1.5">
                      <Input aria-label="Wynik" className="h-8" placeholder="np. 2. miejsce, 3 walki wygrane" value={r.result} onChange={(e) => set(c.athlete_id, { result: e.target.value })} />
                    </td>
                  ) : (
                    <>
                      <td className="py-1.5">
                        <Checkbox checked={r.starter} onChange={(e) => set(c.athlete_id, { starter: e.target.checked, minutes: e.target.checked && !r.minutes && m.duration_min ? String(m.duration_min) : r.minutes })} aria-label="W pierwszym składzie" />
                      </td>
                      <td className="py-1.5">
                        <Input aria-label="Minuty" inputMode="numeric" className="h-8 w-16" value={r.minutes} onChange={(e) => set(c.athlete_id, { minutes: e.target.value.replace(/\D/g, "") })} />
                      </td>
                      <td className="py-1.5">
                        <Stepper value={r.goals} onChange={(v) => set(c.athlete_id, { goals: v })} />
                      </td>
                      {football ? (
                        <td className="py-1.5">
                          <Stepper value={r.assists} onChange={(v) => set(c.athlete_id, { assists: v })} />
                        </td>
                      ) : null}
                      <td className="py-1.5">
                        <Input aria-label="Ocena" inputMode="numeric" className="h-8 w-14" value={r.rating} onChange={(e) => set(c.athlete_id, { rating: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button
        className="w-fit"
        disabled={pending}
        onClick={() =>
          run(() =>
            saveMatchResult({
              match_id: m.id,
              score_for: tournament ? null : num(score.f),
              score_against: tournament ? null : num(score.a),
              sets: null,
              players: playing.map((c) => {
                const r = rows[c.athlete_id];
                const rating = num(r.rating);
                return {
                  athlete_id: c.athlete_id,
                  minutes: num(r.minutes),
                  goals: r.goals,
                  assists: r.assists,
                  rating: rating && rating >= 1 && rating <= 10 ? rating : null,
                  starter: r.starter,
                  result: r.result,
                  category_kg: c.category_kg,
                };
              }),
            }),
          )
        }
      >
        Zapisz {tournament ? "wyniki" : "wynik meczu"}
      </Button>
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" aria-label="Mniej" className="rounded border border-border p-1" onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus className="size-3" />
      </button>
      <span className="num w-5 text-center">{value}</span>
      <button type="button" aria-label="Więcej" className="rounded border border-border p-1" onClick={() => onChange(value + 1)}>
        <Plus className="size-3" />
      </button>
    </span>
  );
}

/** Volleyball: tap counters per player on a phone at the court; saved per player, efficiency live. */
function VolleyTracker({ m, athletes, callups }: { m: ClubMatch; athletes: Athlete[]; callups: Callup[] }) {
  const playing = callups.filter((c) => c.status !== "no");
  const [who, setWho] = useState(playing[0]?.athlete_id ?? "");
  const [stats, setStats] = useState<Record<string, VolleyStats>>(() => Object.fromEntries(playing.map((c) => [c.athlete_id, c.stats ?? {}])));
  const [sets, setSets] = useState<string>(m.sets ? m.sets.map((s) => s.join(":")).join(" ") : "");
  const { pending, run } = useAct();
  const [saving, startSave] = useTransition();
  const name = (id: string) => athletes.find((a) => a.id === id)?.full_name ?? "Zawodnik";
  const cur = stats[who] ?? {};
  const eff = volleyEfficiency(cur);
  const team = volleyEfficiency(sumStats(Object.values(stats)));
  const tap = (key: string, d: number) => {
    const next = { ...cur, [key]: Math.max(0, (cur[key] ?? 0) + d) };
    setStats({ ...stats, [who]: next });
    startSave(async () => {
      const r = await saveVolleyStats(m.id, who, next as Record<string, number>);
      if (!r.ok) toast.error(r.error);
    });
  };
  const groups = [...new Set(VOLLEY_STATS.map((s) => s.group))];
  const parsedSets = sets
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((s) => s.split(/[:\-]/).map(Number))
    .filter((p) => p.length === 2 && p.every((x) => Number.isFinite(x))) as [number, number][];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Statystyka meczu {saving ? <span className="text-[12px] text-muted">zapisywanie…</span> : null}</p>
        <p className="num text-[12px] text-muted">
          Drużyna: przyjęcie {team.reception ?? "–"}% · atak {team.attack ?? "–"}% · zagrywka {team.serve ?? "–"}%
        </p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {playing.map((c) => (
          <button
            key={c.athlete_id}
            type="button"
            onClick={() => setWho(c.athlete_id)}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[13px]", who === c.athlete_id ? "border-foreground bg-foreground text-background" : "border-border text-muted")}
          >
            {name(c.athlete_id).split(" ")[0]}
          </button>
        ))}
      </div>
      {who ? (
        <div className="grid gap-3">
          {groups.map((g) => (
            <div key={g} className="grid gap-1.5">
              <p className="text-[12px] font-medium uppercase tracking-wide text-muted">{g}</p>
              <div className="grid grid-cols-3 gap-2">
                {VOLLEY_STATS.filter((s) => s.group === g).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => tap(s.key, 1)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      tap(s.key, -1);
                    }}
                    className={cn(
                      "app-press grid gap-0.5 rounded-lg border px-2 py-3 text-center",
                      s.tone === "good" ? "border-done/40 bg-done/10" : s.tone === "bad" ? "border-problem/40 bg-problem/10" : "border-border bg-surface-2",
                    )}
                  >
                    <span className="num text-xl font-semibold">{cur[s.key] ?? 0}</span>
                    <span className="text-[12px]">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="num">
              {name(who)}: {eff.points} pkt · przyjęcie {eff.reception ?? "–"}% · atak {eff.attack ?? "–"}% · zagrywka {eff.serve ?? "–"}%
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground"
              onClick={() => {
                const last = VOLLEY_STATS.map((s) => s.key).reverse().find((k) => (cur[k] ?? 0) > 0);
                if (last) tap(last, -1);
              }}
            >
              <Undo2 className="size-3.5" /> cofnij ostatnie
            </button>
          </div>
          <p className="text-[12px] text-subtle">Dotknij, żeby dodać. Przytrzymaj (prawy klik), żeby odjąć. Zapis jest automatyczny.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <Field label="Wynik setów" htmlFor="v-sets" hint="np. 25:21 23:25 25:19">
          <Input id="v-sets" value={sets} onChange={(e) => setSets(e.target.value)} className="w-64" />
        </Field>
        <Button
          disabled={pending}
          onClick={() => {
            const won = parsedSets.filter(([a, b]) => a > b).length;
            run(() =>
              saveMatchResult({
                match_id: m.id,
                score_for: parsedSets.length ? won : null,
                score_against: parsedSets.length ? parsedSets.length - won : null,
                sets: parsedSets,
                players: playing.map((c) => ({ athlete_id: c.athlete_id, minutes: null, goals: volleyEfficiency(stats[c.athlete_id] ?? {}).points, assists: 0, rating: c.rating, starter: c.starter })),
              }),
            );
          }}
        >
          Zakończ mecz
        </Button>
      </div>
    </div>
  );
}

function MatchActions({ m }: { m: ClubMatch }) {
  const { pending, run } = useAct();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      {m.status === "planned" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMatchStatus(m.id, "cancelled"))}>
          Odwołaj
        </Button>
      ) : m.status === "cancelled" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMatchStatus(m.id, "planned"))}>
          Przywróć
        </Button>
      ) : null}
      {confirm ? (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteMatch(m.id))}>
          <Trash2 className="size-4" /> Na pewno usuń
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
          Usuń
        </Button>
      )}
    </div>
  );
}

/** Football for kids: who played too little this season (fair play time). */
function FairnessCard({ athletes, matches, callups, groups }: { athletes: Athlete[]; matches: ClubMatch[]; callups: Callup[]; groups: Group[] }) {
  const [group, setGroup] = useState(groups[0]?.id ?? "");
  const played = matches.filter((m) => m.status === "played" && (!group || m.group_id === group || !m.group_id));
  const rows = useMemo(
    () =>
      minutesFairness(
        athletes.filter((a) => !group || a.group_ids.includes(group)).map((a) => ({ athlete_id: a.id, name: a.full_name })),
        callups
          .filter((c) => played.some((m) => m.id === c.match_id))
          .map((c) => ({ athlete_id: c.athlete_id, minutes: c.minutes, available: c.status !== "no", duration: played.find((m) => m.id === c.match_id)?.duration_min ?? 60 })),
      ),
    [athletes, callups, played, group],
  );
  const goals = (id: string) => callups.filter((c) => c.athlete_id === id && played.some((m) => m.id === c.match_id)).reduce((s, c) => s + c.goals, 0);
  const assists = (id: string) => callups.filter((c) => c.athlete_id === id && played.some((m) => m.id === c.match_id)).reduce((s, c) => s + c.assists, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Równy czas gry w sezonie</CardTitle>
        <p className="text-sm text-muted">Procent minut, które zawodnik mógł zagrać w meczach, na które był dostępny. Czerwone: grał wyraźnie mniej niż reszta drużyny.</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {groups.length ? (
          <Select aria-label="Drużyna" value={group} onChange={(e) => setGroup(e.target.value)} className="w-fit">
            <option value="">Wszystkie</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        ) : null}
        <ul className="grid gap-1.5">
          {rows.map((r) => (
            <li key={r.athlete_id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate">{r.name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span className={cn("block h-full rounded-full", r.low ? "bg-problem" : "bg-foreground/60")} style={{ width: `${Math.round((r.share ?? 0) * 100)}%` }} />
              </span>
              <span className="num w-44 text-right text-[12px] text-muted">
                {r.share === null ? "bez meczów" : `${Math.round(r.share * 100)}% · ${r.played} min`} · {goals(r.athlete_id)} G {assists(r.athlete_id)} A
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function VolleySeasonCard({ athletes, callups }: { athletes: Athlete[]; callups: Callup[] }) {
  const rows = athletes
    .map((a) => {
      const s = sumStats(callups.filter((c) => c.athlete_id === a.id).map((c) => c.stats ?? {}));
      return { a, e: volleyEfficiency(s) };
    })
    .filter((r) => r.e.serveAttempts + r.e.receptionAttempts + r.e.attackAttempts > 0)
    .sort((x, y) => y.e.points - x.e.points);
  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statystyki sezonu</CardTitle>
        <p className="text-sm text-muted">Skuteczność: (punkty − błędy) / próby. Przyjęcie: idealne i dobre / wszystkie.</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-[12px] text-muted">
            <tr>
              <th className="py-1.5 font-medium">Zawodnik</th>
              <th className="py-1.5 font-medium">Punkty</th>
              <th className="py-1.5 font-medium">Atak</th>
              <th className="py-1.5 font-medium">Przyjęcie</th>
              <th className="py-1.5 font-medium">Zagrywka</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, e }) => (
              <tr key={a.id} className="num border-t border-border">
                <td className="py-1.5 font-sans">{a.full_name}</td>
                <td className="py-1.5">{e.points}</td>
                <td className="py-1.5">{e.attack === null ? "–" : `${e.attack}% (${e.attackAttempts})`}</td>
                <td className="py-1.5">{e.reception === null ? "–" : `${e.reception}% (${e.receptionAttempts})`}</td>
                <td className="py-1.5">{e.serve === null ? "–" : `${e.serve}% (${e.serveAttempts})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
