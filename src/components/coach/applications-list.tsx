"use client";

import { useTransition } from "react";
import { Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { deleteApplication, setApplicationStatus } from "@/lib/actions/applications";
import { formatDateTime } from "@/lib/format";

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
}

const PACKAGE_LABEL: Record<string, string> = {
  plan: "VYRA Plan",
  coaching: "VYRA Coaching",
  elite: "VYRA Elite",
  unsure: "Nie wie jeszcze",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nowe",
  contacted: "Kontakt nawiązany",
  invited: "Zaproszony",
  rejected: "Odrzucone",
};

function ApplicationCard({ a }: { a: ApplicationRow }) {
  const [pending, start] = useTransition();
  const rows: [string, string | null][] = [
    ["Cel", a.goal],
    ["Rekordy", a.records],
    ["Kilometraż", a.weekly_km ? `${a.weekly_km} km / tydz.` : null],
    ["Kontuzje", a.injuries],
    ["Wiadomość", a.message],
  ];
  return (
    <article className="grid gap-4 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{a.full_name}</h2>
            {a.status === "new" ? <Badge tone="accent" dot>Nowe</Badge> : null}
          </div>
          <p className="text-sm text-muted">
            {formatDateTime(a.created_at)} · {PACKAGE_LABEL[a.package ?? "unsure"] ?? a.package}
          </p>
        </div>
        <Select
          aria-label={`Status zgłoszenia: ${a.full_name}`}
          value={a.status}
          disabled={pending}
          className="w-auto min-w-48"
          onChange={(e) => {
            const status = e.target.value;
            start(async () => {
              const res = await setApplicationStatus(a.id, status);
              if (res.ok) toast.success("Zapisano status");
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
            if (!window.confirm(`Usunąć zgłoszenie: ${a.full_name}?`)) return;
            start(async () => {
              const res = await deleteApplication(a.id);
              if (res.ok) toast.success("Usunięto zgłoszenie");
              else toast.error(res.error);
            });
          }}
        >
          <Trash2 className="size-4" /> Usuń
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
