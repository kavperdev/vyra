import { ProgressView } from "@/components/app/progress";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Postępy" };

export default function AppProgress() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Postępy" sub="Kilometry, rekordy, forma i odznaki. Liczą się same z Twoich biegów." />
      <ProgressView />
    </div>
  );
}
