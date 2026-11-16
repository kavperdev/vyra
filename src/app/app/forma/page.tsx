import { FormView } from "@/components/app/form-hub";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Forma" };

export default function AppForm() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Twoja forma" sub="Kondycja, zmęczenie, ryzyko przeciążenia i prognoza wyniku. Liczone z każdego biegu, także ze Stravy." />
      <FormView />
    </div>
  );
}
