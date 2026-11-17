"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/app/sheet";
import { deleteMyAccount } from "@/lib/actions/delete-account";

/** Account deletion inside the app (required by Google Play and the App Store). */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button id="usun" type="button" onClick={() => setOpen(true)} className="mt-2 flex h-11 w-full items-center justify-center gap-2 text-[13.5px] text-white/45 active:scale-[0.98]">
        <Trash2 className="size-4" /> Usuń konto
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Usunąć konto VYRA?" sub="Tego nie da się cofnąć.">
        <div className="grid gap-3">
          <p className="text-[14px] leading-relaxed text-white/65">
            Usuniemy konto i wszystko, co jest z nim powiązane: dziennik, plany, wyniki, znajomych i wiadomości. Jeśli płacisz za VYRA Method co miesiąc, najpierw anuluj subskrypcję w Ustawieniach konta.
          </p>
          <label className="grid gap-1.5 text-[13px] text-white/55">
            Wpisz USUŃ, żeby potwierdzić
            <input value={word} onChange={(e) => setWord(e.target.value)} autoCapitalize="characters" className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[16px] text-white outline-none focus:border-white/30" />
          </label>
          {err ? <p className="text-[13px] text-[#ff6a6f]">{err}</p> : null}
          <button
            type="button"
            disabled={pending || word.trim().toUpperCase() !== "USUŃ"}
            onClick={() =>
              start(async () => {
                setErr(null);
                const r = await deleteMyAccount(word);
                if (!r.ok) return setErr(r.error);
                try {
                  for (const k of Object.keys(localStorage)) if (k.startsWith("vyra")) localStorage.removeItem(k);
                } catch {
                  /* nothing stored */
                }
                window.location.assign("/app/start");
              })
            }
            className="h-12 rounded-full bg-[#ff3b44] text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {pending ? "Usuwam…" : "Usuń konto na zawsze"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
