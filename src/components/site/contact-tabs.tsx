"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CampWaitlistForm, CoachingInquiryForm } from "./lead-forms";

const TABS = [
  { key: "coaching", label: "Prowadzenie indywidualne" },
  { key: "camp", label: "Lista obozów" },
] as const;

export function ContactTabs() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("coaching");
  return (
    <div className="grid gap-8">
      <div role="tablist" aria-label="Rodzaj zgłoszenia" className="inline-flex w-fit flex-wrap gap-1 rounded-full border border-white/15 p-1">
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
              "h-10 rounded-full px-5 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-white text-black" : "text-white/60 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} key={tab} className="site-fade">
        {tab === "coaching" ? <CoachingInquiryForm /> : <CampWaitlistForm />}
      </div>
    </div>
  );
}
