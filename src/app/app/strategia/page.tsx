import { Paywall } from "@/components/app/paywall";
import { RacePlan } from "@/components/app/race-plan";
import { PageHead } from "@/components/app/ui";
import { premiumStatus } from "@/lib/app/premium";

export const metadata = { title: "Strategia na start" };

export default async function AppRaceStrategy() {
  const { signedIn, premium } = await premiumStatus();
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Strategia na start" sub="Tempo na każdy kilometr, międzyczasy, rozgrzewka i plan biegu." />
      {premium ? <RacePlan /> : <Paywall title="Strategia na start" signedIn={signedIn} />}
    </div>
  );
}
