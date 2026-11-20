"use client";

import { useEffect, useState } from "react";
import { FormView } from "@/components/app/form-hub";
import { ProgressView } from "@/components/app/progress";
import { Seg } from "@/components/app/tools";
import { GuardBody } from "@/components/app/guard";
import { RunInsights } from "@/components/app/coach-cards";
import { BodyMap, FormWave, RunnerLevel, YearDots } from "@/components/app/viz";

/** One tab for "how am I doing": now (form, fatigue, paces) and history (kilometres, records, badges). */
export function FormaTabs() {
  const [tab, setTab] = useState("teraz");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("t");
    if (q === "historia" || q === "cialo") setTab(q);
  }, []);
  return (
    <div className="grid grid-cols-1 gap-3">
      <Seg
        value={tab}
        onChange={(v) => {
          setTab(v);
          window.history.replaceState(null, "", v === "teraz" ? window.location.pathname : `?t=${v}`);
        }}
        opts={[
          { k: "teraz", label: "Teraz" },
          { k: "cialo", label: "Ciało" },
          { k: "historia", label: "Historia" },
        ]}
      />
      {tab === "teraz" ? (
        <div className="grid gap-3">
          <FormWave />
          <RunnerLevel detailed />
          <RunInsights />
          <FormView />
        </div>
      ) : tab === "cialo" ? (
        <div className="grid gap-3">
          <BodyMap />
          <GuardBody />
        </div>
      ) : (
        <div className="grid gap-3">
          <YearDots />
          <ProgressView />
        </div>
      )}
    </div>
  );
}
