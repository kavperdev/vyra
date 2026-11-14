import { IntervalTimer } from "@/components/app/timer";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Timer interwałów" };

export default function AppTimer() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Timer interwałów" sub="Ustaw odcinki i biegnij. Telefon da znać, kiedy przyspieszyć i kiedy zwolnić." />
      <IntervalTimer />
    </div>
  );
}
