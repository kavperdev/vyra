import { formatDuration, formatPace } from "@/lib/format";
import { categoryLabel, KIND_LABEL } from "@/lib/training/categories";
import { displayStatus, STATUS_META } from "@/lib/training/status";
import type { SessionSummary } from "@/lib/types";

/** Excel-friendly CSV (UTF-8 BOM, semicolons, decimal comma). Planned and actual values in separate columns. */
export function sessionsToCsv(sessions: SessionSummary[], today: string): string {
  const header = [
    "Data planowana", "Trening", "Typ", "Rodzaj", "Status",
    "Plan: dystans (km)", "Plan: czas",
    "Data wykonania", "Wykonanie: dystans (km)", "Wykonanie: czas", "Wykonanie: tempo (min/km)", "Wykonanie: śr. tętno", "RPE", "Komentarz zawodnika",
  ];
  const num = (n: number | null | undefined, digits = 2) => (n == null ? "" : n.toFixed(digits).replace(".", ","));
  const rows = sessions.map((s) => {
    const e = s.execution;
    return [
      s.scheduled_date,
      s.title,
      KIND_LABEL[s.kind],
      categoryLabel(s.category),
      STATUS_META[displayStatus(s.status, s.scheduled_date, today)].label,
      s.planned_distance_m ? num(s.planned_distance_m / 1000) : "",
      s.planned_duration_s ? formatDuration(s.planned_duration_s) : "",
      e?.performed_on ?? "",
      e?.distance_m ? num(e.distance_m / 1000) : "",
      e?.duration_s ? formatDuration(e.duration_s) : "",
      e?.avg_pace_s ? formatPace(e.avg_pace_s) : "",
      e?.avg_hr ?? "",
      e?.rpe != null ? String(e.rpe).replace(".", ",") : "",
      e?.comment ?? "",
    ];
  });
  const esc = (v: string | number) => {
    const s = String(v);
    // Prevent spreadsheet formula injection from user-entered text.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n") + "\r\n";
}
