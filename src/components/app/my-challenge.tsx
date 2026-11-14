"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

const KEY = "vyra-challenge";
type Saved = { token: string; title: string; slug: string };

/** Keeps the participant's private challenge link on this phone, so it is one tap away in the app. */
export function RememberChallenge(v: Saved) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  }, [v]);
  return null;
}

export function MyChallengeLink() {
  const [s, setS] = useState<Saved | null>(null);
  useEffect(() => {
    try {
      setS(JSON.parse(localStorage.getItem(KEY) ?? "null"));
    } catch {
      /* none */
    }
  }, []);
  if (!s?.token) return null;
  return (
    <Link href={`/app/wyzwania/moje?t=${encodeURIComponent(s.token)}`} className="mb-3 flex items-center gap-3.5 rounded-[20px] border border-white/20 bg-[#18181b] px-4 py-3.5 active:scale-[0.985]">
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)]/15 text-[#ff6a6f]">
        <Trophy className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">Moje wyzwanie</span>
        <span className="block truncate text-[12.5px] text-white/45">{s.title} · dodaj bieg</span>
      </span>
      <ChevronRight className="size-4 text-white/30" />
    </Link>
  );
}
