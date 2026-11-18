"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { CampWaitlistForm, CoachingInquiryForm } from "./lead-forms";

const TABS = [
  { key: "coaching", label: "Prowadzenie indywidualne", en: "Individual coaching" },
  { key: "camp", label: "Lista obozów", en: "Camp list" },
] as const;

export function ContactTabs() {
  const en = useLang() === "en";
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("coaching");
  return (
    <div className="grid gap-8">
      <div role="tablist" aria-label={en ? "Request type" : "Rodzaj zgłoszenia"} className="grid w-full max-w-md grid-cols-2 gap-1 rounded-2xl border border-white/15 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-10 rounded-xl px-3 py-2 text-[13px] font-semibold leading-tight transition-colors sm:text-sm",
              tab === t.key ? "bg-white text-black" : "text-white/60 hover:text-white",
            )}
          >
            {en ? t.en : t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} key={tab} className="site-fade">
        {tab === "coaching" ? <CoachingInquiryForm /> : <CampWaitlistForm />}
      </div>
    </div>
  );
}
