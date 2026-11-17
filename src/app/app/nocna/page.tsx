import { NocnaView } from "@/components/app/nocna";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Nocna Ekipa VYRA" };

export default function AppNocna() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Nocna Ekipa VYRA" sub="Plan tygodniowy na MKL Siedlecką Nocną Dychę. Ten sam, który wrzucamy na Instagram, z tempami z Twojej formy." />
      <NocnaView />
    </div>
  );
}
