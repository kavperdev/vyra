"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Save, Trash2, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { deleteFitnessResult, saveFitnessResults, sendDevelopmentReports } from "@/lib/actions/club-development";
import { FITNESS_TESTS, fitnessTest, formatFitnessValue, improvementPct, parseFitnessValue, type FitnessResult } from "@/lib/clubs/fitness";
import { cn } from "@/lib/utils";

const fmt = (iso: string) => iso.split("-").reverse().join(".");

interface Props {
  clubId: string;
  today: string;
  ready: boolean;
  mailReady: boolean;
  groups: { id: string; name: string; color: string }[];
  athletes: { id: string; full_name: string; group_ids: string[] }[];
  results: FitnessResult[];
}

/** Coach side of the athlete development card: enter a test for a group, see progress and rankings. */
export function DevelopmentTab({ clubId, today, ready, mailReady, groups, athletes, results }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [testKey, setTestKey] = useState("sprint_60");
  const [date, setDate] = useState(today);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const test = fitnessTest(testKey)!;
  const roster = athletes.filter((a) => !groupId || a.group_ids.includes(groupId)).sort((a, b) => a.full_name.localeCompare(b.full_name, "pl"));

  const lastOf = (athleteId: string, key: string) =>
    results.filter((r) => r.athlete_id === athleteId && r.test_key === key && r.tested_on < date).sort((a, b) => b.tested_on.localeCompare(a.tested_on))[0] ?? null;
  const onDay = (athleteId: string) => results.find((r) => r.athlete_id === athleteId && r.test_key === testKey && r.tested_on === date) ?? null;

  const save = () => {
    const rows: { athlete_id: string; value: number }[] = [];
    const bad: string[] = [];
    for (const a of roster) {
      const raw = values[a.id];
      if (!raw?.trim()) continue;
      const v = parseFitnessValue(raw, test);
      if (v === null) bad.push(a.full_name);
      else rows.push({ athlete_id: a.id, value: v });
    }
    if (bad.length) return void toast.error(`Popraw wynik: ${bad.join(", ")} (${test.hint}).`);
    start(async () => {
      const res = await saveFitnessResults({ test_key: testKey, tested_on: date, rows });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Zapisano.");
      setValues({});
      router.refresh();
    });
  };

  // Progress: per athlete in the picked group, the latest result of the picked test and the change since the one before.
  const progress = useMemo(() => {
    return roster
      .map((a) => {
        const rs = results.filter((r) => r.athlete_id === a.id && r.test_key === testKey).sort((x, y) => x.tested_on.localeCompare(y.tested_on));
        if (!rs.length) return null;
        const latest = rs[rs.length - 1];
        const prev = rs.length > 1 ? rs[rs.length - 2] : null;
        const best = rs.reduce((b, r) => (test.lowerIsBetter ? (r.value < b.value ? r : b) : r.value > b.value ? r : b));
        return { a, latest, prev, best, change: prev ? improvementPct(prev.value, latest.value, test) : null };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((x, y) => (test.lowerIsBetter ? x.latest.value - y.latest.value : y.latest.value - x.latest.value));
  }, [roster, results, testKey, test]);

  const topMovers = useMemo(() => {
    const all: { name: string; test: string; change: number; value: string }[] = [];
    for (const a of roster) {
      for (const t of FITNESS_TESTS) {
        const rs = results.filter((r) => r.athlete_id === a.id && r.test_key === t.key).sort((x, y) => x.tested_on.localeCompare(y.tested_on));
        if (rs.length < 2) continue;
        const ch = improvementPct(rs[rs.length - 2].value, rs[rs.length - 1].value, t);
        if (ch > 0) all.push({ name: a.full_name, test: t.short, change: ch, value: formatFitnessValue(rs[rs.length - 1].value, t) });
      }
    }
    return all.sort((x, y) => y.change - x.change).slice(0, 3);
  }, [roster, results]);

  if (!ready)
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted">Karta rozwoju nie jest jeszcze włączona. Uruchom migrację 20261114000100_athlete_development.sql w Supabase.</CardContent>
      </Card>
    );

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Wpisz wyniki testu</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Test" htmlFor="ft-test">
              <Select id="ft-test" value={testKey} onChange={(e) => setTestKey(e.target.value)}>
                {FITNESS_TESTS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data testu" htmlFor="ft-date">
              <Input id="ft-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Grupa" htmlFor="ft-group">
              <Select id="ft-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Wszyscy zawodnicy</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {roster.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="py-2 pr-3 font-medium">Zawodnik</th>
                    <th className="py-2 pr-3 font-medium">Poprzedni wynik</th>
                    <th className="py-2 font-medium">Wynik ({test.hint})</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((a) => {
                    const last = lastOf(a.id, testKey);
                    const saved = onDay(a.id);
                    return (
                      <tr key={a.id} className="border-t border-border">
                        <td className="py-2 pr-3">{a.full_name}</td>
                        <td className="num py-2 pr-3 text-muted">{last ? `${formatFitnessValue(last.value, test)} · ${fmt(last.tested_on)}` : "—"}</td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-2">
                            <Input
                              aria-label={`Wynik: ${a.full_name}`}
                              inputMode="decimal"
                              className="h-9 w-32"
                              placeholder={saved ? formatFitnessValue(saved.value, test, false) : ""}
                              value={values[a.id] ?? ""}
                              onChange={(e) => setValues({ ...values, [a.id]: e.target.value })}
                            />
                            {saved ? (
                              <button
                                type="button"
                                aria-label="Usuń zapisany wynik"
                                className="text-subtle hover:text-problem"
                                onClick={() =>
                                  saved.id &&
                                  start(async () => {
                                    const res = await deleteFitnessResult(saved.id!);
                                    if (!res.ok) return void toast.error(res.error);
                                    router.refresh();
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">W tej grupie nie ma zawodników.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="accent" onClick={save} disabled={pending || !roster.length}>
              <Save className="size-4" /> Zapisz wyniki
            </Button>
            <p className="text-[12px] text-subtle">Puste pola są pomijane. Wynik z tego samego dnia zastępuje poprzedni.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4" /> {test.name}: ranking i postęp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progress.length ? (
              <ol className="grid gap-1.5">
                {progress.map((p, i) => (
                  <li key={p.a.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="num w-6 text-muted">{i + 1}.</span>
                    <span className="min-w-0 flex-1">{p.a.full_name}</span>
                    <span className="num font-semibold">{formatFitnessValue(p.latest.value, test)}</span>
                    {p.change !== null ? (
                      <span className={cn("num w-16 text-right text-[12px]", p.change > 0 ? "text-done" : p.change < 0 ? "text-problem" : "text-muted")}>
                        {p.change > 0 ? "+" : ""}
                        {p.change.toLocaleString("pl-PL")}%
                      </span>
                    ) : (
                      <span className="w-16 text-right text-[12px] text-subtle">pierwszy</span>
                    )}
                    <span className="w-24 text-right text-[11px] text-subtle">{fmt(p.latest.tested_on)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Nikt z tej grupy nie ma jeszcze wyniku w tym teście.</p>
            )}
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4" /> Największy postęp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topMovers.length ? (
                <ul className="grid gap-2">
                  {topMovers.map((m) => (
                    <li key={`${m.name}-${m.test}`} className="text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted">
                        {" "}
                        · {m.test} {m.value}
                      </span>
                      <span className="num ml-1 text-done">+{m.change.toLocaleString("pl-PL")}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Postęp pojawi się po drugim teście tych samych zawodników.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-4" /> Podsumowanie dla rodziców
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm text-muted">Każdy opiekun z e-mailem dostaje frekwencję dziecka z 30 dni, wyniki ostatnich testów z postępem i link do strony dziecka.</p>
              <Button
                variant="outline"
                className="w-fit"
                disabled={pending || !mailReady}
                onClick={() =>
                  confirm("Wysłać podsumowanie miesiąca do wszystkich opiekunów z e-mailem?") &&
                  start(async () => {
                    const res = await sendDevelopmentReports(clubId);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(res.message ?? "Wysłano.");
                  })
                }
              >
                <Mail className="size-4" /> Wyślij rodzicom
              </Button>
              {!mailReady ? <p className="text-[12px] text-subtle">Wysyłka e-maili nie jest skonfigurowana.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
