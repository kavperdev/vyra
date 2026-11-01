"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form-controls";
import { EmptyState, Initials, ProgressBar } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { tl } from "@/lib/i18n/runtime";

export interface AthleteListItem {
  id: string;
  full_name: string;
  email: string | null;
  status: "active" | "archived";
  goal: string | null;
  lastActivity: string | null;
  plannedUpcoming: number;
  completion: number | null;
  nextSession: { date: string; title: string } | null;
}

type Sort = "name" | "activity" | "completion";

export function AthletesTable({ athletes }: { athletes: AthleteListItem[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"active" | "archived" | "all">("active");
  const [sort, setSort] = useState<Sort>("name");

  const rows = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("pl-PL");
    const filtered = athletes.filter(
      (a) =>
        (status === "all" || a.status === status) &&
        (!term || a.full_name.toLocaleLowerCase("pl-PL").includes(term) || (a.email ?? "").toLowerCase().includes(term) || (a.goal ?? "").toLocaleLowerCase("pl-PL").includes(term)),
    );
    return filtered.sort((a, b) => {
      if (sort === "activity") return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
      if (sort === "completion") return (b.completion ?? -1) - (a.completion ?? -1);
      return a.full_name.localeCompare(b.full_name, "pl");
    });
  }, [athletes, q, status, sort]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input aria-label={tl("Szukaj zawodnika", "Search athletes")} placeholder={tl("Szukaj po nazwisku, e-mailu lub celu", "Search by name, email or goal")} className="h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label={tl("Status konta", "Account status")} className="h-10 w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">{tl("Aktywni", "Active")}</option>
          <option value="archived">{tl("Zarchiwizowani", "Archived")}</option>
          <option value="all">{tl("Wszyscy", "Everyone")}</option>
        </Select>
        <div className="flex items-center gap-1">
          <ArrowUpDown aria-hidden className="size-4 text-subtle" />
          <Select aria-label={tl("Sortowanie", "Sort")} className="h-10 w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="name">{tl("Nazwisko", "Surname")}</option>
            <option value="activity">{tl("Ostatnia aktywność", "Last activity")}</option>
            <option value="completion">{tl("Realizacja planu", "Plan completion")}</option>
          </Select>
        </div>
      </div>

      {rows.length ? (
        <>
          {/* table on wide screens */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-[12px] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{tl("Zawodnik", "Athlete")}</th>
                  <th className="px-4 py-2.5 font-medium">{tl("Cel", "Goal")}</th>
                  <th className="px-4 py-2.5 font-medium">{tl("Ostatnia aktywność", "Last activity")}</th>
                  <th className="px-4 py-2.5 font-medium">{tl("Zaplanowane", "Planned")}</th>
                  <th className="px-4 py-2.5 font-medium">{tl("Realizacja 4 tyg.", "4-week completion")}</th>
                  <th className="px-4 py-2.5 font-medium">{tl("Najbliższy trening", "Next session")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => (
                  <tr key={a.id} className="group relative hover:bg-surface">
                    <td className="px-4 py-3">
                      <Link href={`/coach/athletes/${a.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                        <Initials name={a.full_name} size="sm" />
                        <span className="grid min-w-0">
                          <span className="truncate font-medium">{a.full_name}</span>
                          <span className="truncate text-[12px] text-muted">{a.email}</span>
                        </span>
                        {a.status === "archived" ? <Badge>{tl("archiwum", "archived")}</Badge> : null}
                      </Link>
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-muted">{a.goal ?? "—"}</td>
                    <td className="num px-4 py-3 text-muted">{a.lastActivity ? formatDate(a.lastActivity, "d MMM") : "—"}</td>
                    <td className="num px-4 py-3">{a.plannedUpcoming}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={a.completion} className="w-20" />
                        <span className={cn("num text-[12px]", a.completion != null && a.completion < 60 ? "text-warning" : "text-muted")}>
                          {a.completion == null ? "—" : `${a.completion}%`}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-52 truncate px-4 py-3 text-muted">
                      {a.nextSession ? `${formatDate(a.nextSession.date, "d MMM")} · ${a.nextSession.title}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* cards on phones */}
          <ul className="grid gap-2 md:hidden">
            {rows.map((a) => (
              <li key={a.id}>
                <Link href={`/coach/athletes/${a.id}`} className="grid gap-2 rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-3">
                    <Initials name={a.full_name} size="sm" />
                    <div className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{a.full_name}</span>
                      <span className="truncate text-[12px] text-muted">{a.goal ?? tl("Bez celu", "No goal")}</span>
                    </div>
                    <span className="num text-[12px] text-muted">{a.completion == null ? "—" : `${a.completion}%`}</span>
                  </div>
                  <p className="text-[12px] text-muted">
                    {a.nextSession ? `Następny: ${formatDate(a.nextSession.date, "d MMM")} · ${a.nextSession.title}` : tl("Brak zaplanowanych treningów", "No planned sessions")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState title={tl("Brak zawodników spełniających kryteria", "No athletes match the criteria")} description={tl("Zmień wyszukiwanie lub filtr statusu.", "Change your search or status filter.")} />
      )}
    </div>
  );
}
