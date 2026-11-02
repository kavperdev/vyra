import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, ProgressBar } from "@/components/ui/misc";
import { FollowUpRow, type FollowUp } from "@/components/coach/follow-up";
import { requireRole } from "@/lib/auth";
import { listRunClubEvents, listRunClubSignups } from "@/lib/data/club";
import { formatDate } from "@/lib/format";
import { FREE_PLAN_NAME } from "@/lib/free-plan";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";
import { sourceLabel } from "@/lib/source-label";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Rozwój", "Growth") };
}

/** Monthly targets from the growth strategy (cumulative free plans and paying athletes, Run Club average). */
const TARGETS: Record<string, { free: number; paid: number; club: number }> = {
  "2026-11": { free: 50, paid: 2, club: 5 },
  "2026-12": { free: 110, paid: 5, club: 10 },
  "2027-01": { free: 200, paid: 10, club: 15 },
  "2027-02": { free: 270, paid: 15, club: 18 },
  "2027-03": { free: 330, paid: 20, club: 20 },
  "2027-04": { free: 400, paid: 25, club: 20 },
};

interface App {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  kind: string;
  package: string | null;
  goal: string | null;
  status: string;
  source?: string | null;
}

const DAY = 864e5;

/** "Minęły 2 tygodnie" / "Minęło 5 tygodni". */
const weeksPl = (n: number) => (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `Minęły ${n} tygodnie` : `Minęło ${n} tygodni`);

