import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, PrimaryLink, wrap } from "@/components/site/blocks";
import { recordVoucher } from "@/lib/actions/vouchers";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "VYRA", robots: { index: false, follow: false } };

export default async function VoucherThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { t } = await getT();
  const { session_id } = await searchParams;
  const res = session_id ? await recordVoucher(session_id) : { status: "invalid" as const, code: null };

  if (res.status === "paid" && res.code) {
    return (
      <>
        <PageHero tone="warm" eyebrow={t("Płatność przyjęta", "Payment received")} title={t("Voucher gotowy", "Your voucher is ready")} lead={t("Zapisz kod. Potwierdzenie i faktura przyjdą na Twój e-mail.", "Save the code. The receipt and invoice are on their way to your e-mail.")} />
        <section className={`${wrap} grid gap-8 py-16 sm:py-20`}>
          <div className="grid max-w-xl gap-2 rounded-2xl border border-dashed border-white/40 bg-black/60 p-7">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">{t("Kod vouchera", "Voucher code")}</span>
            <span className="display text-4xl tracking-wider text-white">{res.code}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <PrimaryLink href={`/voucher/k/${res.code}`}>{t("Otwórz voucher do druku", "Open the printable voucher")}</PrimaryLink>
            <Link href="/" className="inline-flex h-12 items-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white hover:border-white/70">
              {t("Wróć na stronę główną", "Back to home")}
            </Link>
          </div>
          <p className="max-w-xl text-sm text-white/55">
            {t(
              "Voucher możesz wydrukować, zapisać jako PDF albo wysłać link do strony vouchera. Obdarowany zrealizuje go na vyraathl.pl/voucher/realizuj.",
              "Print the voucher, save it as PDF or send the link. The recipient redeems it at vyraathl.pl/voucher/realizuj.",
            )}
          </p>
        </section>
      </>
    );
  }

  const [title, lead] =
    res.status === "pending"
      ? [t("Płatność w trakcie", "Payment processing"), t("Bank jeszcze potwierdza płatność. Odśwież tę stronę za minutę.", "Your bank is still confirming the payment. Refresh this page in a minute.")]
      : res.status === "paid"
        ? [t("Dziękujemy, płatność przyjęta", "Thank you, payment received"), t("Voucher wyślemy na Twój e-mail w ciągu jednego dnia roboczego.", "We’ll e-mail your voucher within one working day.")]
        : [t("Nie znaleźliśmy płatności", "Payment not found"), t("Jeśli płatność została pobrana, napisz do nas przez formularz kontaktowy.", "If you were charged, please contact us through the contact form.")];
  return (
    <>
      <PageHero tone="warm" eyebrow={t("Voucher VYRA", "VYRA voucher")} title={title} lead={lead} />
      <section className={`${wrap} py-20`}>
        <PrimaryLink href="/">{t("Wróć na stronę główną", "Back to home")}</PrimaryLink>
      </section>
    </>
  );
}
