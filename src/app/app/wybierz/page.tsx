import { ChoosePlan } from "@/components/app/choose-plan";
import { PageHead } from "@/components/app/ui";
import { premiumStatus } from "@/lib/app/premium";

export const metadata = { title: "Wybierz pakiet" };

export default async function AppChoose({ searchParams }: { searchParams: Promise<{ trial?: string }> }) {
  const q = await searchParams;
  const { premium } = await premiumStatus().catch(() => ({ premium: false }));
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Jak chcesz biegać?" sub="Możesz to zmienić w każdej chwili w Sklepie." />
      <ChoosePlan trial={q.trial === "1"} premium={premium} />
    </div>
  );
}
