import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { MethodCheckin, MethodControls } from "@/components/method/checkin";
import { MethodQuestionnaire } from "@/components/method/questionnaire";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { answersFrom, EMPTY_ANSWERS } from "@/lib/method/answers";
import { fmtPace, fmtTime, zonesFor } from "@/lib/method/engine";
import { ensureWeeks, loadMethod } from "@/lib/method/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "VYRA Method" };

const PERIOD: Record<string, string> = {
  base: "Baza",
  build: "Rozwój progu",
  specific: "Okres startowy",
  taper: "Taper",
  race: "Tydzień startu",
  general: "Budowanie formy",
};
const DOW = ["nd", "pn", "wt", "śr", "cz", "pt", "so"];
const dayName = (iso: string) => `${DOW[new Date(`${iso}T12:00:00Z`).getUTCDay()]} ${iso.slice(8)}.${iso.slice(5, 7)}`;

export default async function MethodPage({ searchParams }: { searchParams: Promise<{ edytuj?: string }> }) {
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO();
  const { edytuj } = await searchParams;
  let data = await loadMethod(supabase, user.id);

  if (data.access === null || !data.access) {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <PageHeader eyebrow="VYRA Method" title="Plan z metody trenerów VYRA" description="Twój plan na każdy tydzień, ułożony z Twoich danych i dopasowywany po każdym tygodniu." />
        <Card>
          <CardContent className="grid gap-3 pt-5 text-sm">
            <p>{data.access === null ? "VYRA Method uruchamiamy na Twoim koncie. Zajrzyj tu za chwilę." : "Nie masz jeszcze dostępu do VYRA Method."}</p>
            {data.access === false ? (
              <Button asChild variant="accent">
                <Link href="/metoda">
                  Zobacz VYRA Method <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data.profile || edytuj) {
    const editing = !!data.profile;
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <PageHeader
          eyebrow="VYRA Method"
          title={editing ? "Zmień swoje dane" : "Ułóżmy Twój plan"}
          description={
            editing
              ? "Zmieniła się waga, czas albo cel? Popraw odpowiedzi, a kolejne tygodnie je uwzględnią. Treningi już w kalendarzu zostają."
              : "Około 4 minut. Na tej podstawie metoda trenerów VYRA dobierze poziom, tempa, tętno i tempo przyrostu obciążeń. Im dokładniej, tym lepiej."
          }
        />
        <MethodQuestionnaire initial={data.profile ? answersFrom(data.profile.answers) : EMPTY_ANSWERS} today={today} editing={editing} />
      </div>
    );
  }

  if ((await ensureWeeks(supabase, user.id, data)) > 0) data = await loadMethod(supabase, user.id);
  const p = data.profile!;
  const a = p.assessment;
  const p5k = p.state?.p5k ?? a?.p5k ?? null;
  const zones = p5k ? zonesFor(p5k) : null;
  const weeks = data.weeks;
  const current = weeks.find((w) => w.week_start <= today) ?? null;
  const next = weeks.find((w) => w.week_start > today) ?? null;
  const ids = [...(current?.session_ids ?? []), ...(next?.session_ids ?? []), ...weeks.slice(0, 3).flatMap((w) => w.session_ids)];
  const { data: rows } = ids.length
    ? await supabase.from("training_sessions").select("id, title, category, scheduled_date, status, planned_duration_s").in("id", [...new Set(ids)]).order("scheduled_date")
    : { data: [] };
  const sessions = (rows ?? []) as { id: string; title: string; category: string; scheduled_date: string; status: string; planned_duration_s: number | null }[];
  const byWeek = (ids: string[]) => sessions.filter((s) => ids.includes(s.id));

  // Check-in: the most recent week from Friday on, without a summary yet (at most two weeks back).
  const fourDaysAgo = new Date(Date.parse(`${today}T12:00:00Z`) - 4 * 86_400_000).toISOString().slice(0, 10);
  const twoWeeks = new Date(Date.parse(`${today}T12:00:00Z`) - 14 * 86_400_000).toISOString().slice(0, 10);
  const due = weeks.find((w) => !w.checkin && w.week_start <= fourDaysAgo && w.week_start >= twoWeeks) ?? null;
  const dueTest = due ? byWeek(due.session_ids).some((s) => s.category === "test") : false;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        eyebrow="VYRA Method"
        title={current ? `Tydzień ${current.idx}: ${PERIOD[current.plan.period] ?? ""}` : "Twój plan"}
        description="Plan z metody trenerów VYRA, ułożony z Twoich danych. Co tydzień dopasowuje się do tego, jak trenujesz i jak się czujesz."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/athlete/metoda?edytuj=1">Zmień dane</Link>
          </Button>
        }
      />

      {a && !a.eligible ? (
        <Card className="border-problem/40">
          <CardContent className="grid gap-2 pt-5 text-sm">
            <p className="font-semibold">Plan czeka</p>
            {a.blockers.map((b) => (
              <p key={b}>{b}</p>
            ))}
            <p className="text-muted">Gdy sytuacja się zmieni, popraw odpowiedzi w „Zmień dane”.</p>
          </CardContent>
        </Card>
      ) : null}

      {!p.active ? (
        <Card>
          <CardContent className="pt-5 text-sm">Plan jest wstrzymany. Nowe tygodnie pojawią się po wznowieniu.</CardContent>
        </Card>
      ) : null}

      {due ? (
        <Card className="border-foreground/30">
          <CardHeader>
            <CardTitle>Podsumuj tydzień {due.idx}</CardTitle>
            <p className="text-sm text-muted">20 sekund. Od tego zależy, czy następny tydzień będzie mocniejszy, taki sam, czy lżejszy.</p>
          </CardHeader>
          <CardContent>
            <MethodCheckin weekId={due.id} hasTest={dueTest} testDistance={a?.level === "beginner" ? 3000 : 5000} />
          </CardContent>
        </Card>
      ) : null}

      {[current, next].filter(Boolean).map((w) => (
        <Card key={w!.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {w === next ? "Następny tydzień" : "Ten tydzień"}
              <span className="text-sm font-normal text-muted">od {dayName(w!.week_start)}</span>
              {w!.plan.lighter ? <Badge>lżejszy</Badge> : null}
              {w!.plan.mode === "easy" ? <Badge>tylko spokojnie</Badge> : w!.plan.mode === "hold" ? <Badge>bez zwiększania</Badge> : null}
              {w!.plan.km ? <span className="num ml-auto text-sm font-normal text-muted">ok. {w!.plan.km} km</span> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="grid gap-2">
              {byWeek(w!.session_ids).map((s) => (
                <li key={s.id}>
                  <Link href={`/athlete/sessions/${s.id}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-surface-2">
                    <span className="w-14 shrink-0 text-[12px] text-muted">{dayName(s.scheduled_date)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</span>
                    {s.status === "completed" ? <Badge>zrobione</Badge> : s.planned_duration_s ? <span className="num text-[12px] text-muted">{Math.round(s.planned_duration_s / 60)} min</span> : null}
                  </Link>
                </li>
              ))}
              {!byWeek(w!.session_ids).length ? <li className="text-sm text-muted">Treningi tego tygodnia już minęły albo plan zaczął się w jego trakcie.</li> : null}
            </ul>
            <div className="grid gap-1.5 text-sm">
              <p className="font-medium">Dlaczego tak</p>
              {w!.plan.notes.map((n) => (
                <p key={n} className="text-muted">
                  {n}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {!current && !next && p.active && a?.eligible ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 text-sm">
            <CalendarDays className="size-5 text-muted" />
            Pierwszy tydzień pojawi się tu najpóźniej w poniedziałek.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Twoje tempa</CardTitle>
            <p className="text-sm text-muted">{p5k ? `Z formy na 5 km: ${fmtTime(p5k)}. Przeliczamy je po każdym teście.` : "Pojawią się po pierwszym teście."}</p>
          </CardHeader>
          {zones ? (
            <CardContent className="grid gap-1.5 text-sm">
              {(
                [
                  ["Spokojnie", zones.easy],
                  ["Tempo maratońskie", zones.marathon],
                  ["Próg (6–7/10)", zones.threshold],
                  ["Tempo 10 km", zones.tenK],
                  ["Tempo 5 km", zones.vo2],
                ] as const
              ).map(([n, z]) => (
                <p key={n} className="flex justify-between gap-3">
                  <span className="text-muted">{n}</span>
                  <span className="num font-medium">
                    {fmtPace(z[0])}–{fmtPace(z[1])}/km
                  </span>
                </p>
              ))}
              {a?.hr ? (
                <p className="mt-2 text-[12px] text-subtle">
                  Tętno: spokojnie do {a.hr.easyMax}, próg {a.hr.thresholdMin}–{a.hr.thresholdMax} ({a.hr.basis}).
                </p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Masz pytanie do trenera?</CardTitle>
            <p className="text-sm text-muted">Za VYRA Method stoi metoda prawdziwych trenerów. Jeśli chcesz, żeby trener prowadził Cię osobiście i odpowiadał na pytania, przejdź na prowadzenie.</p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/prowadzenie">
                Prowadzenie z trenerem <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {a?.notes.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Jak metoda dopasowała plan do Ciebie</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted">
            {a.notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <MethodControls active={p.active} />
    </div>
  );
}
