import { NocnaView } from "@/components/app/nocna";
import { PhotoHead } from "@/components/app/ui";

export const metadata = { title: "Nocna Ekipa VYRA" };

export default function AppNocna() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PhotoHead photo="night" title="Nocna Ekipa VYRA" sub="Plan tygodnia na Nocną Dychę, 22 maja 2027. Ten sam co na Instagramie." />
      <NocnaView />
    </div>
  );
}
