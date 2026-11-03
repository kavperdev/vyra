import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrimaryLink, wrap } from "@/components/site/blocks";
import { PrintButton } from "@/components/site/voucher-forms";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Voucher VYRA", robots: { index: false, follow: false } };

interface Info {
  code: string;
  plan_name: string;
  recipient_name: string | null;
  buyer_name: string | null;
  message: string | null;
  status: "active" | "redeemed" | "void" | "expired";
  valid_until: string;
}

/** The gift voucher itself: designed to be printed, saved as PDF or sent as a link. */
export default async function VoucherCardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { t, lang } = await getT();
  if (!/^VYRA-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) notFound();
  const { data } = await (await createClient()).rpc("voucher_info", { p_code: code });
  const v = (Array.isArray(data) ? data[0] : data) as Info | null;
  if (!v || v.status === "void") notFound();

  return (
    <section className={`${wrap} grid gap-8 pb-24 pt-32 sm:pt-40`}>
      <article className="print-voucher relative mx-auto grid aspect-[1.6] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-black p-8 text-white sm:p-12">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(240,51,57,0.35),transparent_55%)]" />
        <div aria-hidden className="absolute -bottom-24 -left-24 size-72 rounded-full border border-white/10" />
        <div className="relative flex h-full flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <span className="text-xl tracking-[0.5em] sm:text-2xl">VYRA</span>
              <span className="font-mono text-[10px] tracking-[0.35em] text-white/50">ELITE IS STANDARD</span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">{t("Voucher prezentowy", "Gift voucher")}</span>
          </div>

          <div className="grid gap-3">
            {v.recipient_name ? <p className="display text-[clamp(2rem,6vw,3.5rem)] leading-none">{t(`Dla ${v.recipient_name}`, `For ${v.recipient_name}`)}</p> : null}
            <p className="text-lg text-white/80 sm:text-xl">
              {t("Indywidualne prowadzenie biegowe", "Individual running coaching")} · <span className="text-white">{v.plan_name}</span>
            </p>
            {v.message ? <p className="max-w-xl border-l-2 border-[var(--accent)] pl-4 text-white/70">„{v.message}”</p> : null}
            {v.buyer_name ? <p className="text-sm text-white/50">{t(`Od: ${v.buyer_name}`, `From: ${v.buyer_name}`)}</p> : null}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">{t("Kod", "Code")}</span>
              <span className="font-mono text-2xl tracking-[0.2em] sm:text-3xl">{v.code}</span>
            </div>
            <div className="grid gap-0.5 text-right text-[12px] text-white/55">
              <span>{t("Zrealizuj na", "Redeem at")} <span className="text-white">vyraathl.pl/voucher/realizuj</span></span>
              <span>{t(`Ważny do ${formatDate(v.valid_until, "d MMMM yyyy", lang)}`, `Valid until ${formatDate(v.valid_until, "d MMMM yyyy", lang)}`)}</span>
            </div>
          </div>
        </div>
      </article>

      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4">
        {v.status === "active" ? (
          <>
            <PrintButton />
            <PrimaryLink href={`/voucher/realizuj?kod=${v.code}`}>{t("To prezent dla mnie: zrealizuj", "It’s for me: redeem")}</PrimaryLink>
          </>
        ) : (
          <p className="text-white/60">
            {v.status === "redeemed" ? t("Ten voucher został już zrealizowany.", "This voucher has already been redeemed.") : t("Ten voucher stracił ważność.", "This voucher has expired.")}
          </p>
        )}
      </div>
    </section>
  );
}
