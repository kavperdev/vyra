import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Regulamin sprzedaży", "Terms of sale"), robots: { index: true, follow: true }, alternates: { canonical: "/regulamin" } };
}

export default function TermsPage() {
  return <LegalPage slug="regulamin" title={{ pl: "Regulamin sprzedaży", en: "Terms of sale" }} />;
}
