"use client";

import { useTransition } from "react";
import { Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { deleteApplication, setApplicationStatus } from "@/lib/actions/applications";
import { formatDateTime } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

export interface ApplicationRow {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  package: string | null;
  goal: string | null;
  records: string | null;
  weekly_km: string | null;
  injuries: string | null;
  message: string | null;
  status: string;
  kind: string;
}

const PACKAGE_LABEL: Record<string, string> = {
  plan: "VYRA Plan",
  coaching: "VYRA Coaching",
  elite: "VYRA Elite",
  get unsure() { return tl("Nie wie jeszcze", "Not sure yet"); },
};

const STATUS_LABEL: Record<string, string> = {
  get new() { return tl("Nowe", "New"); },
  get contacted() { return tl("Kontakt nawiązany", "Contacted"); },
  get invited() { return tl("Zaproszony", "Invited"); },
  get rejected() { return tl("Odrzucone", "Rejected"); },
};

function ApplicationCard({ a }: { a: ApplicationRow }) {
  const [pending, start] = useTransition();
  const rows: [string, string | null][] = [
    [tl("Cel", "Goal"), a.goal],
    [tl("Rekordy i kilometraż", "Records and mileage"), a.records],
    [tl("Kilometraż", "Mileage"), a.weekly_km ? `${a.weekly_km} ${tl("km / tydz.", "km / week")}` : null],
    [tl("Kontuzje", "Injuries"), a.injuries],
    [tl("Wiadomość", "Message"), a.message],
  ];
  return (
    <article className="grid gap-4 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{a.full_name}</h2>
            {a.status === "new" ? <Badge tone="accent" dot>{tl("Nowe", "New")}</Badge> : null}
          </div>
          <p className="text-sm text-muted">
            {formatDateTime(a.created_at)} · {a.kind === "camp" ? tl("Lista obozów", "Camp list") : a.kind === "business" ? tl("Dla firm", "For companies") : tl("Prowadzenie", "Coaching")}
            {a.package ? ` · ${PACKAGE_LABEL[a.package] ?? a.package}` : ""}
          </p>
        </div>
        <Select
          aria-label={tl(`Status zgłoszenia: ${a.full_name}`, `Request status: ${a.full_name}`)}
          value={a.status}
          disabled={pending}
          className="w-auto min-w-48"
          onChange={(e) => {
            const status = e.target.value;
            start(async () => {
              const res = await setApplicationStatus(a.id, status);
              if (res.ok) toast.success(tl("Zapisano status", "Status saved"));
              else toast.error(res.error);
            });
          }}
        >
          {Object.entries(STATUS_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="whitespace-pre-wrap">{v}</dd>
            </div>
          ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`mailto:${a.email}?subject=${encodeURIComponent("VYRA · Twoje zgłoszenie")}`}>
            <Mail className="size-4" /> {a.email}
          </a>
        </Button>
        {a.phone ? (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${a.phone.replace(/\s+/g, "")}`}>
              <Phone className="size-4" /> {a.phone}
            </a>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(tl(`Usunąć zgłoszenie: ${a.full_name}?`, `Delete request: ${a.full_name}?`))) return;
            start(async () => {
              const res = await deleteApplication(a.id);
              if (res.ok) toast.success(tl("Usunięto zgłoszenie", "Request deleted"));
              else toast.error(res.error);
            });
          }}
        >
          <Trash2 className="size-4" /> {tl("Usuń", "Delete")}
        </Button>
      </div>
    </article>
  );
}

export function ApplicationsList({ items }: { items: ApplicationRow[] }) {
  return (
    <div className="grid gap-4">
      {items.map((a) => (
        <ApplicationCard key={a.id} a={a} />
      ))}
    </div>
  );
}
