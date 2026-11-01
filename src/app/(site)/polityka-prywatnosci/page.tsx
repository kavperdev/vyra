import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, wrap } from "@/components/site/blocks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const contact = SITE.email ? (
    <a href={`mailto:${SITE.email}`} className="underline underline-offset-4">
      {SITE.email}
    </a>
  ) : (
    <Link href="/kontakt" className="underline underline-offset-4">
      formularz kontaktowy
    </Link>
  );

  return (
    <>
      <PageHero eyebrow="Informacje prawne" title="Polityka prywatności" />
      <section className={`${wrap} py-20 sm:py-28`}>
        <div className="grid max-w-3xl gap-10 text-white/70 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-2">
          <div>
            <h2>Administrator danych</h2>
            <p>
              Administratorem danych osobowych przekazanych przez tę stronę jest {SITE.controller}, prowadzący markę VYRA. W
              sprawach dotyczących danych możesz skontaktować się przez {contact}.
            </p>
          </div>
          <div>
            <h2>Jakie dane i po co</h2>
            <ul>
              <li>Formularz „Lista zainteresowanych obozami”: imię i adres e-mail, aby poinformować Cię o terminie i programie obozu.</li>
              <li>
                Formularz „Zapytaj o prowadzenie”: imię i nazwisko, e-mail, cel treningowy oraz informacje, które sam podasz, aby
                odpowiedzieć na zgłoszenie i przygotować propozycję współpracy.
              </li>
              <li>Konto w platformie VYRA (dla zawodników): dane potrzebne do prowadzenia treningu, w tym plan i wyniki treningów.</li>
            </ul>
          </div>
          <div>
            <h2>Podstawa przetwarzania</h2>
            <p>
              Dane z formularzy przetwarzamy na podstawie Twojej zgody (art. 6 ust. 1 lit. a RODO) oraz w celu podjęcia działań
              przed zawarciem umowy na Twoje żądanie (art. 6 ust. 1 lit. b RODO). Zgodę możesz wycofać w każdej chwili.
            </p>
          </div>
          <div>
            <h2>Jak długo przechowujemy dane</h2>
            <p>
              Dane ze zgłoszeń przechowujemy do czasu zakończenia kontaktu lub wycofania zgody, nie dłużej niż 24 miesiące. Dane
              zawodników przechowujemy przez czas współpracy, a po jej zakończeniu usuwamy je na Twoją prośbę.
            </p>
          </div>
          <div>
            <h2>Komu powierzamy dane</h2>
            <p>
              Dane są przechowywane u dostawców usług technicznych, z których korzysta strona: Supabase (baza danych) i Vercel
              (hosting). Nie sprzedajemy danych i nie przekazujemy ich w celach marketingowych.
            </p>
          </div>
          <div>
            <h2>Twoje prawa</h2>
            <p>
              Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz
              wycofania zgody. Przysługuje Ci również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.
            </p>
          </div>
          <div>
            <h2>Pliki cookies</h2>
            <p>
              Strona używa wyłącznie plików cookies niezbędnych do działania logowania w platformie. Nie używamy cookies
              reklamowych ani analitycznych.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
