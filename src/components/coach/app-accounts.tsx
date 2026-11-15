"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { grantMethod } from "@/lib/actions/athletes";
import { cn } from "@/lib/utils";

export type Account = { id: string; full_name: string; email: string; created_at: string; method_access: boolean; method_until: string | null; has_coach: boolean; paid_method: boolean };

const date = (s: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(s));
const OPTIONS: { label: string; days: number | null }[] = [
  { label: "14 dni", days: 14 },
  { label: "30 dni", days: 30 },
  { label: "90 dni", days: 90 },
  { label: "Bez końca", days: null },
];

function Row({ a }: { a: Account }) {
  const [acc, setAcc] = useState({ on: a.method_access, until: a.method_until });
  const [pending, start] = useTransition();
  const give = (days: number | null) =>
    start(async () => {
      const r = await grantMethod(a.id, days);
      if (!r.ok) return void toast.error(r.error);
      setAcc(days === 0 ? { on: false, until: null } : { on: true, until: days == null ? null : new Date(Date.now() + days * 86400000).toISOString() });
      toast.success(r.message);
    });
  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">{a.full_name || a.email}</p>
        <p className="truncate text-sm text-muted">{a.email}</p>
        <p className="mt-1 flex flex-wrap gap-1.5 text-[12px]">
          <span className="rounded-full bg-surface px-2 py-0.5 text-muted">od {date(a.created_at)}</span>
          {a.has_coach ? <span className="rounded-full bg-surface px-2 py-0.5 text-muted">z trenerem</span> : <span className="rounded-full bg-surface px-2 py-0.5 text-muted">konto darmowe</span>}
          {a.paid_method ? <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-300">Method kupiony</span> : null}
          {acc.on ? <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[#ff6a6f]">Method za darmo{acc.until ? ` do ${date(acc.until)}` : ", bez końca"}</span> : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((o) => (
          <Button key={o.label} size="sm" variant="outline" disabled={pending} onClick={() => give(o.days)}>
            {o.label}
          </Button>
        ))}
        {acc.on ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => give(0)} className="text-muted">
            Odbierz
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function AppAccounts({ accounts }: { accounts: Account[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "free" | "method">("all");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        (!s || a.full_name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s)) &&
        (only === "all" || (only === "free" ? !a.has_coach && !a.paid_method : a.method_access || a.paid_method)),
    );
  }, [accounts, q, only]);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border px-3">
          <Search className="size-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj po imieniu lub e-mailu" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        {(
          [
            ["all", "Wszyscy"],
            ["free", "Darmowe"],
            ["method", "Z Method"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setOnly(k)} className={cn("h-10 rounded-xl px-3 text-sm", only === k ? "bg-white text-black" : "border border-border text-muted")}>
            {l}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{list.length} kont</p>
      {list.length ? <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">{list.map((a) => <Row key={a.id} a={a} />)}</ul> : <p className="text-sm text-muted">Brak kont.</p>}
    </div>
  );
}
