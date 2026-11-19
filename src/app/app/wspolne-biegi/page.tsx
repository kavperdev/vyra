import Link from "next/link";
import { GroupRuns } from "@/components/app/group-runs";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Wspólne biegi" };

export default function GroupRunsPage() {
  return (
    <div className="app-rise grid grid-cols-1 gap-4">
      <PageHead title="Wspólne biegi" sub="Znajdź ekipę do biegania w swojej okolicy albo zaproś innych na swój bieg." />
      <GroupRuns />
      <p className="px-1 text-[13px] leading-relaxed text-white/45">
        VYRA nie organizuje tych biegów, tylko pokazuje ogłoszenia biegaczy. Biegasz na własną odpowiedzialność.{" "}
        <Link href="/app/wspolne-biegi/zasady" className="underline underline-offset-2">
          Zasady wspólnych biegów
        </Link>
      </p>
    </div>
  );
}
