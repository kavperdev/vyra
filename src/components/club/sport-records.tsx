"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form-controls";
import {
  deleteGrade,
  deleteSwimStandard,
  deleteSwimTime,
  saveGrades,
  saveSkillRatings,
  saveSwimStandard,
  saveSwimTime,
  saveWeights,
  setAthleteSex,
  setClubGradeInterval,
} from "@/lib/actions/club-sport";
import {
  DISTANCES,
  eventName,
  FOOTBALL_SKILLS,
  formatSwimTime,
  GRADE_PRESETS,
  monthsBetween,
  parseSwimTime,
  personalBests,
  SKILL_LEVELS,
  standardGaps,
  STROKES,
  type SwimStandard,
  type SwimTime,
} from "@/lib/clubs/sports";
import type { Grade, SkillRating, Weight } from "@/lib/data/club-sport";
import { cn } from "@/lib/utils";

type Athlete = { id: string; full_name: string; group_ids: string[] };
type Group = { id: string; name: string; color: string };

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

const NotReady = () => (
  <Card>
    <CardContent className="py-6 text-sm text-muted">Ta zakładka zacznie działać po uruchomieniu migracji 20261117000100_sport_modules.sql w Supabase.</CardContent>
  </Card>
);

function GroupPicker({ groups, value, onChange }: { groups: Group[]; value: string; onChange: (v: string) => void }) {
  if (!groups.length) return null;
  return (
    <Select aria-label="Grupa" value={value} onChange={(e) => onChange(e.target.value)} className="w-fit">
      <option value="">Wszystkie grupy</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </Select>
  );
}

