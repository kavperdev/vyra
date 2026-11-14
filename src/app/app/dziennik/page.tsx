import { RunLog } from "@/components/app/run-log";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Dziennik biegów" };

export default function AppLog() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Dziennik" sub="Twoje biegi, kilometry i postęp tydzień po tygodniu." />
      <RunLog />
    </div>
  );
}
