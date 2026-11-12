import { Download, FileText, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrantReport } from "@/lib/data/club-reports";

const fmt = (iso: string) => iso.split("-").reverse().join(".");
const pct = (p: number, m: number) => (m ? `${Math.round((p / m) * 100)}%` : "—");

/** Period and group picker plus the report itself, ready to print or download for a grant settlement. */
export function ReportTab({
  report,
  groups,
  clubParam,
  query,
}: {
  report: GrantReport;
  groups: { id: string; name: string }[];
  clubParam: string | null;
  query: { from: string; to: string; group: string };
}) {
  const qs = new URLSearchParams({ from: query.from, to: query.to, ...(query.group ? { group: query.group } : {}), ...(clubParam ? { club: clubParam } : {}) });
  const avg = report.athletes.length ? Math.round(report.athletes.reduce((s, a) => s + (a.marked ? a.present / a.marked : 0), 0) / report.athletes.filter((a) => a.marked).length * 100) || 0 : 0;
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" /> Raport do sprawozdania z dotacji
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="raporty" />
            {clubParam ? <input type="hidden" name="club" value={clubParam} /> : null}
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Od</span>
              <input type="date" name="from" defaultValue={query.from} className="h-10 rounded-md border border-border bg-surface px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Do</span>
              <input type="date" name="to" defaultValue={query.to} className="h-10 rounded-md border border-border bg-surface px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Grupa</span>
              <select name="group" defaultValue={query.group} className="h-10 rounded-md border border-border bg-surface px-3">
                <option value="">Wszystkie grupy</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="h-10 rounded-md border border-border px-4 text-sm font-medium hover:border-border-strong">
              Pokaż
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <a href={`/coach/klub/raport?${qs}&format=html`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background">
              <Printer className="size-4" /> Drukuj lub zapisz PDF
            </a>
            <a href={`/coach/klub/raport?${qs}&format=csv`} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:border-border-strong">
              <Download className="size-4" /> Pobierz do Excela (CSV)
            </a>
          </div>
          <p className="text-[12px] text-subtle">
            Raport zbiera dane z harmonogramu, obecności, zawodów i rekordów. Sprawdź go przed wysłaniem i uzupełnij to, czego nie było w VYRA, np. zajęcia sprzed wdrożenia.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Zajęcia odbyte", String(report.occurrences.length)],
          ["Godziny zajęć", report.hours.toLocaleString("pl-PL")],
          ["Uczestnicy", String(report.athletes.length)],
          ["Średnia frekwencja", report.athletes.some((a) => a.marked) ? `${avg}%` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[12px] text-muted">{k}</p>
            <p className="num text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uczestnicy i frekwencja</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="py-2 pr-3 font-medium">Lp.</th>
                <th className="py-2 pr-3 font-medium">Imię i nazwisko</th>
                <th className="py-2 pr-3 font-medium">Rocznik</th>
                <th className="py-2 pr-3 font-medium">Grupa</th>
                <th className="py-2 pr-3 text-right font-medium">Obecności</th>
                <th className="py-2 text-right font-medium">Frekwencja</th>
              </tr>
            </thead>
            <tbody>
              {report.athletes.map((a, i) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="num py-2 pr-3 text-muted">{i + 1}</td>
                  <td className="py-2 pr-3">{a.name}</td>
                  <td className="num py-2 pr-3">{a.birth_year ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{a.groups.join(", ") || "—"}</td>
                  <td className="num py-2 pr-3 text-right">
                    {a.present} / {a.marked}
                  </td>
                  <td className="num py-2 text-right font-medium">{pct(a.present, a.marked)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.cancelled ? <p className="mt-3 text-[12px] text-subtle">Odwołane zajęcia w tym okresie: {report.cancelled}.</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Zawody</CardTitle>
          </CardHeader>
          <CardContent>
            {report.competitions.length ? (
              <ul className="grid gap-1.5 text-sm">
                {report.competitions.map((c, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="num w-20 shrink-0 text-muted">{fmt(c.date)}</span>
                    <span className="flex-1">{c.title}</span>
                    {c.place ? <span className="text-muted">{c.place}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Brak zawodów w kalendarzu klubu w tym okresie.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rekordy życiowe i testy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {report.records.length ? (
              <ul className="grid gap-1.5 text-sm">
                {report.records.map((r, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="num w-20 shrink-0 text-muted">{fmt(r.date)}</span>
                    <span className="flex-1">
                      {r.athlete} · {r.label}
                    </span>
                    <span className="num font-medium">{r.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Brak nowych rekordów w tym okresie.</p>
            )}
            {report.tests.length ? (
              <p className="text-sm text-muted">Testy sprawności: {report.tests.map((t) => `${fmt(t.date)} (${t.count} wyników)`).join(", ")}.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
