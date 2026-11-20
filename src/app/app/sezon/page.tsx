import { SeasonView } from "@/components/app/season";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Sezon" };

export default function AppSeason() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Sezon" sub="Starty i bloki treningowe na jednej osi. Zawsze wiesz, gdzie jesteś i co dalej." />
      <SeasonView />
    </div>
  );
}
