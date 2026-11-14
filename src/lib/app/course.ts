/** "Biegaj mądrze": the free VYRA course in the app. Short lessons, no account needed (progress is kept on the device). */
export interface Lesson {
  slug: string;
  title: string;
  minutes: number;
  lead: string;
  body: string[];
  takeaways: string[];
  task: string;
}

export const COURSE = {
  slug: "biegaj-madrze",
  title: "Biegaj mądrze",
  lead: "9 krótkich lekcji od trenerów VYRA: jak zacząć, ile biegać, jak nie złapać kontuzji i jak dobiec do pierwszego startu.",
};

export const LESSONS: Lesson[] = [
  {
    slug: "jak-zaczac",
    title: "Jak zacząć i nie odpuścić po tygodniu",
    minutes: 3,
    lead: "Najczęstszy powód rezygnacji to nie brak siły, tylko za mocny start.",
    body: [
      "Na początku ciało nie wie jeszcze, co to regularny bieg. Serce i płuca przyzwyczajają się szybko, ale ścięgna, stawy i kości potrzebują tygodni. Dlatego pierwsze treningi mają być wręcz za łatwe.",
      "Jeśli nie przebiegniesz jeszcze 20 minut bez przerwy, przeplataj bieg z marszem, np. 1 minuta biegu i 2 minuty marszu, powtórzone 8 razy. Co tydzień wydłużaj odcinki biegu.",
      "Ważniejsza od długości treningu jest regularność: 3 krótkie biegi w tygodniu dają więcej niż jeden długi i dwa tygodnie przerwy.",
    ],
    takeaways: ["Zaczynaj za łatwo, a nie za mocno", "Bieg z marszem to pełnoprawny trening", "3 razy w tygodniu, regularnie"],
    task: "Zaplanuj w kalendarzu 3 dni w tym tygodniu na 20–30 minut ruchu.",
  },
  {
    slug: "tempo-rozmowy",
    title: "Tempo rozmowy: dlaczego wolniej znaczy szybciej",
    minutes: 4,
    lead: "Większość biegów, nawet u zawodowców, to spokojne tempo.",
    body: [
      "Spokojny bieg buduje bazę: więcej naczyń krwionośnych w mięśniach, silniejsze serce i lepsze spalanie tłuszczów. Te zmiany zachodzą właśnie przy niskiej intensywności, a nie przy zajeżdżaniu się.",
      "Najprostszy test: w spokojnym biegu możesz mówić pełnymi zdaniami. Jeśli łapiesz oddech co dwa słowa, zwolnij. Na początku to może oznaczać tempo wolniejsze, niż się spodziewasz, i to jest w porządku.",
      "Dobra zasada to około 80% czasu w spokojnym tempie i około 20% mocniej. Mocne treningi działają dopiero wtedy, gdy reszta tygodnia jest naprawdę luźna.",
    ],
    takeaways: ["Mów pełnymi zdaniami = dobre tempo", "Ok. 80% spokojnie, 20% mocniej", "Wolne biegi budują szybkość na później"],
    task: "Na następnym biegu sprawdź test rozmowy: powiedz na głos jedno pełne zdanie co kilka minut.",
  },
  {
    slug: "ile-biegac",
    title: "Ile biegać w tygodniu",
    minutes: 3,
    lead: "Zbyt szybki wzrost kilometrów to prosta droga do kontuzji.",
    body: [
      "Zwiększaj tygodniowy dystans stopniowo. Bezpieczna orientacyjna granica to około 10% więcej niż w poprzednim tygodniu.",
      "Co 3–4 tygodnie zrób lżejszy tydzień, z około 20–30% mniejszą objętością. To w trakcie odpoczynku organizm buduje formę.",
      "Jeden dzień bez biegu w tygodniu to minimum, szczególnie na początku. Możesz wtedy spacerować albo zrobić ćwiczenia siłowe.",
    ],
    takeaways: ["Max ok. +10% tygodniowo", "Co 3–4 tygodnie lżejszy tydzień", "Odpoczynek to część treningu"],
    task: "Zapisz, ile minut albo kilometrów przebiegłeś w tym tygodniu. To Twój punkt startu.",
  },
  {
    slug: "rozgrzewka",
    title: "Rozgrzewka i schłodzenie w 10 minut",
    minutes: 3,
    lead: "Dobra rozgrzewka to nie rozciąganie na stojąco, tylko ruch.",
    body: [
      "Zacznij od 5–10 minut bardzo spokojnego truchtu albo szybkiego marszu. Potem kilka dynamicznych ćwiczeń: wymachy nóg, krążenia bioder, skipy, wypady w marszu.",
      "Przed szybszym treningiem dodaj 3–4 przebieżki: 15–20 sekund przyspieszenia do szybkiego, ale luźnego biegu, i spokojny powrót.",
      "Po treningu 5 minut truchtu albo marszu pozwala tętnu spokojnie spaść. Rozciąganie zostaw na później albo na osobną sesję.",
    ],
    takeaways: ["Najpierw trucht, potem dynamika", "Przebieżki przed szybkim treningiem", "Schłodzenie: 5 minut spokojnie"],
    task: "Przed następnym biegiem zrób 5 minut truchtu i 4 ćwiczenia dynamiczne.",
  },
  {
    slug: "buty-i-stroj",
    title: "Buty i strój: co naprawdę ma znaczenie",
    minutes: 3,
    lead: "Nie potrzebujesz drogiego sprzętu. Potrzebujesz wygodnego.",
    body: [
      "Najważniejszy jest komfort: but ma być wygodny od pierwszego kroku, z miejscem na palce (około szerokości kciuka). Jeśli możesz, przymierz kilka par w sklepie biegowym i przebiegnij się w nich.",
      "Buty biegowe zużywają się zwykle po 600–900 km. Spłaszczona pianka i bolące nogi to sygnał do wymiany.",
      "Ubieraj się na cebulkę i tak, żeby na starcie było lekko chłodno. Po 10 minutach zrobi się ciepło. Po zmroku zawsze odblask albo czołówka.",
    ],
    takeaways: ["Wygoda ważniejsza niż marka", "Wymiana butów po ok. 600–900 km", "Na starcie ma być lekko chłodno"],
    task: "Sprawdź, ile kilometrów mają Twoje buty, i zapisz to w telefonie.",
  },
  {
    slug: "sila",
    title: "Siła dla biegacza: 3 ćwiczenia",
    minutes: 4,
    lead: "Silne nogi i tułów to mniej kontuzji i lepsza technika.",
    body: [
      "Dwa razy w tygodniu po 15–20 minut wystarczy. Nie potrzebujesz siłowni, wystarczy własne ciało.",
      "Przysiad: 3 serie po 12–15 powtórzeń, kolana w linii palców. Wspięcia na palce na jednej nodze: 3 serie po 12–15 na każdą nogę, powoli w dół. Deska bokiem: 3 razy po 20–40 sekund na stronę.",
      "Rób je w dni spokojnych biegów albo w dzień bez biegania, a nie przed mocnym treningiem.",
    ],
    takeaways: ["2 razy w tygodniu po 15–20 minut", "Przysiad, wspięcia, deska bokiem", "Nie przed mocnym treningiem"],
    task: "Zrób dziś jedną serię każdego z 3 ćwiczeń.",
  },
  {
    slug: "regeneracja",
    title: "Regeneracja: sen, jedzenie, picie",
    minutes: 4,
    lead: "Formę budujesz w trakcie treningu, ale zbierasz ją w trakcie odpoczynku.",
    body: [
      "Sen to najmocniejszy środek regeneracyjny. Po nieprzespanej nocy tętno przy tym samym tempie jest wyraźnie wyższe, a trening wydaje się cięższy. Celuj w 7–9 godzin.",
      "Po treningu zjedz posiłek z węglowodanami i białkiem w ciągu 1–2 godzin. Biegacze potrzebują też żelaza: mięso, jajka, rośliny strączkowe, najlepiej z warzywami bogatymi w witaminę C.",
      "Pij regularnie przez cały dzień. Kolor moczu to prosta wskazówka: jasnosłomkowy oznacza, że jest dobrze.",
    ],
    takeaways: ["Sen 7–9 godzin", "Po treningu węglowodany i białko", "Żelazo i woda na co dzień"],
    task: "Dziś połóż się 30 minut wcześniej niż zwykle.",
  },
  {
    slug: "bol-czy-zmeczenie",
    title: "Ból czy zmęczenie: kiedy odpuścić",
    minutes: 3,
    lead: "Zmęczenie mięśni jest normalne. Ostry lub narastający ból nie jest.",
    body: [
      "Ogólne zmęczenie i zakwasy mijają po 1–3 dniach. Ból, który jest punktowy, ostry, narasta w trakcie biegu albo zmienia Twój krok, to sygnał, żeby przerwać.",
      "Zasada: jeśli ból utrzymuje się dłużej niż kilka dni, wraca przy każdym biegu albo jest coraz silniejszy, odpuść bieganie i skonsultuj się z fizjoterapeutą lub lekarzem.",
      "Lepiej opuścić 3 dni teraz niż 3 tygodnie później. Jeden odpuszczony trening nic nie zmienia w Twojej formie.",
    ],
    takeaways: ["Zakwasy mijają, ból narasta", "Ból zmienia krok? Przerwij", "Kilka dni bez poprawy: fizjoterapeuta"],
    task: "Zapamiętaj zasadę: jeśli ból zmienia Twój krok, kończysz trening.",
  },
  {
    slug: "pierwszy-start",
    title: "Pierwszy start na 5 km",
    minutes: 4,
    lead: "5 km to najlepszy pierwszy cel: krótko, a jednak prawdziwe zawody.",
    body: [
      "Wybierz start za 6–10 tygodni. Bieg parkrun w sobotę rano albo lokalne zawody to dobre miejsca na pierwszy raz.",
      "W ostatnim tygodniu biegaj mniej, ale nie przestawaj. Dzień przed startem tylko krótki trucht albo odpoczynek. Niczego nowego w dniu startu: ani butów, ani jedzenia.",
      "Na trasie zacznij spokojniej, niż masz ochotę. Większość debiutantów biegnie pierwszy kilometr za szybko. Równe tempo albo mocniejsza końcówka dają najlepszy wynik i najlepsze wrażenia.",
    ],
    takeaways: ["Start za 6–10 tygodni", "Nic nowego w dniu startu", "Pierwszy kilometr spokojnie"],
    task: "Znajdź jeden bieg na 5 km w Twojej okolicy i zapisz jego datę.",
  },
];

export const lessonIndex = (slug: string) => LESSONS.findIndex((l) => l.slug === slug);
