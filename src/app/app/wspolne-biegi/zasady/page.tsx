import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Zasady wspólnych biegów" };

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Czym są wspólne biegi",
    p: [
      "„Wspólne biegi” to miejsce w aplikacji VYRA, w którym użytkownicy sami publikują ogłoszenia o swoich biegach (miasto, miejsce zbiórki, termin, dystans, tempo) i dołączają do biegów innych osób.",
      "VYRA udostępnia wyłącznie narzędzie do publikowania i przeglądania ogłoszeń. VYRA nie jest organizatorem, współorganizatorem ani prowadzącym tych biegów, nie wybiera tras, nie sprawdza uczestników i nie jest obecna podczas biegów.",
    ],
  },
  {
    h: "2. Kto może korzystać",
    p: ["Z wspólnych biegów mogą korzystać wyłącznie osoby pełnoletnie (18+), posiadające konto w VYRA, które zaakceptowały te zasady."],
  },
  {
    h: "3. Odpowiedzialność",
    p: [
      "Udział we wspólnym biegu jest dobrowolny. Każdy uczestnik biega na własną odpowiedzialność i sam ocenia, czy jego stan zdrowia, forma, warunki pogodowe i trasa pozwalają na bieg.",
      "Za treść ogłoszenia, wybór miejsca i przebieg spotkania odpowiada osoba, która je opublikowała, oraz uczestnicy. VYRA nie odpowiada za zachowanie użytkowników, wypadki, kontuzje, szkody ani utratę rzeczy podczas wspólnych biegów, w granicach dopuszczalnych przez prawo.",
      "Zasady te nie wyłączają odpowiedzialności VYRA w przypadkach, w których przepisy prawa nie pozwalają jej wyłączyć, ani praw konsumenta wynikających z przepisów.",
    ],
  },
  {
    h: "4. Bezpieczeństwo",
    p: [
      "Umawiaj się wyłącznie w publicznych, oświetlonych i znanych miejscach. Nigdy nie podawaj adresu domowego ani innych danych, których nie chcesz ujawniać.",
      "Powiedz bliskiej osobie, gdzie i z kim biegasz. Zabierz telefon. Wieczorem używaj odblasków albo czołówki.",
      "Nie wsiadaj do samochodu osoby poznanej przez ogłoszenie i nie zapraszaj obcych do domu.",
      "W sytuacji zagrożenia dzwoń pod numer alarmowy 112.",
    ],
  },
  {
    h: "5. Czego nie wolno publikować",
    p: [
      "Ogłoszeń niezwiązanych z bieganiem, reklam, treści obraźliwych, wprowadzających w błąd, danych osobowych innych osób oraz ogłoszeń skierowanych do osób niepełnoletnich.",
    ],
  },
  {
    h: "6. Zgłoszenia i usuwanie ogłoszeń",
    p: [
      "Każde ogłoszenie można zgłosić przyciskiem „Zgłoś”. Ogłoszenie zgłoszone przez trzy różne osoby jest automatycznie ukrywane do czasu sprawdzenia. VYRA może usunąć ogłoszenie albo zablokować dostęp do wspólnych biegów osobie, która narusza te zasady.",
      "Pytania i zgłoszenia: kontakt@vyraathl.pl.",
    ],
  },
  {
    h: "7. Dane",
    p: [
      "Inni użytkownicy widzą tylko Twoje imię przy ogłoszeniu. Lista imion uczestników jest widoczna wyłącznie dla osoby prowadzącej bieg i osób, które do niego dołączyły. Szczegóły przetwarzania danych opisuje polityka prywatności VYRA.",
    ],
  },
];

export default function GroupRunRules() {
  return (
    <div className="app-rise grid grid-cols-1 gap-5 pb-8">
      <PageHead title="Zasady wspólnych biegów" sub="Wersja z 19 listopada 2026" />
      {SECTIONS.map((s) => (
        <section key={s.h} className="grid gap-2">
          <h2 className="text-[17px] font-semibold">{s.h}</h2>
          {s.p.map((p) => (
            <p key={p} className="text-[15px] leading-relaxed text-white/75">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
