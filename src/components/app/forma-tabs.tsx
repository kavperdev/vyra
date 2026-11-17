"use client";

import { useEffect, useState } from "react";
import { FormView } from "@/components/app/form-hub";
import { ProgressView } from "@/components/app/progress";
import { Seg } from "@/components/app/tools";

/** One tab for "how am I doing": now (form, fatigue, paces) and history (kilometres, records, badges). */
export function FormaTabs() {
  const [tab, setTab] = useState("teraz");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("t") === "historia") setTab("historia");
  }, []);
  return (
    <div className="grid grid-cols-1 gap-3">
      <Seg
        value={tab}
        onChange={(v) => {
          setTab(v);
          window.history.replaceState(null, "", v === "historia" ? "?t=historia" : window.location.pathname);
        }}
        opts={[
          { k: "teraz", label: "Jak jestem teraz" },
          { k: "historia", label: "Historia i rekordy" },
        ]}
      />
      {tab === "teraz" ? <FormView /> : <ProgressView />}
    </div>
  );
}
