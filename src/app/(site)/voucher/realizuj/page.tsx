import type { Metadata } from "next";
import { PageHero, wrap } from "@/components/site/blocks";
import { VoucherRedeemForm } from "@/components/site/voucher-forms";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Zrealizuj voucher", "Redeem a voucher"), robots: { index: false, follow: true } };
}

export default async function RedeemPage({ searchParams }: { searchParams: Promise<{ kod?: string }> }) {
  const { t } = await getT();
  const { kod } = await searchParams;
  const initial = /^VYRA-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(kod ?? "") ? kod!.toUpperCase() : "";
  return (
    <>
      <PageHero
        tone="warm"
        eyebrow={t("Voucher VYRA", "VYRA voucher")}
        title={t("Ktoś bardzo chce, żebyś biegał lepiej", "Someone really wants you to run better")}
        lead={t(
          "Wpisz kod, załóż konto i od razu wypełnij krótką ankietę. Pierwszy tydzień treningów pojawi się w Twoim kalendarzu.",
          "Enter the code, create your account and fill in a short questionnaire. Your first week of training appears in your calendar right away.",
        )}
      />
      <section className={`${wrap} py-16 sm:py-20`}>
        <div className="max-w-xl">
          <VoucherRedeemForm initialCode={initial} />
        </div>
      </section>
    </>
  );
}