function Goal({ label, value, target, hint }: { label: string; value: number; target: number; hint?: string }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <Card>
      <CardContent className="grid gap-2 pt-5">
        <p className="eyebrow">{label}</p>
        <p className="num text-[26px] font-semibold leading-none">
          {value}
          <span className="text-base font-normal text-muted"> / {target}</span>
        </p>
        <ProgressBar value={pct} tone={pct >= 100 ? "accent" : "default"} />
        {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function GrowthPage() {
  await getLang();
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const supabase = await createClient();
  const cols = "id, created_at, full_name, email, kind, package, goal, status";
  const withSource = await supabase.from("applications").select(`${cols}, source`).order("created_at", { ascending: false }).limit(1000);
  const res: { data: unknown[] | null } = withSource.error
    ? await supabase.from("applications").select(cols).order("created_at", { ascending: false }).limit(1000)
    : withSource;
  const apps = (res.data ?? []) as App[];
  const [events, signups] = await Promise.all([listRunClubEvents(supabase), listRunClubSignups(supabase)]);

  const now = Date.now();
  const month = new Date().toISOString().slice(0, 7);
  const monthKeys = Object.keys(TARGETS);
  const target = TARGETS[month] ?? TARGETS[monthKeys.find((k) => k >= month) ?? monthKeys[monthKeys.length - 1]];

  const isFree = (a: App) => a.package === FREE_PLAN_NAME;
  const isPaid = (a: App) => (a.goal ?? "").startsWith("OPŁACONE ONLINE");
  const free = apps.filter(isFree);
  const paid = apps.filter(isPaid);
  const paidEmails = new Set(paid.map((a) => a.email.toLowerCase()));
  const freeEmails = new Set(free.map((a) => a.email.toLowerCase()));
  const payingPeople = paidEmails.size;
  const converted = [...freeEmails].filter((e) => paidEmails.has(e)).length;
  const inMonth = (a: App) => a.created_at.slice(0, 7) === month;
  const freeMonth = free.filter(inMonth).length;
  const paidMonth = paid.filter(inMonth).length;

  // Run Club: average sign-ups on the last 4 past events.
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now).slice(-4);
  const count = (id: string) => signups.filter((s) => s.event_id === id).length;
  const clubAvg = past.length ? Math.round(past.reduce((n, e) => n + count(e.id), 0) / past.length) : 0;
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now).slice(0, 3);

  // Who to contact today.
  const first = (n: string) => n.split(" ")[0];
  const follow: FollowUp[] = [];
  for (const a of apps.filter((x) => x.status === "new" && isPaid(x))) {
    follow.push({
      id: a.id,
      name: a.full_name,
      email: a.email,
      tone: "paid",
      reason: tl(`Opłacił(a) ${a.package ?? "pakiet"} ${formatDate(a.created_at.slice(0, 10), "d MMM")}: zaproś do platformy i umów rozmowę`, `Paid for ${a.package ?? "a package"}: invite to the platform and book a call`),
      subject: "Witaj w VYRA! Kolejne kroki",
      body: `Cześć ${first(a.full_name)}!\n\nDziękuję za zakup pakietu ${a.package ?? ""}. Za chwilę dostaniesz zaproszenie do aplikacji VYRA. Po założeniu konta wypełnij ankietę startową (5 minut).\n\nKiedy pasuje Ci 20-minutowa rozmowa w tym tygodniu? Podaj 2–3 terminy.\n\nKacper, VYRA`,
    });
  }
  for (const a of apps.filter((x) => x.status === "new" && !isPaid(x) && !isFree(x) && x.kind !== "camp")) {
    follow.push({
      id: a.id,
      name: a.full_name,
      email: a.email,
      tone: "question",
      reason: tl(`Pytanie ${a.kind === "business" ? "od firmy" : "o prowadzenie"} z ${formatDate(a.created_at.slice(0, 10), "d MMM")}`, `Question from ${formatDate(a.created_at.slice(0, 10), "d MMM")}`),
      subject: "VYRA: odpowiedź na Twoje zgłoszenie",
      body: `Cześć ${first(a.full_name)}!\n\nDziękuję za wiadomość. Chętnie pomogę. Kiedy pasuje Ci krótka rozmowa (15–20 minut)? Podaj 2–3 terminy, a dopasuję plan do Twojego celu.\n\nKacper, VYRA`,
    });
  }
  for (const a of free.filter((x) => x.status === "new" && now - new Date(x.created_at).getTime() >= 14 * DAY && !paidEmails.has(x.email.toLowerCase()))) {
    const weeks = Math.floor((now - new Date(a.created_at).getTime()) / (7 * DAY));
    follow.push({
      id: a.id,
      name: a.full_name,
      email: a.email,
      tone: "lead",
      reason: tl(`Darmowy plan od ${weeks} tyg.: zapytaj, jak idzie`, `Free plan for ${weeks} weeks: ask how it’s going`),
      subject: "Jak idzie Twój plan „Zacznij biegać”?",
      body: `Cześć ${first(a.full_name)}!\n\n${weeksPl(weeks)}, odkąd zacząłeś/zaczęłaś plan „Zacznij biegać”. Który tydzień robisz? Coś było za trudne albo za łatwe?\n\nJeśli chcesz pójść krok dalej, w pakiecie Start (8 tygodni, 99 zł) ułożę Ci plan na pierwsze 5 km pod Twój kalendarz i będę sprawdzał każdy trening: https://www.vyraathl.pl/prowadzenie\n\nJeśli jesteś w okolicy, wpadnij na wspólny trening VYRA Run Club: https://www.vyraathl.pl/run-club\n\nKacper, VYRA`,
    });
  }

  // Sources this month.
  const sources = new Map<string, number>();
  for (const a of apps.filter(inMonth)) if (a.source) sources.set(a.source, (sources.get(a.source) ?? 0) + 1);
  const sourceList = [...sources.entries()].sort((x, y) => y[1] - x[1]);

  // Funnel (all time).
  const freeContacted = free.filter((a) => a.status !== "new").length;
  const funnel = [
    { label: tl("Darmowe plany", "Free plans"), n: free.length },
    { label: tl("Kontakt nawiązany", "Contacted"), n: freeContacted },
    { label: tl("Kupili", "Bought"), n: converted },
  ];
  const conv = free.length ? Math.round((converted / free.length) * 1000) / 10 : 0;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={tl("Strategia", "Strategy")}
        title={tl("Rozwój VYRA", "VYRA growth")}
        description={tl(
          `Cele na ${formatDate(`${month}-01`, "LLLL yyyy")} ze strategii rozwoju i osoby, do których warto dziś napisać.`,
          `Targets for ${formatDate(`${month}-01`, "LLLL yyyy")} from the growth strategy, and who to contact today.`,
        )}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={tl("Cele", "Targets")}>
        <Goal label={tl("Darmowe plany (razem)", "Free plans (total)")} value={free.length} target={target.free} hint={tl(`${freeMonth} w tym miesiącu`, `${freeMonth} this month`)} />
        <Goal label={tl("Płacący zawodnicy", "Paying athletes")} value={payingPeople} target={target.paid} hint={tl(`${paidMonth} zakupów w tym miesiącu`, `${paidMonth} purchases this month`)} />
        <Goal label={tl("Run Club (średnio)", "Run Club (average)")} value={clubAvg} target={target.club} hint={tl(`zapisani na ostatnich ${past.length || 0} treningach`, `sign-ups at the last ${past.length || 0} runs`)} />
      </section>

      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{tl(`Do kontaktu dziś (${follow.length})`, `To contact today (${follow.length})`)}</CardTitle>
            <p className="text-[13px] text-muted">
              {tl(
                "„Napisz” otwiera gotowego maila, którego możesz poprawić. Po wysłaniu kliknij „Zrobione”. Kolejność: opłaceni, pytania, darmowe plany po 2 tygodniach.",
                "“Write” opens a ready e-mail you can edit. After sending, click “Done”. Order: paid, questions, free plans after 2 weeks.",
              )}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {follow.length ? (
            <ul className="grid gap-2">
              {follow.map((f) => (
                <FollowUpRow key={f.id} item={f} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tl("Wszyscy obsłużeni. Dobra robota.", "Everyone handled. Nice work.")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tl("Lejek darmowego planu", "Free plan funnel")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {funnel.map((f) => (
              <div key={f.label} className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="num font-semibold">{f.n}</span>
                </div>
                <ProgressBar value={funnel[0].n ? (f.n / funnel[0].n) * 100 : 0} tone="accent" />
              </div>
            ))}
            <p className={cn("text-[13px]", conv < 3 && free.length >= 30 ? "text-warning" : "text-muted")}>
              {tl(`Konwersja: ${conv}%. Cel: co najmniej 3–5%.`, `Conversion: ${conv}%. Target: at least 3–5%.`)}
              {conv < 3 && free.length >= 30 ? tl(" Pisz osobiście do każdej osoby po 2 tygodniach.", " Write personally to everyone after 2 weeks.") : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tl("Skąd przychodzą (ten miesiąc)", "Where they come from (this month)")}</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceList.length ? (
              <ul className="grid gap-2">
                {sourceList.map(([src, n]) => (
                  <li key={src} className="grid gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{sourceLabel(src)}</span>
                      <span className="num font-semibold">{n}</span>
                    </div>
                    <ProgressBar value={(n / sourceList[0][1]) * 100} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                {tl("Brak danych o źródłach w tym miesiącu (wymaga migracji 20261102000200).", "No source data this month yet (needs migration 20261102000200).")}
              </p>
            )}
            <p className="mt-4 text-[12px] text-muted">
              {tl("Wejścia na stronę sprawdzisz w Vercel → Analytics.", "Check site visits in Vercel → Analytics.")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VYRA Run Club</CardTitle>
          <Link href="/coach/site" className="text-[13px] text-muted hover:text-foreground">
            {tl("Terminy", "Dates")}
          </Link>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <p className="eyebrow">{tl("Ostatnie treningi", "Recent runs")}</p>
            {past.length ? (
              past
                .slice()
                .reverse()
                .map((e) => (
                  <p key={e.id} className="flex justify-between text-sm">
                    <span>{formatDate(e.starts_at.slice(0, 10), "EEE d MMM")}</span>
                    <span className="num font-semibold">{count(e.id)}</span>
                  </p>
                ))
            ) : (
              <p className="text-sm text-muted">{tl("Jeszcze bez treningów.", "No runs yet.")}</p>
            )}
          </div>
          <div className="grid content-start gap-2">
            <p className="eyebrow">{tl("Najbliższe", "Upcoming")}</p>
            {upcoming.length ? (
              upcoming.map((e) => (
                <p key={e.id} className="flex justify-between text-sm">
                  <span>{formatDate(e.starts_at.slice(0, 10), "EEE d MMM")}</span>
                  <span className="num text-muted">{tl(`${count(e.id)} zapisanych`, `${count(e.id)} signed up`)}</span>
                </p>
              ))
            ) : (
              <p className="text-sm text-warning">{tl("Brak terminów. Dodaj kolejne w Strona → Run Club.", "No dates. Add more in Website → Run Club.")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
