import { ProgressView } from "@/components/app/progress";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Postępy" };

export default function AppProgress() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Postępy" sub="Jak rośniesz tydzień po tygodniu. Liczy się każdy trening: z dziennika, odhaczony w planie, ze Stravy albo z GPS." />
      <ProgressView />
    </div>
  );
}
