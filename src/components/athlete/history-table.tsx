"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/misc";
import { KindIcon, plannedVolume, StatusBadge } from "@/components/training/session-bits";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/format";
import { CATEGORIES, KIND_LABEL } from "@/lib/training/categories";
import { ALL_DISPLAY_STATUSES, displayStatus, STATUS_META } from "@/lib/training/status";
import type { SessionKind, SessionSummary } from "@/lib/types";
import { tl } from "@/lib/i18n/runtime";

type Sort = "date_desc" | "date_asc" | "title";

export function HistoryTable({ sessions, today, hrefBase, showAthlete = false }: { sessions: SessionSummary[]; today: string; hrefBase: string; showAthlete?: boolean }) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"" | SessionKind>("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<Sort>("date_desc");

  const rows = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("pl-PL");
    const r = sessions.filter((s) => {
      if (term && !s.title.toLocaleLowerCase("pl-PL").includes(term) && !(s.execution?.comment ?? "").toLocaleLowerCase("pl-PL").includes(term)) return false;
      if (from && s.scheduled_date < from) return false;
      if (to && s.scheduled_date > to) return false;
      if (kind && s.kind !== kind) return false;
      if (category && s.category !== category) return false;
      if (status && displayStatus(s.status, s.scheduled_date, today) !== status) return false;
      return true;
    });
    return r.sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title, "pl") : sort === "date_asc" ? a.scheduled_date.localeCompare(b.scheduled_date) : b.scheduled_date.localeCompare(a.scheduled_date),
    );
  }, [sessions, q, from, to, kind, category, status, sort, today]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input aria-label={tl("Szukaj w historii", "Search history")} placeholder={tl("Szukaj w nazwach i komentarzach", "Search names and comments")} className="h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Input aria-label={tl("Od daty", "From date")} type="date" className="h-10" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input aria-label={tl("Do daty", "To date")} type="date" className="h-10" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select aria-label={tl("Typ", "Type")} className="h-10" value={kind} onChange={(e) => { setKind(e.target.value as "" | SessionKind); setCategory(""); }}>
          <option value="">{tl("Wszystkie typy", "All types")}</option>
          {(Object.keys(KIND_LABEL) as SessionKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </Select>
        <Select aria-label={tl("Rodzaj", "Category")} className="h-10" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{tl("Każdy rodzaj", "Any category")}</option>
          {CATEGORIES.filter((c) => !kind || c.kind === kind).map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </Select>
        <Select aria-label={tl("Status", tl("Status", "Status"))} className="h-10" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{tl("Każdy status", "Any status")}</option>
          {ALL_DISPLAY_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </Select>
        <Select aria-label={tl("Sortowanie", "Sort")} className="h-10" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="date_desc">{tl("Najnowsze", "Newest")}</option>
          <option value="date_asc">{tl("Najstarsze", "Oldest")}</option>
          <option value="title">{tl("Nazwa A–Z", "Name A–Z")}</option>
        </Select>
      </div>

      <p className="text-[12px] text-muted">{rows.length} {tl("treningów", "sessions")}</p>

      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-left text-[12px] text-muted">
              <tr>
                <th className="px-3 py-2.5 font-medium">{tl("Data", "Date")}</th>
                <th className="px-3 py-2.5 font-medium">{tl("Trening", "Session")}</th>
                {showAthlete ? <th className="px-3 py-2.5 font-medium">{tl("Zawodnik", "Athlete")}</th> : null}
                <th className="px-3 py-2.5 font-medium">{tl("Plan", "Plan")}</th>
                <th className="px-3 py-2.5 font-medium">{tl("Wykonanie", "Result")}</th>
                <th className="px-3 py-2.5 font-medium">RPE</th>
                <th className="px-3 py-2.5 font-medium">{tl("Status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => {
                const e = s.execution;
                const actual = e
                  ? [e.distance_m ? formatDistance(e.distance_m) : null, e.duration_s ? formatDuration(e.duration_s) : null, e.avg_pace_s ? `${formatPace(e.avg_pace_s)}/km` : null, e.avg_hr ? `${e.avg_hr} bpm` : null]
                      .filter(Boolean)
                      .join(" · ") || "zapisano"
                  : "—";
                return (
                  <tr key={s.id} className="relative hover:bg-surface">
                    <td className="num whitespace-nowrap px-3 py-2.5 text-muted">{formatDate(s.scheduled_date, "d MMM yy")}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`${hrefBase}/${s.id}`} className="flex items-center gap-2 font-medium after:absolute after:inset-0">
                        <KindIcon kind={s.kind} /> <span className="truncate">{s.title}</span>
                      </Link>
                    </td>
                    {showAthlete ? <td className="px-3 py-2.5 text-muted">{s.athlete_name}</td> : null}
                    <td className="num px-3 py-2.5 text-muted">{plannedVolume(s) ?? "—"}</td>
                    <td className="num px-3 py-2.5">{actual}</td>
                    <td className="num px-3 py-2.5">{e?.rpe ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={s.status} date={s.scheduled_date} today={today} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={tl("Brak treningów", "No sessions")} description={tl("Zmień filtry albo zakres dat.", "Change the filters or date range.")} />
      )}
    </div>
  );
}
