import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Regulamin sprzedaży", "Terms of sale"), description: t("Zasady zakupu i realizacji usług VYRA: pakiety, płatności, vouchery, program poleceń, odstąpienie od umowy i reklamacje.", "Terms for buying and using VYRA services: packages, payments, vouchers, referrals, withdrawal and complaints."), robots: { index: true, follow: true }, alternates: { canonical: "/regulamin" } };
}

export default function TermsPage() {
  return <LegalPage slug="regulamin" title={{ pl: "Regulamin sprzedaży", en: "Terms of sale" }} />;
}
