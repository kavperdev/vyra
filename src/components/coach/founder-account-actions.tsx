"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { grantMethod } from "@/lib/actions/athletes";
import { founderDelete, founderRename } from "@/lib/actions/founder";

const OPTIONS: { label: string; days: number | null }[] = [
  { label: "14 dni", days: 14 },
  { label: "30 dni", days: 30 },
  { label: "90 dni", days: 90 },
  { label: "Bez końca", days: null },
  { label: "Odbierz", days: 0 },
];

/** Founders: rename, give or take VYRA Method, delete the account. */
export function FounderAccountActions({ id, fullName }: { id: string; fullName: string }) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [word, setWord] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Gotowe.");
      after?.();
      router.refresh();
    });
  const field = "h-10 rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus:border-white/40";
  return (
    <div className="grid gap-4 rounded-2xl border border-border p-4">
      <div className="grid gap-2">
        <p className="text-sm text-muted">Imię i nazwisko</p>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={`${field} min-w-0 flex-1`} />
          <Button size="sm" variant="outline" disabled={pending || name.trim() === fullName} onClick={() => run(() => founderRename(id, name))}>
            Zapisz
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-sm text-muted">VYRA Method za darmo</p>
        <div className="flex flex-wrap gap-1.5">
          {OPTIONS.map((o) => (
            <Button key={o.label} size="sm" variant={o.days === 0 ? "ghost" : "outline"} disabled={pending} onClick={() => run(() => grantMethod(id, o.days))}>
              {o.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-2 border-t border-border pt-4">
        <p className="text-sm text-muted">Usuń konto (nie da się cofnąć). Wpisz USUŃ:</p>
        <div className="flex gap-2">
          <input value={word} onChange={(e) => setWord(e.target.value)} className={`${field} w-32`} />
          <Button size="sm" variant="ghost" className="text-[#ff6a6f]" disabled={pending || word.trim().toUpperCase() !== "USUŃ"} onClick={() => run(() => founderDelete(id, word), () => router.push("/coach/konta"))}>
            Usuń konto
          </Button>
        </div>
      </div>
    </div>
  );
}
