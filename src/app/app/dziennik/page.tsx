import { MonthCalendar } from "@/components/app/month-calendar";
import { RunLog } from "@/components/app/run-log";
import { PhotoHead } from "@/components/app/ui";
import { plannedDays } from "@/lib/app/planned-days";

export const metadata = { title: "Dziennik treningowy" };

export default async function AppLog() {
  const planned = await plannedDays().catch(() => []);
  return (
    <div className="app-rise grid grid-cols-1 gap-3">
      <PhotoHead photo="road" title="Dziennik" sub="Bieganie i inne sporty. Wszystko, co zrobisz, liczy się do formy." />
      <MonthCalendar planned={planned} />
      <RunLog />
    </div>
  );
}
