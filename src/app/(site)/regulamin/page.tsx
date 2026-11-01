import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageHero, wrap } from "@/components/site/blocks";
import { getT } from "@/lib/i18n/server";
import { SITE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Regulamin sprzedaży", "Terms of sale"),
    robots: { index: true, follow: true },
    alternates: { canonical: "/regulamin" },
  };
}

const UPDATED = "2 listopada 2026";
const UPDATED_EN = "2 November 2026";

export default async function TermsPage() {
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

  const sections: { h: string; items: ReactNode[] }[] = [
    {
      h: t("§1. Sprzedawca i usługi", "§1. Seller and services"),
      items: [
        <>
          {t(
            `Sprzedawcą usług dostępnych na tej stronie jest ${SITE.controller}, prowadzący markę VYRA`,
            `The seller of the services on this website is ${SITE.controller}, who runs the VYRA brand`,
          )}
          {SITE.address ? `, ${SITE.address}` : ""}. {t("Kontakt: ", "Contact: ")}
          {contact}.
        </>,
        t(
          "Sprzedawca świadczy usługi prowadzenia treningowego online: pakiety miesięczne (abonament) oraz usługi jednorazowe, np. pakiet Start, konsultację lub gotowy plan treningowy. Zakres każdego pakietu i cena są opisane na stronie Prowadzenie.",
          "The seller provides online training services: monthly packages (subscription) and one-off services such as the Start package, a consultation or a ready-made training plan. The scope and price of each package are described on the Coaching page.",
        ),
        t(
          "Usługi są realizowane w aplikacji VYRA oraz przez kontakt z trenerem. Do korzystania potrzebne jest urządzenie z dostępem do internetu i aktualną przeglądarką oraz adres e-mail.",
          "Services are delivered in the VYRA app and through contact with the coach. You need a device with internet access, an up-to-date browser and an e-mail address.",
        ),
      ],
    },
    {
      h: t("§2. Zamówienie i płatność", "§2. Ordering and payment"),
      items: [
        t(
          "Aby kupić pakiet, kliknij „Kup teraz”, zaakceptuj regulamin i zapłać na stronie operatora płatności Stripe (BLIK, karta płatnicza, Przelewy24). Umowa zostaje zawarta z chwilą zaksięgowania płatności. Potwierdzenie otrzymasz e-mailem.",
          "To buy a package, click “Buy now”, accept these terms and pay on the Stripe payment page (BLIK, card, Przelewy24). The contract is concluded when the payment is confirmed. You will receive a confirmation by e-mail.",
        ),
        t(
          "Ceny podane na stronie są cenami końcowymi w złotych polskich. Kod rabatowy wpisujesz na stronie płatności; rabaty nie łączą się, chyba że opis kodu mówi inaczej.",
          "Prices on the website are final prices in Polish złoty. Discount codes are entered on the payment page; discounts cannot be combined unless the code says otherwise.",
        ),
        t(
          "Pakiety miesięczne odnawiają się automatycznie co miesiąc i są pobierane z tej samej metody płatności. Abonament możesz zakończyć w każdej chwili, pisząc do nas; kończy się on z ostatnim dniem opłaconego okresu, bez dalszych opłat. Cena przy współpracy na 3 miesiące jest ustalana indywidualnie.",
          "Monthly packages renew automatically each month and are charged to the same payment method. You can cancel at any time by writing to us; the subscription ends on the last day of the paid period with no further charges. The 3-month commitment price is arranged individually.",
        ),
      ],
    },
    {
      h: t("§3. Realizacja usługi", "§3. Delivery of the service"),
      items: [
        t(
          "W ciągu jednego dnia roboczego od zakupu kontaktujemy się, aby umówić rozmowę wstępną i założyć konto w aplikacji VYRA. Plan treningowy przygotowujemy na podstawie informacji, które nam przekażesz.",
          "Within one working day of purchase we contact you to schedule an initial call and set up your VYRA account. We build your training plan based on the information you give us.",
        ),
        t(
          "Usługi VYRA nie są usługami medycznymi ani fizjoterapeutycznymi. Trenujesz na własną odpowiedzialność. Przed rozpoczęciem treningu, zwłaszcza po przerwie lub przy chorobach przewlekłych, skonsultuj się z lekarzem. Informuj trenera o bólu, urazach i chorobach.",
          "VYRA services are not medical or physiotherapy services. You train at your own risk. Before starting, especially after a break or with chronic conditions, consult a doctor. Tell your coach about pain, injuries and illness.",
        ),
        t(
          "Plany i materiały są przeznaczone wyłącznie do Twojego użytku. Nie wolno ich udostępniać ani sprzedawać dalej.",
          "Plans and materials are for your personal use only. They may not be shared or resold.",
        ),
      ],
    },
    {
      h: t("§4. Prawo odstąpienia od umowy (konsumenci)", "§4. Right of withdrawal (consumers)"),
      items: [
        t(
          "Jako konsument możesz odstąpić od umowy w ciągu 14 dni od jej zawarcia bez podania przyczyny. Wystarczy wiadomość e-mail lub przez formularz kontaktowy z informacją o odstąpieniu.",
          "As a consumer you may withdraw from the contract within 14 days of concluding it without giving a reason. A message by e-mail or through the contact form is enough.",
        ),
        t(
          "Przy zakupie prosisz o rozpoczęcie usługi przed upływem 14 dni. Jeśli odstąpisz po jej rozpoczęciu, zapłacisz za usługi wykonane do chwili odstąpienia, proporcjonalnie do ceny. Po pełnym wykonaniu usługi (np. przekazaniu kompletnego planu lub odbyciu konsultacji) prawo odstąpienia nie przysługuje, o czym zostajesz poinformowany przed zakupem.",
          "When buying you ask for the service to start within the 14-day period. If you withdraw after it has started, you pay for the services provided up to that point, in proportion to the price. Once the service has been fully performed (e.g. a complete plan delivered or a consultation held) the right of withdrawal no longer applies, as you are informed before purchase.",
        ),
        t(
          "Zwrot należności następuje w ciągu 14 dni tą samą metodą płatności, której użyto przy zakupie.",
          "Refunds are made within 14 days using the same payment method as the purchase.",
        ),
      ],
    },
    {
      h: t("§5. Reklamacje", "§5. Complaints"),
      items: [
        <>
          {t("Reklamacje dotyczące usług zgłaszaj przez ", "Send complaints about the services via ")}
          {contact}
          {t(
            ", opisując problem. Odpowiadamy w ciągu 14 dni. Konsument może też skorzystać z pozasądowych sposobów rozwiązywania sporów, np. pomocy miejskiego lub powiatowego rzecznika konsumentów.",
            ", describing the problem. We reply within 14 days. Consumers may also use out-of-court dispute resolution, e.g. help from a local consumer ombudsman.",
          )}
        </>,
      ],
    },
    {
      h: t("§6. Postanowienia końcowe", "§6. Final provisions"),
      items: [
        <>
          {t("Zasady przetwarzania danych opisuje ", "Personal data processing is described in the ")}
          <Link href="/polityka-prywatnosci" className="underline underline-offset-4">
            {t("polityka prywatności", "privacy policy")}
          </Link>
          .
        </>,
        t(
          "W sprawach nieuregulowanych stosuje się prawo polskie, w szczególności Kodeks cywilny i ustawę o prawach konsumenta. Regulamin nie ogranicza praw konsumenta wynikających z przepisów.",
          "Matters not covered here are governed by Polish law, in particular the Civil Code and the Consumer Rights Act. These terms do not limit consumer rights under the law.",
        ),
        t(
          "Zmiany regulaminu nie dotyczą umów zawartych przed zmianą. W razie rozbieżności między wersjami językowymi rozstrzyga wersja polska.",
          "Changes to these terms do not affect contracts concluded before the change. The Polish version prevails over the English translation.",
        ),
      ],
    },
  ];

  return (
    <>
      <PageHero eyebrow={t("Informacje prawne", "Legal information")} title={t("Regulamin sprzedaży", "Terms of sale")} />
      <section className={`${wrap} py-20 sm:py-28`}>
        <div className="grid max-w-3xl gap-10 text-white/70">
          {sections.map((s) => (
            <div key={s.h}>
              <h2 className="mb-3 text-xl font-semibold text-white">{s.h}</h2>
              <ol className="grid list-decimal gap-2 pl-5">
                {s.items.map((it, i) => (
                  <li key={i} className="leading-relaxed">
                    {it}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <p className="text-sm text-white/40">{t(`Obowiązuje od ${UPDATED}.`, `Effective from ${UPDATED_EN}.`)}</p>
        </div>
      </section>
    </>
  );
}
