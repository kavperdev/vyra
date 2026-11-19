"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { wipeAccountData } from "@/lib/app/store";

/** Sign out from inside the app and land back on the app home. */
export function SignOutButton({ label = "Wyloguj się" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/auth/signout", { method: "POST" });
        } finally {
          // The next person on this phone must not see this account's data.
          wipeAccountData();
          window.location.assign("/app");
        }
      }}
      className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-[#111113] text-[15px] font-medium text-[#ff6a6f] transition active:scale-[0.98] disabled:opacity-50"
    >
      <LogOut className="size-4" /> {busy ? "Wylogowuję…" : label}
    </button>
  );
}
