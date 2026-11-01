import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, wrap } from "@/components/site/blocks";
import { getT } from "@/lib/i18n/server";
import { SITE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Polityka prywatności", "Privacy policy"),
    robots: { index: true, follow: true },
    alternates: { canonical: "/polityka-prywatnosci" },
  };
}

export default async function PrivacyPage() {
  const { t } = await getT();
  const contact = SITE.email ? (
    <a href={`mailto:${SITE.email}`} className="underline underline-offset-4">
      {SITE.email}
    </a>
  ) : (
    <Link href="/kontakt" className="underline underline-offset-4">
      {t("formularz kontaktowy", "the contact form")}
    </Link>
  );

  return (
    <>
      <PageHero eyebrow={t("Informacje prawne", "Legal information")} title={t("Polityka prywatności", "Privacy policy")} />
      <section className={`${wrap} py-20 sm:py-28`}>
        <div className="grid max-w-3xl gap-10 text-white/70 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-2">
          <div>
            <h2>{t("Administrator danych", "Data controller")}</h2>
            <p>
              {t(
                `Administratorem danych osobowych przekazanych przez tę stronę jest ${SITE.controller}, prowadzący markę VYRA. W sprawach dotyczących danych możesz skontaktować się przez `,
                `The controller of personal data submitted through this website is ${SITE.controller}, who runs the VYRA brand. For any data matters you can get in touch via `,
              )}
              {contact}.
            </p>
          </div>
          <div>
            <h2>{t("Jakie dane i po co", "What data and why")}</h2>
            <ul>
              <li>
                {t(
                  "Formularz „Lista zainteresowanych obozami”: imię i adres e-mail, aby poinformować Cię o terminie i programie obozu.",
                  "The “Camp interest list” form: your name and email address, to tell you about the camp dates and programme.",
                )}
              </li>
              <li>
                {t(
                  "Formularz „Zapytaj o prowadzenie”: imię i nazwisko, e-mail, cel treningowy oraz informacje, które sam podasz, aby odpowiedzieć na zgłoszenie i przygotować propozycję współpracy.",
                  "The “Ask about coaching” form: your full name, email, training goal and any information you choose to give, to reply to your request and prepare a coaching proposal.",
                )}
              </li>
              <li>
                {t(
                  "Konto w platformie VYRA (dla zawodników): dane potrzebne do prowadzenia treningu, w tym plan i wyniki treningów.",
                  "A VYRA platform account (for athletes): the data needed for coaching, including your plan and training results.",
                )}
              </li>
            </ul>
          </div>
          <div>
            <h2>{t("Podstawa przetwarzania", "Legal basis")}</h2>
            <p>
              {t(
                "Dane z formularzy przetwarzamy na podstawie Twojej zgody (art. 6 ust. 1 lit. a RODO) oraz w celu podjęcia działań przed zawarciem umowy na Twoje żądanie (art. 6 ust. 1 lit. b RODO). Zgodę możesz wycofać w każdej chwili.",
                "We process data from the forms on the basis of your consent (Art. 6(1)(a) GDPR) and to take steps at your request before entering into a contract (Art. 6(1)(b) GDPR). You can withdraw your consent at any time.",
              )}
            </p>
          </div>
          <div>
            <h2>{t("Jak długo przechowujemy dane", "How long we keep data")}</h2>
            <p>
              {t(
                "Dane ze zgłoszeń przechowujemy do czasu zakończenia kontaktu lub wycofania zgody, nie dłużej niż 24 miesiące. Dane zawodników przechowujemy przez czas współpracy, a po jej zakończeniu usuwamy je na Twoją prośbę.",
                "We keep data from requests until our contact ends or you withdraw consent, and no longer than 24 months. Athletes’ data is kept for the duration of coaching and deleted at your request once it ends.",
              )}
            </p>
          </div>
          <div>
            <h2>{t("Komu powierzamy dane", "Who processes data for us")}</h2>
            <p>
              {t(
                "Dane są przechowywane u dostawców usług technicznych, z których korzysta strona: Supabase (baza danych) i Vercel (hosting i anonimowe statystyki odwiedzin). Nie sprzedajemy danych i nie przekazujemy ich w celach marketingowych.",
                "Data is stored with the technical providers the website uses: Supabase (database) and Vercel (hosting and anonymous visit statistics). We do not sell data or share it for marketing purposes.",
              )}
            </p>
          </div>
          <div>
            <h2>{t("Twoje prawa", "Your rights")}</h2>
            <p>
              {t(
                "Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz wycofania zgody. Przysługuje Ci również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.",
                "You have the right to access, rectify and erase your data, to restrict processing, to data portability and to withdraw consent. You also have the right to lodge a complaint with the Polish data protection authority (Prezes Urzędu Ochrony Danych Osobowych).",
              )}
            </p>
          </div>
          <div>
            <h2>{t("Pliki cookies i statystyki", "Cookies and statistics")}</h2>
            <p>
              {t(
                "Strona używa wyłącznie plików cookies niezbędnych do działania: logowania w platformie i zapamiętania wybranego języka. Statystyki odwiedzin są zbierane anonimowo, bez plików cookies. Nie używamy cookies reklamowych.",
                "The website uses only essential cookies: for signing in to the platform and remembering your chosen language. Visit statistics are collected anonymously, without cookies. We do not use advertising cookies.",
              )}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
