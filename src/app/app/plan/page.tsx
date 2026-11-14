import Link from "next/link";
import { FreePlan } from "@/components/app/free-plan";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Zacznij biegać" };

export default function AppFreePlan() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Zacznij biegać" sub="Darmowy plan: od zera do 25 minut biegu w 6 tygodni. 3 treningi w tygodniu, bez konta." />
      <FreePlan />
      <Link href="/app/sklep" className="mt-3 block rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 active:scale-[0.985]">
        <p className="text-[15px] font-medium">Co po 6 tygodniach?</p>
        <p className="mt-1 text-[13px] leading-relaxed text-white/50">VYRA Method ułoży plan pod Twój cel i będzie go dopasowywać co tydzień. 14 dni za darmo.</p>
      </Link>
    </div>
  );
}
