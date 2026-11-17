import type { AnimKey } from "@/lib/app/figure";

/** Exercise library: short, visual. Each one has an animation; a recorded clip can replace it later (`video`). */
export type ExCat = "rozgrzewka" | "technika" | "sila" | "core" | "mobilnosc";
export type Exercise = {
  slug: string;
  name: string;
  cat: ExCat;
  anim: AnimKey;
  dose: string; // e.g. "2 × 20 m"
  works: string[]; // muscles / what it builds, as short chips
  cues: string[]; // max 3, short
  mistake: string;
  video?: string;
};

export const EX_CATS: Record<ExCat, { name: string; lead: string }> = {
  rozgrzewka: { name: "Rozgrzewka", lead: "5 minut przed każdym mocniejszym biegiem." },
  technika: { name: "Technika biegu", lead: "Lżejszy, szybszy krok." },
  sila: { name: "Siła biegacza", lead: "Mocne nogi to mniej kontuzji." },
  core: { name: "Core", lead: "Stabilny tułów, równy krok." },
  mobilnosc: { name: "Mobilność", lead: "Po biegu albo wieczorem." },
};

export const EXERCISES: Exercise[] = [
  {
    slug: "wymachy-nog",
    name: "Wymachy nóg",
    cat: "rozgrzewka",
    anim: "swing",
    dose: "2 × 12 na nogę",
    works: ["Biodra", "Tył uda"],
    cues: ["Trzymaj się ściany albo drzewa", "Ruch luźny, coraz wyżej", "Tułów stoi prosto"],
    mistake: "Szarpanie nogą na siłę. Ma być rozluźnienie, nie rozciąganie.",
  },
  {
    slug: "skip-a",
    name: "Skip A",
    cat: "technika",
    anim: "skipA",
    dose: "3 × 20 m",
    works: ["Zginacze bioder", "Praca stopy", "Kadencja"],
    cues: ["Kolano do wysokości biodra", "Lądujesz na przodzie stopy, pod sobą", "Ręce pracują jak w biegu"],
    mistake: "Odchylanie się do tyłu. Tułów zostaje prosto, lekko w przód.",
  },
  {
    slug: "skip-c",
    name: "Skip C",
    cat: "technika",
    anim: "skipC",
    dose: "3 × 20 m",
    works: ["Tył uda", "Szybkość kroku"],
    cues: ["Pięta szybko pod pośladek", "Kolano zostaje skierowane w dół", "Krótkie, szybkie kroki"],
    mistake: "Wypychanie kolan do przodu. Wtedy to już nie skip C.",
  },
  {
    slug: "przebiezka",
    name: "Przebieżka",
    cat: "technika",
    anim: "run",
    dose: "4–6 × 80 m",
    works: ["Szybkość", "Ekonomia biegu"],
    cues: ["Narastaj płynnie do ok. 90% sprintu", "Luźne barki i dłonie", "Wracaj marszem, pełny odpoczynek"],
    mistake: "Sprint od pierwszego kroku. Przebieżka ma się rozpędzać.",
  },
  {
    slug: "przysiad",
    name: "Przysiad",
    cat: "sila",
    anim: "squat",
    dose: "3 × 10–12",
    works: ["Czworogłowe", "Pośladki"],
    cues: ["Biodra w tył, jak na krzesło", "Kolana idą nad palcami", "Pięty zostają na ziemi"],
    mistake: "Kolana uciekają do środka. Wypychaj je lekko na zewnątrz.",
  },
  {
    slug: "wykroki",
    name: "Wykroki",
    cat: "sila",
    anim: "lunge",
    dose: "3 × 8 na nogę",
    works: ["Pośladki", "Czworogłowe", "Równowaga"],
    cues: ["Długi krok, oba kolana pod kątem 90°", "Tylne kolano prawie dotyka ziemi", "Tułów pionowo"],
    mistake: "Przednie kolano daleko za palcami i pięta w górze. Zrób dłuższy krok.",
  },
  {
    slug: "martwy-ciag-jednonoz",
    name: "Martwy ciąg na jednej nodze",
    cat: "sila",
    anim: "rdl",
    dose: "3 × 8 na nogę",
    works: ["Tył uda", "Pośladki", "Stopa i kostka"],
    cues: ["Tułów i tylna noga w jednej linii", "Biodra równo, nie otwieraj ich w bok", "Wolno w dół, mocno w górę"],
    mistake: "Zaokrąglone plecy. Schodź tylko tak nisko, jak trzymasz prosty grzbiet.",
  },
  {
    slug: "wejscia-na-skrzynie",
    name: "Wejścia na skrzynię",
    cat: "sila",
    anim: "stepup",
    dose: "3 × 10 na nogę",
    works: ["Pośladki", "Czworogłowe", "Siła jednonóż"],
    cues: ["Pchasz przednią nogą, nie odbijasz tylną", "Kolano nad palcami", "Na górze wyprost biodra"],
    mistake: "Odbijanie się z dolnej nogi. Cała praca ma iść z nogi na skrzyni.",
  },
  {
    slug: "wspiecia-na-palce",
    name: "Wspięcia na palce",
    cat: "sila",
    anim: "calf",
    dose: "3 × 15–20",
    works: ["Łydki", "Ścięgno Achillesa"],
    cues: ["Wolno w górę i jeszcze wolniej w dół", "Pełny zakres ruchu", "Trudniej: na jednej nodze"],
    mistake: "Szybkie podskakiwanie. Siła łydki rośnie w wolnym opuszczaniu.",
  },
  {
    slug: "most-biodrowy",
    name: "Most biodrowy",
    cat: "core",
    anim: "bridge",
    dose: "3 × 12",
    works: ["Pośladki", "Tył uda"],
    cues: ["Pięty blisko pośladków", "Wypchnij biodra, zaciśnij pośladki", "Na górze 2 sekundy"],
    mistake: "Wyginanie lędźwi. Ruch idzie z bioder, nie z dolnego grzbietu.",
  },
  {
    slug: "deska",
    name: "Deska",
    cat: "core",
    anim: "plank",
    dose: "3 × 30–60 s",
    works: ["Brzuch", "Stabilizacja"],
    cues: ["Łokcie pod barkami", "Ciało w jednej linii", "Spokojny oddech"],
    mistake: "Biodra opadają albo idą w górę. Lepiej krócej, ale prosto.",
  },
  {
    slug: "martwy-robak",
    name: "Martwy robak",
    cat: "core",
    anim: "deadbug",
    dose: "3 × 8 na stronę",
    works: ["Głębokie mięśnie brzucha", "Koordynacja"],
    cues: ["Lędźwie przyklejone do podłogi", "Przeciwna ręka i noga", "Wolno, z wydechem"],
    mistake: "Odrywanie lędźwi od podłogi. Wtedy skróć ruch nogi.",
  },
  {
    slug: "pompki",
    name: "Pompki",
    cat: "core",
    anim: "pushup",
    dose: "3 × 8–15",
    works: ["Klatka", "Ramiona", "Core"],
    cues: ["Dłonie pod barkami", "Łokcie ok. 45° od tułowia", "Ciało jak deska"],
    mistake: "Wiszące biodra. Łatwiej: z kolan albo o ławkę.",
  },
  {
    slug: "zginacze-bioder",
    name: "Rozciąganie zginaczy bioder",
    cat: "mobilnosc",
    anim: "hipflexor",
    dose: "2 × 40 s na stronę",
    works: ["Biodra", "Postawa"],
    cues: ["Klęk jednonóż, miednica podwinięta", "Ręka w górę po stronie klęczącej nogi", "Delikatnie biodrem w przód"],
    mistake: "Wyginanie pleców zamiast pracy biodrem.",
  },
];

export const exercise = (slug: string) => EXERCISES.find((e) => e.slug === slug);
