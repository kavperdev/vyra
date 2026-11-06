import type { Metadata } from "next";
import Link from "next/link";
import { wrap } from "@/components/site/blocks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Regulamin wyzwań",
  description: "Zasady udziału w wyzwaniach VYRA: zapis, wpisywanie biegów, weryfikacja wyników, rankingi i nagrody.",
  alternates: { canonical: "/wyzwania/regulamin" },
};

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "Organizator",
    items: [`Organizatorem wyzwań jest ${SITE.controller}, VYRA, ${SITE.address}, kontakt: ${SITE.email}.`],
  },
  {
    title: "Udział",
    items: [
      "Udział jest bezpłatny i otwarty dla każdego, niezależnie od klubu, miasta i poziomu.",
      "Osoba niepełnoletnia może wziąć udział za zgodą rodzica lub opiekuna.",
      "Zapis wymaga imienia i adresu e-mail. Na e-mail wysyłamy prywatny link do wpisywania biegów. Link jest tylko dla uczestnika.",
    ],
  },
  {
    title: "Wpisywanie biegów",
    items: [
      "Wpisujesz tylko własne biegi (bieg albo marszobieg), wykonane w czasie trwania wyzwania. Rower, rolki i inne sporty się nie liczą.",
      "Każdy bieg wpisujesz z dystansem i czasem. Jeden wpis to jeden trening.",
      "Biegi wpisuje się najpóźniej ostatniego dnia wyzwania.",
    ],
  },
  {
    title: "Weryfikacja wyników",
    items: [
      "Wpisy z tempem niemożliwym dla amatora są odrzucane od razu.",
      "Wpisy nietypowe (bardzo szybkie tempo, bardzo duży dystans dzienny lub tygodniowy) czekają na sprawdzenie, ale do tego czasu liczą się w wynikach.",
      "Do biegu można dodać zrzut ekranu z zegarka lub aplikacji. Zrzut jest sprawdzany automatycznie, a w razie wątpliwości ręcznie przez organizatora.",
      "Organizator może odrzucić bieg, który budzi wątpliwości, a przy oczywistym oszustwie wykluczyć uczestnika z wyzwania.",
    ],
  },
  {
    title: "Rankingi",
    items: [
      "Ranking biegaczy liczy kilometry albo liczbę biegów, zależnie od wyzwania. Odrzucone biegi się nie liczą.",
      "Ranking klubów sumuje wyniki uczestników, którzy wpisali ten sam klub lub grupę. Organizator może połączyć różne zapisy tej samej nazwy.",
      "Znak ✓ przy nazwisku oznacza, że wszystkie biegi tej osoby są zweryfikowane.",
    ],
  },
  {
    title: "Nagrody",
    items: [
      "Nagrody opisujemy na stronie każdego wyzwania.",
      "Kod rabatowy za ukończenie pojawia się automatycznie w strefie uczestnika po osiągnięciu celu.",
      "O miejsca w pierwszej trójce mogą walczyć tylko osoby, których wszystkie biegi są zweryfikowane.",
      "Losowanie nagród (jeśli jest w wyzwaniu) odbywa się spośród osób, które ukończyły cel, w ciągu 7 dni od końca wyzwania. Wyniki ogłaszamy w newsletterze i na Instagramie @vyra.athl.",
      "Ze zwycięzcami kontaktujemy się mailowo. Brak odpowiedzi w ciągu 14 dni oznacza rezygnację z nagrody. Nagród nie wymieniamy na gotówkę.",
    ],
  },
  {
    title: "Zdrowie",
    items: ["Biegasz na własną odpowiedzialność. Trenuj rozsądnie: wyzwanie ma budować nawyk, a nie prowadzić do kontuzji. W razie bólu odpuść i skonsultuj się z lekarzem lub fizjoterapeutą."],
  },
  {
    title: "Dane",
    items: [
      "Imię, numer VYRA, klub i wyniki są widoczne w publicznym rankingu. Adres e-mail nigdy.",
      "Zrzuty ekranu przechowujemy w zamkniętym miejscu, tylko do sprawdzenia wyników, i usuwamy najpóźniej 30 dni po zakończeniu wyzwania.",
    ],
  },
  {
    title: "Zmiany",
    items: ["Organizator może zmienić regulamin. Zmiany nie dotyczą wyzwań, które już trwają, chyba że są korzystne dla uczestników."],
  },
];

export default function ChallengeRulesPage() {
  return (
    <section className={`${wrap} grid max-w-3xl gap-10 pb-24 pt-36 sm:pt-44`}>
      <div className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent)]">Wyzwania VYRA</p>
        <h1 className="display text-5xl text-white">Regulamin wyzwań</h1>
      </div>
      {SECTIONS.map((s, i) => (
        <div key={s.title} className="grid gap-3">
          <h2 className="text-xl font-semibold text-white">
            {i + 1}. {s.title}
          </h2>
          <ul className="grid list-disc gap-2 pl-5 leading-relaxed text-white/70">
            {s.items.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-white/55">
        Przetwarzanie danych opisuje{" "}
        <Link href="/polityka-prywatnosci" className="text-white underline underline-offset-4">
          polityka prywatności
        </Link>
        .
      </p>
    </section>
  );
}
