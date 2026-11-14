import { AtSign, FileText, Mail, Shield } from "lucide-react";
import { Group, PageHead, Row, SectionHead } from "@/components/app/ui";
import { ContactTabs } from "@/components/site/contact-tabs";
import { getCompany } from "@/lib/data/site-settings";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Kontakt" };

export default async function AppContact() {
  const { t } = await getT();
  const company = await getCompany();
  const ig = company.instagram?.replace(/^@/, "");
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={t("Kontakt", "Contact")} sub={t("Pytanie o trenera, plan albo obóz? Każdą wiadomość czytamy osobiście.", "A question about coaching, a plan or a camp? We read every message personally.")} />
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <ContactTabs />
      </div>
      {company.email || ig ? (
        <>
          <SectionHead title={t("Bezpośrednio", "Directly")} />
          <Group>
            {company.email ? <Row href={`mailto:${company.email}`} icon={<Mail className="size-4" />} title={company.email} right={<span />} /> : null}
            {ig ? <Row href={`https://instagram.com/${ig}`} icon={<AtSign className="size-4" />} title={`Instagram @${ig}`} right={<span />} /> : null}
          </Group>
        </>
      ) : null}
      <SectionHead title={t("Dokumenty", "Documents")} />
      <Group>
        <Row href="/app/dokument/regulamin" icon={<FileText className="size-4" />} title={t("Regulamin", "Terms")} />
        <Row href="/app/dokument/polityka-prywatnosci" icon={<Shield className="size-4" />} title={t("Prywatność", "Privacy")} />
      </Group>
    </div>
  );
}
