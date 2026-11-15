import { RunRecorder } from "@/components/app/run-recorder";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Biegnij" };

export default function AppRun() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Biegnij" sub="Nagraj bieg telefonem: dystans, tempo i głos co kilometr." />
      <RunRecorder />
    </div>
  );
}
