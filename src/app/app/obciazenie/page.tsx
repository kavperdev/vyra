import { LoadView } from "@/components/app/load";
import { Paywall } from "@/components/app/paywall";
import { PageHead } from "@/components/app/ui";
import { premiumStatus } from "@/lib/app/premium";

export const metadata = { title: "Obciążenie i ryzyko" };

export default async function AppLoad() {
  const { signedIn, premium } = await premiumStatus();
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Obciążenie" sub="Czy nie zwiększasz treningu za szybko. Liczone z Twojego dziennika i check-inów." />
      {premium ? <LoadView /> : <Paywall title="Analiza obciążenia" signedIn={signedIn} />}
    </div>
  );
}
