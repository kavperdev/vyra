import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, wrap } from "@/components/site/blocks";

export const metadata: Metadata = {
  title: "Usuwanie konta",
  description: "Jak usunąć konto VYRA i dane z nim powiązane.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/usun-konto" },
};

/** Public page with the deletion steps (Google Play asks for a web link to it). */
export default function DeleteAccountPage() {
  return (
    <>
      <PageHero tone="sky" eyebrow="Konto VYRA" title="Usuwanie konta" lead="Konto VYRA usuniesz sam w aplikacji, w kilka sekund. Możesz też poprosić nas o to e-mailem." />
      <section className={`${wrap} grid max-w-2xl gap-8 py-20 leading-relaxed text-white/70`}>
        <div className="grid gap-3">
          <h2 className="text-xl font-semibold text-white">W aplikacji</h2>
          <ol className="grid list-decimal gap-1.5 pl-5">
            <li>Zaloguj się w aplikacji VYRA.</li>
            <li>Wejdź w zakładkę Ty i przewiń na sam dół.</li>
            <li>Kliknij „Usuń konto”, wpisz USUŃ i potwierdź.</li>
          </ol>
          <Link href="/app/ty#usun" className="mt-2 w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-black">
            Przejdź do konta
          </Link>
        </div>
        <div className="grid gap-3">
          <h2 className="text-xl font-semibold text-white">E-mailem</h2>
          <p>
            Napisz na <a className="text-white underline underline-offset-2" href="mailto:kontakt@vyraathl.pl?subject=Usuni%C4%99cie%20konta">kontakt@vyraathl.pl</a> z adresu, na który masz konto. Usuniemy je najpóźniej w ciągu 30 dni i potwierdzimy to e-mailem.
          </p>
        </div>
        <div className="grid gap-3">
          <h2 className="text-xl font-semibold text-white">Co usuwamy</h2>
          <p>Konto i wszystkie dane z nim powiązane: dziennik treningów, plany, wyniki, dane o samopoczuciu, znajomych i wiadomości. Dane, które musimy przechowywać z mocy prawa (np. faktury i potwierdzenia płatności), zostają tak długo, jak wymagają tego przepisy, i nie są używane do niczego innego.</p>
        </div>
      </section>
    </>
  );
}
