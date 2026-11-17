import { FormaTabs } from "@/components/app/forma-tabs";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Forma" };

export default function AppForm() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Forma" sub="Liczona sama z Twoich treningów ze Stravy, dziennika i planu." />
      <FormaTabs />
    </div>
  );
}
