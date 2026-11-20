import { PulsMemory } from "@/components/app/puls-memory";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Pamięć Pulsa" };

export default function AppMemory() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Pamięć Pulsa" sub="Co asystent wie o Tobie między rozmowami. Ty decydujesz, co zostaje." />
      <PulsMemory />
    </div>
  );
}
