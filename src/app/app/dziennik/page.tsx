import { RunLog } from "@/components/app/run-log";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Dziennik treningowy" };

export default function AppLog() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Dziennik" sub="Bieganie i inne sporty. Wszystko, co zrobisz, liczy się do postępów." />
      <RunLog />
    </div>
  );
}
