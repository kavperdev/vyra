import Link from "next/link";
import { Check } from "lucide-react";
import { InviteSignupForm } from "@/components/auth/auth-forms";
import { PageHead } from "@/components/app/ui";
import { recordCheckout } from "@/lib/actions/checkout";
import { recordVoucher } from "@/lib/actions/vouchers";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Dziękujemy" };

const btn = "block rounded-full bg-white py-3.5 text-center text-[15px] font-semibold text-black active:scale-[0.98]";

/** Return from Stripe when the purchase started in the app. */
export default async function AppThanks({ searchParams }: { searchParams: Promise<{ session_id?: string; k?: string }> }) {
  const { t } = await getT();
  const { session_id, k } = await searchParams;

  if (k === "voucher") {
    const res = session_id ? await recordVoucher(session_id) : { status: "invalid" as const, code: null };
    if (res.status === "paid" && res.code)
      return (
        <div className="app-rise grid grid-cols-1 gap-3">
          <PageHead title={t("Voucher gotowy", "Voucher ready")} sub={t("Potwierdzenie i faktura przyjdą na e-mail.", "Receipt and invoice are on their way.")} />
          <div className="rounded-[20px] border border-dashed border-white/30 bg-[#111113] p-5">
            <p className="text-[12px] text-white/45">{t("Kod vouchera", "Voucher code")}</p>
            <p className="app-select mt-1 text-[28px] font-semibold tracking-wider">{res.code}</p>
          </div>
          <Link href="/app" className={btn}>
            {t("Gotowe", "Done")}
          </Link>
        </div>
      );
    return <Status t={t} status={res.status} />;
  }

  const res = session_id ? await recordCheckout(session_id) : { status: "invalid" as const };
  if (res.status === "paid" && (res.token || res.existing)) {
    const method = /method/i.test(res.plan ?? "");
    return (
      <div className="app-rise grid grid-cols-1 gap-3">
        <div className="grid size-14 place-items-center rounded-full bg-emerald-400 text-black">
          <Check className="size-7" />
        </div>
        <PageHead title={t("Witaj w VYRA", "Welcome to VYRA")} sub={t(`${res.plan ?? "Pakiet"} opłacony. Potwierdzenie przyjdzie e-mailem.`, `${res.plan ?? "Package"} paid. A confirmation is on its way.`)} />
        <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
          {res.token ? (
            <>
              <p className="text-[16px] font-semibold">{t("Ustaw hasło do konta", "Set your password")}</p>
              <p className="mb-4 mt-1 text-[13px] text-white/50">{t("E-mail jest już przypisany do Twojego pakietu.", "Your e-mail is already linked to your package.")}</p>
              <InviteSignupForm token={res.token} email={res.email ?? ""} fullName={res.name ?? ""} />
            </>
          ) : (
            <>
              <p className="text-[16px] font-semibold">{t("Masz już konto VYRA", "You already have an account")}</p>
              <p className="mb-4 mt-1 text-[13px] text-white/50">{t(`Pakiet dodaliśmy do konta ${res.email ?? ""}.`, `We added the package to ${res.email ?? ""}.`)}</p>
              <Link href={method ? "/login?next=/athlete/metoda" : "/login?next=/athlete"} className={btn}>
                {t("Zaloguj się", "Sign in")}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }
  return <Status t={t} status={res.status} />;
}

function Status({ t, status }: { t: (pl: string, en: string) => string; status: string }) {
  const [title, sub] =
    status === "paid"
      ? [t("Dziękujemy, płatność przyjęta", "Thank you"), t("W ciągu dnia roboczego wyślemy e-mail z dalszymi krokami.", "We’ll e-mail the next steps within a working day.")]
      : status === "pending"
        ? [t("Płatność w trakcie", "Payment processing"), t("Bank jeszcze ją potwierdza. Odśwież za minutę.", "Your bank is still confirming. Refresh in a minute.")]
        : [t("Nie znaleźliśmy płatności", "Payment not found"), t("Jeśli pieniądze zostały pobrane, napisz do nas w zakładce Kontakt.", "If you were charged, contact us.")];
  return (
    <div className="app-rise grid grid-cols-1 gap-3">
      <PageHead title={title} sub={sub} />
      <Link href="/app" className={btn}>
        {t("Wróć do aplikacji", "Back to the app")}
      </Link>
    </div>
  );
}
