import type { Metadata } from "next";
import Link from "next/link";
import { wrap } from "@/components/site/blocks";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Standard", robots: { index: false, follow: false } };

/** Link from every newsletter: switches "Standard" off (membership stays). */
export default async function NewsletterSwitchPage({ searchParams }: { searchParams: Promise<{ t?: string; off?: string }> }) {
  const { t } = await getT();
  const sp = await searchParams;
  const token = sp.t ?? "";
  let ok = false;
  if (/^[0-9a-f-]{36}$/i.test(token) && sp.off) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("member_newsletter", { p_token: token, p_on: false });
    ok = data === false;
  }
  return (
    <section className={`${wrap} grid min-h-[60vh] content-center gap-5 py-32`}>
      <h1 className="display text-4xl text-white sm:text-5xl">{ok ? t("Wypisano ze „Standardu”", "Unsubscribed from “Standard”") : t("Ten link nie działa", "This link doesn’t work")}</h1>
      <p className="max-w-xl text-lg text-white/60">
        {ok
          ? t("Nie będziemy już wysyłać newslettera. Członkostwo w VYRA Club i Twój numer zostają. Newsletter włączysz z powrotem w strefie członka.", "We won’t send the newsletter any more. Your VYRA Club membership and number stay. Switch it back on in your members’ page.")
          : t("Jeśli dalej dostajesz maile, odpisz na jeden z nich, a wypiszemy Cię ręcznie.", "If you still get e-mails, reply to one and we’ll remove you by hand.")}
      </p>
      {ok ? (
        <Link href={`/klub/strefa?t=${token}`} className="w-fit text-white underline underline-offset-4">
          {t("Strefa członka", "Members’ page")}
        </Link>
      ) : null}
    </section>
  );
}
