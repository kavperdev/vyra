import Link from "next/link";
import { FuelTool, HrTool, PredictTool } from "@/components/app/tools";
import { PageHead } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Narzędzia" };

const TABS = [
  { k: "prognoza", label: "Wynik i tempa" },
  { k: "tetno", label: "Tętno" },
  { k: "paliwo", label: "Paliwo" },
];

export default async function AppTools({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const tab = TABS.some((x) => x.k === t) ? t! : "prognoza";
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Narzędzia" sub="Policz tempa, strefy i plan na start." />
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-full bg-[#111113] p-1">
        {TABS.map((x) => (
          <Link key={x.k} href={`/app/narzedzia?t=${x.k}`} replace className={cn("rounded-full py-2 text-center text-[13px] font-medium transition", tab === x.k ? "bg-[#2c2c31] text-white" : "text-white/50")}>
            {x.label}
          </Link>
        ))}
      </div>
      {tab === "prognoza" ? <PredictTool /> : tab === "tetno" ? <HrTool /> : <FuelTool />}
    </div>
  );
}