// ---------------------------------------------------------------- football skills
export function SkillsCard({ ready, today, groups, athletes, ratings }: { ready: boolean; today: string; groups: Group[]; athletes: Athlete[]; ratings: SkillRating[] }) {
  const { pending, run } = useAct();
  const [group, setGroup] = useState(groups[0]?.id ?? "");
  const [skill, setSkill] = useState(FOOTBALL_SKILLS[0].key);
  const [vals, setVals] = useState<Record<string, number>>({});
  if (!ready) return <NotReady />;
  const roster = athletes.filter((a) => !group || a.group_ids.includes(group)).sort((a, b) => a.full_name.localeCompare(b.full_name, "pl"));
  const latest = (id: string, key: string) => ratings.filter((r) => r.athlete_id === id && r.skill_key === key).sort((a, b) => b.rated_on.localeCompare(a.rated_on));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Umiejętności piłkarskie</CardTitle>
        <p className="text-sm text-muted">Raz na kwartał oceń każdą umiejętność w skali 1–5. Rodzic widzi postęp dziecka, a Ty widzisz, nad czym pracować z grupą.</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <GroupPicker groups={groups} value={group} onChange={setGroup} />
          <Select aria-label="Umiejętność" value={skill} onChange={(e) => (setSkill(e.target.value), setVals({}))} className="w-fit">
            {FOOTBALL_SKILLS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <ul className="grid gap-1.5">
          {roster.map((a) => {
            const hist = latest(a.id, skill);
            const cur = vals[a.id] ?? 0;
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{a.full_name}</span>
                {hist[0] ? (
                  <span className="text-[12px] text-muted">
                    ostatnio {hist[0].score}/5{hist[1] ? (hist[0].score > hist[1].score ? " ↑" : hist[0].score < hist[1].score ? " ↓" : "") : ""}
                  </span>
                ) : null}
                <span className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      title={SKILL_LEVELS[n]}
                      onClick={() => setVals({ ...vals, [a.id]: cur === n ? 0 : n })}
                      className={cn("num size-8 rounded-md border text-[13px] font-semibold", cur >= n && cur ? "border-foreground bg-foreground text-background" : "border-border text-muted")}
                    >
                      {n}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <Button
          className="w-fit"
          disabled={pending}
          onClick={() =>
            run(
              () => saveSkillRatings({ skill_key: skill, rated_on: today, rows: Object.entries(vals).filter(([, v]) => v > 0).map(([athlete_id, score]) => ({ athlete_id, score })) }),
              () => setVals({}),
            )
          }
        >
          Zapisz oceny
        </Button>
        <SkillMatrix athletes={roster} ratings={ratings} />
      </CardContent>
    </Card>
  );
}

function SkillMatrix({ athletes, ratings }: { athletes: Athlete[]; ratings: SkillRating[] }) {
  const last = (id: string, key: string) => ratings.filter((r) => r.athlete_id === id && r.skill_key === key).sort((a, b) => b.rated_on.localeCompare(a.rated_on))[0]?.score ?? null;
  if (!ratings.length) return null;
  const teamAvg = (key: string) => {
    const xs = athletes.map((a) => last(a.id, key)).filter((x): x is number => x !== null);
    return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
  };
  const weakest = FOOTBALL_SKILLS.map((s) => ({ s, avg: teamAvg(s.key) }))
    .filter((x) => x.avg !== null)
    .sort((a, b) => a.avg! - b.avg!)[0];
  return (
    <div className="grid gap-2 border-t border-border pt-4">
      {weakest ? (
        <p className="text-sm">
          <span className="text-muted">Najsłabsza umiejętność grupy: </span>
          <span className="font-semibold">{weakest.s.name}</span> <span className="num text-muted">(średnio {weakest.avg!.toFixed(1).replace(".", ",")})</span>
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead className="text-left text-[11px] text-muted">
            <tr>
              <th className="py-1 font-medium">Zawodnik</th>
              {FOOTBALL_SKILLS.map((s) => (
                <th key={s.key} className="py-1 font-medium">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="py-1 pr-2">{a.full_name}</td>
                {FOOTBALL_SKILLS.map((s) => {
                  const v = last(a.id, s.key);
                  return (
                    <td key={s.key} className="py-1">
                      {v === null ? <span className="text-subtle">–</span> : <span className={cn("num inline-block w-6 rounded text-center", v >= 4 ? "bg-done/15 text-done" : v <= 2 ? "bg-problem/10 text-problem" : "bg-surface-2")}>{v}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- swimming
export function SwimTab({
  ready,
  clubId,
  today,
  groups,
  athletes,
  times,
  standards,
  basics,
}: {
  ready: boolean;
  clubId: string;
  today: string;
  groups: Group[];
  athletes: Athlete[];
  times: SwimTime[];
  standards: SwimStandard[];
  basics: Record<string, { birth_year: number | null; sex: "f" | "m" | null }>;
}) {
  const { pending, run } = useAct();
  const [group, setGroup] = useState(groups[0]?.id ?? "");
  const [ev, setEv] = useState({ stroke: "free", distance: 50, pool: 25 as 25 | 50, date: today, competition: "" });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  if (!ready) return <NotReady />;
  const roster = athletes.filter((a) => !group || a.group_ids.includes(group)).sort((a, b) => a.full_name.localeCompare(b.full_name, "pl"));
  const pbOf = (id: string) => personalBests(times.filter((t) => t.athlete_id === id));
  const eventPb = (id: string) => pbOf(id).find((p) => p.stroke === ev.stroke && p.distance === ev.distance && p.pool === ev.pool) ?? null;

  const saveAll = async () => {
    const rows = Object.entries(vals)
      .map(([id, raw]) => ({ id, t: parseSwimTime(raw), raw }))
      .filter((r) => r.raw.trim());
    const bad = rows.filter((r) => r.t === null);
    if (bad.length) return void toast.error(`Popraw czas: ${bad.map((b) => athletes.find((a) => a.id === b.id)?.full_name).join(", ")}. Format np. 41,25 albo 1:05,30.`);
    let records = 0;
    for (const r of rows) {
      const pb = eventPb(r.id);
      const res = await saveSwimTime({ athlete_id: r.id, stroke: ev.stroke as "free", distance: ev.distance, pool: ev.pool, time_s: r.t!, swum_on: ev.date, competition: ev.competition });
      if (!res.ok) return void toast.error(res.error);
      if (pb && r.t! < pb.time_s) records++;
    }
    toast.success(`Zapisano czasy: ${rows.length}.${records ? ` Rekordy życiowe: ${records}!` : ""}`);
    setVals({});
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Wpisz czasy</CardTitle>
          <p className="text-sm text-muted">Z treningu albo zawodów, dla całej grupy naraz. Rekordy życiowe i limity liczą się same.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Styl" htmlFor="sw-st">
              <Select id="sw-st" value={ev.stroke} onChange={(e) => setEv({ ...ev, stroke: e.target.value })}>
                {STROKES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dystans" htmlFor="sw-d">
              <Select id="sw-d" value={ev.distance} onChange={(e) => setEv({ ...ev, distance: Number(e.target.value) })}>
                {DISTANCES.map((d) => (
                  <option key={d} value={d}>
                    {d} m
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Basen" htmlFor="sw-p">
              <Select id="sw-p" value={ev.pool} onChange={(e) => setEv({ ...ev, pool: Number(e.target.value) as 25 | 50 })}>
                <option value={25}>25 m</option>
                <option value={50}>50 m</option>
              </Select>
            </Field>
            <Field label="Data" htmlFor="sw-date">
              <Input id="sw-date" type="date" max={today} value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} />
            </Field>
            <Field label="Zawody" htmlFor="sw-c" hint="Puste = trening">
              <Input id="sw-c" value={ev.competition} onChange={(e) => setEv({ ...ev, competition: e.target.value })} />
            </Field>
          </div>
          <GroupPicker groups={groups} value={group} onChange={setGroup} />
          <ul className="grid gap-1.5">
            {roster.map((a) => {
              const pb = eventPb(a.id);
              const t = parseSwimTime(vals[a.id] ?? "");
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{a.full_name}</span>
                  <span className="num text-[12px] text-muted">{pb ? `PB ${formatSwimTime(pb.time_s)}` : "brak PB"}</span>
                  {t && pb && t < pb.time_s ? <Badge tone="done">nowy rekord</Badge> : null}
                  <Input aria-label={`Czas: ${a.full_name}`} inputMode="decimal" placeholder="np. 41,25" className="h-8 w-28" value={vals[a.id] ?? ""} onChange={(e) => setVals({ ...vals, [a.id]: e.target.value })} />
                </li>
              );
            })}
          </ul>
          <Button className="w-fit" disabled={pending} onClick={() => run(async () => (await saveAll(), { ok: true }))}>
            Zapisz czasy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekordy i limity</CardTitle>
          <p className="text-sm text-muted">Przy każdym zawodniku: rekordy życiowe i ile sekund brakuje do limitów, które ustawisz niżej (np. na mistrzostwa województwa).</p>
        </CardHeader>
        <CardContent className="grid gap-2">
          {roster.map((a) => {
            const pbs = pbOf(a.id);
            const gaps = standardGaps(pbs, standards, basics[a.id] ?? { birth_year: null, sex: null });
            const nearest = gaps.find((g) => g.gap !== null && g.gap > 0);
            const made = gaps.filter((g) => g.gap !== null && g.gap <= 0).length;
            return (
              <div key={a.id} className="rounded-md border border-border">
                <button type="button" className="flex w-full flex-wrap items-center gap-3 px-3 py-2 text-left text-sm" onClick={() => setOpen(open === a.id ? null : a.id)}>
                  <span className="min-w-0 flex-1 truncate">{a.full_name}</span>
                  {made ? (
                    <Badge tone="done">
                      <Trophy className="size-3" /> limity: {made}
                    </Badge>
                  ) : null}
                  {nearest ? (
                    <span className="num text-[12px] text-muted">
                      {nearest.standard.name}: brakuje {nearest.gap!.toFixed(2).replace(".", ",")} s
                    </span>
                  ) : null}
                  <span className="text-[12px] text-subtle">{pbs.length} rekordów</span>
                </button>
                {open === a.id ? (
                  <div className="grid gap-3 border-t border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="text-muted">Płeć (do limitów):</span>
                      {(["f", "m"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => run(() => setAthleteSex(a.id, basics[a.id]?.sex === s ? null : s))}
                          className={cn("rounded-full border px-2.5 py-0.5", basics[a.id]?.sex === s ? "border-foreground bg-foreground text-background" : "border-border text-muted")}
                        >
                          {s === "f" ? "dziewczyna" : "chłopak"}
                        </button>
                      ))}
                    </div>
                    {pbs.length ? (
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {pbs.map((p) => (
                          <li key={`${p.stroke}${p.distance}${p.pool}`} className="flex justify-between gap-2">
                            <span className="text-muted">{eventName(p.stroke, p.distance, p.pool)}</span>
                            <span className="num font-medium">{formatSwimTime(p.time_s)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted">Brak czasów.</p>
                    )}
                    {gaps.length ? (
                      <ul className="grid gap-1">
                        {gaps.map((g) => (
                          <li key={g.standard.id} className="flex flex-wrap justify-between gap-2">
                            <span>
                              {g.standard.name} <span className="text-muted">· {eventName(g.standard.stroke, g.standard.distance, g.standard.pool)} · limit {formatSwimTime(g.standard.time_s)}</span>
                            </span>
                            <span className={cn("num", g.gap === null ? "text-subtle" : g.gap <= 0 ? "text-done" : "text-muted")}>
                              {g.gap === null ? "brak czasu" : g.gap <= 0 ? "zrobiony ✓" : `brakuje ${g.gap.toFixed(2).replace(".", ",")} s`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <TimesList times={times.filter((t) => t.athlete_id === a.id)} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <StandardsCard clubId={clubId} standards={standards} />
    </div>
  );
}

function TimesList({ times }: { times: SwimTime[] }) {
  const { run } = useAct();
  const recent = times.slice().sort((a, b) => b.swum_on.localeCompare(a.swum_on)).slice(0, 8);
  if (!recent.length) return null;
  return (
    <details className="text-[13px]">
      <summary className="cursor-pointer text-muted">Ostatnie czasy ({times.length})</summary>
      <ul className="mt-2 grid gap-1">
        {recent.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span className="num w-20 text-muted">{t.swum_on.split("-").reverse().join(".")}</span>
            <span className="flex-1">{eventName(t.stroke, t.distance, t.pool)}</span>
            <span className="num">{formatSwimTime(t.time_s)}</span>
            <span className="text-subtle">{t.competition ?? "trening"}</span>
            <button type="button" aria-label="Usuń czas" className="text-muted hover:text-problem" onClick={() => run(() => deleteSwimTime(t.id))}>
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function StandardsCard({ clubId, standards }: { clubId: string; standards: SwimStandard[] }) {
  const { pending, run } = useAct();
  const [v, setV] = useState({ name: "", stroke: "free", distance: 50, pool: 25 as 25 | 50, sex: "" as "" | "f" | "m", from: "", to: "", time: "" });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Limity na zawody</CardTitle>
        <p className="text-sm text-muted">Wpisz limity czasowe z regulaminu zawodów. Aplikacja pokaże, kto już je zrobił i komu ile brakuje.</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Nazwa" htmlFor="ss-n" className="sm:col-span-2">
            <Input id="ss-n" placeholder="np. MW Mazowsza 12-latków" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Styl" htmlFor="ss-s">
            <Select id="ss-s" value={v.stroke} onChange={(e) => setV({ ...v, stroke: e.target.value })}>
              {STROKES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dystans" htmlFor="ss-d">
            <Select id="ss-d" value={v.distance} onChange={(e) => setV({ ...v, distance: Number(e.target.value) })}>
              {DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d} m
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Basen" htmlFor="ss-p">
            <Select id="ss-p" value={v.pool} onChange={(e) => setV({ ...v, pool: Number(e.target.value) as 25 | 50 })}>
              <option value={25}>25 m</option>
              <option value={50}>50 m</option>
            </Select>
          </Field>
          <Field label="Płeć" htmlFor="ss-x">
            <Select id="ss-x" value={v.sex} onChange={(e) => setV({ ...v, sex: e.target.value as "" | "f" | "m" })}>
              <option value="">Wszyscy</option>
              <option value="f">Dziewczęta</option>
              <option value="m">Chłopcy</option>
            </Select>
          </Field>
          <Field label="Roczniki" htmlFor="ss-f" hint="np. 2014–2015">
            <div className="flex gap-2">
              <Input id="ss-f" inputMode="numeric" placeholder="od" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              <Input aria-label="do rocznika" inputMode="numeric" placeholder="do" value={v.to} onChange={(e) => setV({ ...v, to: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </div>
          </Field>
          <Field label="Limit" htmlFor="ss-t" hint="np. 38,50 albo 1:22,00">
            <Input id="ss-t" inputMode="decimal" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} />
          </Field>
        </div>
        <Button
          className="w-fit"
          variant="outline"
          disabled={pending}
          onClick={() => {
            const t = parseSwimTime(v.time);
            if (!t) return void toast.error("Wpisz limit, np. 38,50 albo 1:22,00.");
            run(
              () =>
                saveSwimStandard({
                  club_id: clubId,
                  name: v.name,
                  stroke: v.stroke as "free",
                  distance: v.distance,
                  pool: v.pool,
                  sex: v.sex,
                  birth_year_from: v.from.length === 4 ? Number(v.from) : null,
                  birth_year_to: v.to.length === 4 ? Number(v.to) : null,
                  time_s: t,
                }),
              () => setV({ ...v, time: "" }),
            );
          }}
        >
          Dodaj limit
        </Button>
        {standards.length ? (
          <ul className="grid gap-1 text-sm">
            {standards.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 border-t border-border pt-1.5">
                <span className="flex-1">
                  {s.name} <span className="text-muted">· {eventName(s.stroke, s.distance, s.pool)}{s.sex ? ` · ${s.sex === "f" ? "dz." : "chł."}` : ""}{s.birth_year_from || s.birth_year_to ? ` · ${s.birth_year_from ?? ""}–${s.birth_year_to ?? ""}` : ""}</span>
                </span>
                <span className="num">{formatSwimTime(s.time_s)}</span>
                <button type="button" aria-label="Usuń limit" className="text-muted hover:text-problem" onClick={() => run(() => deleteSwimStandard(s.id))}>
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- martial arts
export function GradesTab({
  ready,
  clubId,
  today,
  minMonths,
  groups,
  athletes,
  grades,
  weights,
}: {
  ready: boolean;
  clubId: string;
  today: string;
  minMonths: number;
  groups: Group[];
  athletes: Athlete[];
  grades: Grade[];
  weights: Weight[];
}) {
  const { pending, run } = useAct();
  const [group, setGroup] = useState(groups[0]?.id ?? "");
  const [preset, setPreset] = useState(0);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [g, setG] = useState({ grade: GRADE_PRESETS[0].grades[0].grade, color: GRADE_PRESETS[0].grades[0].color, date: today, examiner: "" });
  const [wv, setWv] = useState<Record<string, string>>({});
  const [months, setMonths] = useState(String(minMonths));
  const roster = useMemo(() => athletes.filter((a) => !group || a.group_ids.includes(group)).sort((a, b) => a.full_name.localeCompare(b.full_name, "pl")), [athletes, group]);
  if (!ready) return <NotReady />;
  const current = (id: string) => grades.filter((x) => x.athlete_id === id).sort((a, b) => b.awarded_on.localeCompare(a.awarded_on))[0] ?? null;
  const lastW = (id: string) => weights.filter((w) => w.athlete_id === id).sort((a, b) => b.measured_on.localeCompare(a.measured_on));
  const readyFor = roster.filter((a) => {
    const c = current(a.id);
    return !c || monthsBetween(c.awarded_on, today) >= minMonths;
  });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Stopnie i pasy</CardTitle>
          <p className="text-sm text-muted">
            Aktualny stopień każdego zawodnika i historia egzaminów. Gotowi do egzaminu: co najmniej {minMonths} mies. od ostatniego stopnia. Teraz: <span className="font-semibold text-foreground">{readyFor.length}</span>.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <GroupPicker groups={groups} value={group} onChange={setGroup} />
          <ul className="grid gap-1.5">
            {roster.map((a) => {
              const c = current(a.id);
              const m = c ? monthsBetween(c.awarded_on, today) : null;
              const isReady = m === null || m >= minMonths;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <Checkbox
                    aria-label={`Wybierz ${a.full_name}`}
                    checked={pick.has(a.id)}
                    onChange={(e) => {
                      const n = new Set(pick);
                      if (e.target.checked) n.add(a.id);
                      else n.delete(a.id);
                      setPick(n);
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{a.full_name}</span>
                  {c ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="h-2.5 w-6 rounded-sm border border-border" style={{ background: c.color ?? "transparent" }} />
                      <span className="font-medium">{c.grade}</span>
                      <span className="text-[12px] text-muted">od {m} mies.</span>
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted">bez stopnia</span>
                  )}
                  {isReady ? <Badge tone="done">gotowy do egzaminu</Badge> : null}
                </li>
              );
            })}
          </ul>
          <div className="grid gap-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Wpisz zdany egzamin ({pick.size} zaznaczonych)</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="System" htmlFor="gr-p">
                <Select
                  id="gr-p"
                  value={preset}
                  onChange={(e) => {
                    const i = Number(e.target.value);
                    setPreset(i);
                    setG({ ...g, grade: GRADE_PRESETS[i].grades[0].grade, color: GRADE_PRESETS[i].grades[0].color });
                  }}
                >
                  {GRADE_PRESETS.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Stopień" htmlFor="gr-g">
                <Select
                  id="gr-g"
                  value={g.grade}
                  onChange={(e) => {
                    const x = GRADE_PRESETS[preset].grades.find((y) => y.grade === e.target.value);
                    setG({ ...g, grade: e.target.value, color: x?.color ?? g.color });
                  }}
                >
                  {GRADE_PRESETS[preset].grades.map((x) => (
                    <option key={x.grade} value={x.grade}>
                      {x.grade}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Data" htmlFor="gr-d">
                <Input id="gr-d" type="date" max={today} value={g.date} onChange={(e) => setG({ ...g, date: e.target.value })} />
              </Field>
              <Field label="Egzaminator" htmlFor="gr-e" hint="Opcjonalnie">
                <Input id="gr-e" value={g.examiner} onChange={(e) => setG({ ...g, examiner: e.target.value })} />
              </Field>
            </div>
            <Button
              className="w-fit"
              disabled={pending || !pick.size}
              onClick={() => run(() => saveGrades({ athlete_ids: [...pick], grade: g.grade, color: g.color, awarded_on: g.date, examiner: g.examiner }), () => setPick(new Set()))}
            >
              Zapisz egzamin
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Minimalna przerwa między egzaminami" unit="mies." htmlFor="gr-m">
              <Input id="gr-m" inputMode="numeric" className="w-24" value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setClubGradeInterval(clubId, Number(months)))}>
              Zapisz
            </Button>
          </div>
          <GradeHistory grades={grades.filter((x) => roster.some((a) => a.id === x.athlete_id))} athletes={athletes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ważenie</CardTitle>
          <p className="text-sm text-muted">Wpisz wagi z ważenia. W zakładce Turnieje przy każdym zawodniku zobaczysz, ile brakuje mu do limitu jego kategorii.</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ul className="grid gap-1.5">
            {roster.map((a) => {
              const ws = lastW(a.id);
              const diff = ws[1] ? Math.round((ws[0].weight_kg - ws[1].weight_kg) * 10) / 10 : null;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{a.full_name}</span>
                  {ws[0] ? (
                    <span className="num text-[12px] text-muted">
                      {ws[0].weight_kg.toLocaleString("pl-PL")} kg ({ws[0].measured_on.split("-").reverse().slice(0, 2).join(".")})
                      {diff ? ` ${diff > 0 ? "+" : ""}${diff.toLocaleString("pl-PL")}` : ""}
                    </span>
                  ) : null}
                  <Input aria-label={`Waga: ${a.full_name}`} inputMode="decimal" placeholder="kg" className="h-8 w-20" value={wv[a.id] ?? ""} onChange={(e) => setWv({ ...wv, [a.id]: e.target.value })} />
                </li>
              );
            })}
          </ul>
          <Button
            className="w-fit"
            disabled={pending}
            onClick={() => {
              const rows = Object.entries(wv)
                .filter(([, x]) => x.trim())
                .map(([athlete_id, x]) => ({ athlete_id, weight_kg: Number(x.replace(",", ".")) }));
              if (rows.some((r) => !Number.isFinite(r.weight_kg))) return void toast.error("Wpisz wagę liczbą, np. 52,4.");
              run(() => saveWeights({ measured_on: today, rows }), () => setWv({}));
            }}
          >
            Zapisz ważenie
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GradeHistory({ grades, athletes }: { grades: Grade[]; athletes: Athlete[] }) {
  const { run } = useAct();
  if (!grades.length) return null;
  const recent = grades.slice().sort((a, b) => b.awarded_on.localeCompare(a.awarded_on)).slice(0, 12);
  return (
    <details className="text-[13px]">
      <summary className="cursor-pointer text-muted">Historia egzaminów</summary>
      <ul className="mt-2 grid gap-1">
        {recent.map((x) => (
          <li key={x.id} className="flex items-center gap-2">
            <span className="num w-20 text-muted">{x.awarded_on.split("-").reverse().join(".")}</span>
            <span aria-hidden className="h-2 w-4 rounded-sm border border-border" style={{ background: x.color ?? "transparent" }} />
            <span className="flex-1">
              {athletes.find((a) => a.id === x.athlete_id)?.full_name}: {x.grade}
            </span>
            <span className="text-subtle">{x.examiner ?? ""}</span>
            <button type="button" aria-label="Usuń wpis" className="text-muted hover:text-problem" onClick={() => run(() => deleteGrade(x.id))}>
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
