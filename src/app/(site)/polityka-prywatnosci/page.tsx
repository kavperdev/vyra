import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Polityka prywatności", "Privacy policy"), description: t("Jakie dane zbiera VYRA, po co, jak długo je przechowuje i jakie masz prawa. Informacje o plikach cookies.", "What data VYRA collects, why, how long it is kept and your rights. Information about cookies."), robots: { index: true, follow: true }, alternates: { canonical: "/polityka-prywatnosci" } };
}

export default function PrivacyPage() {
  return <LegalPage slug="polityka-prywatnosci" title={{ pl: "Polityka prywatności", en: "Privacy policy" }} />;
}
