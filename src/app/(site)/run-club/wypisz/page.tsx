import type { Metadata } from "next";
import Link from "next/link";
import { wrap } from "@/components/site/blocks";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Run Club", robots: { index: false, follow: false } };

/** Link from the "new date" e-mails: removes the address from the list. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await getT();
  const token = (await searchParams).t ?? "";
  let removed = false;
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("run_club_unsubscribe", { p_token: token });
    removed = data === true;
  }
  return (
    <section className={`${wrap} grid min-h-[60vh] content-center gap-5 py-32`}>
      <h1 className="display text-4xl text-white sm:text-5xl">{removed ? t("Wypisano", "Unsubscribed") : t("Nie ma Cię już na liście", "You’re not on the list")}</h1>
      <p className="max-w-xl text-lg text-white/60">
        {removed
          ? t("Nie będziemy już pisać o nowych terminach Run Clubu. Na treningi możesz dalej zapisywać się na stronie.", "We won’t e-mail you about new Run Club dates any more. You can still sign up for runs on the website.")
          : t("Ten link już został użyty albo jest niepełny. Jeśli dalej dostajesz maile, odpisz na jeden z nich.", "This link was already used or is incomplete. If you still get e-mails, just reply to one.")}
      </p>
      <Link href="/run-club" className="w-fit text-white underline underline-offset-4">
        {t("Wróć do Run Clubu", "Back to Run Club")}
      </Link>
    </section>
  );
}
