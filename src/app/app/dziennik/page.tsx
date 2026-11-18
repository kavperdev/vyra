import { RunLog } from "@/components/app/run-log";
import { PhotoHead } from "@/components/app/ui";

export const metadata = { title: "Dziennik treningowy" };

export default function AppLog() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PhotoHead photo="road" title="Dziennik" sub="Bieganie i inne sporty. Wszystko, co zrobisz, liczy się do formy." />
      <RunLog />
    </div>
  );
}
