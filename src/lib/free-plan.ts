/** Free 6-week "Zacznij biegać" (couch to 25 minutes) plan, given away for an e-mail address. */

export type FreeWeek = {
  week: number;
  focus: { pl: string; en: string };
  /** Main part of each of the 3 sessions in the week. */
  sessions: { pl: string; en: string }[];
  minutes: number;
};

const same = (pl: string, en: string) => [
  { pl, en },
  { pl, en },
  { pl, en },
];

export const FREE_PLAN: FreeWeek[] = [
  {
    week: 1,
    focus: { pl: "Przyzwyczajenie ciała do ruchu", en: "Getting your body used to moving" },
    sessions: same("8 × (1 min truchtu + 2 min marszu)", "8 × (1 min easy jog + 2 min walk)"),
    minutes: 34,
  },
  {
    week: 2,
    focus: { pl: "Dłuższe odcinki biegu", en: "Longer running blocks" },
    sessions: same("6 × (2 min truchtu + 2 min marszu)", "6 × (2 min easy jog + 2 min walk)"),
    minutes: 34,
  },
  {
    week: 3,
    focus: { pl: "Więcej biegu niż marszu", en: "More running than walking" },
    sessions: same("5 × (3 min truchtu + 1,5 min marszu)", "5 × (3 min easy jog + 1.5 min walk)"),
    minutes: 33,
  },
  {
    week: 4,
    focus: { pl: "Pierwsze 5 minut bez przerwy", en: "Your first 5 minutes non-stop" },
    sessions: same("4 × (5 min truchtu + 1,5 min marszu)", "4 × (5 min easy jog + 1.5 min walk)"),
    minutes: 36,
  },
  {
    week: 5,
    focus: { pl: "Budowanie wytrzymałości", en: "Building endurance" },
    sessions: same("3 × (8 min truchtu + 2 min marszu)", "3 × (8 min easy jog + 2 min walk)"),
    minutes: 40,
  },
  {
    week: 6,
    focus: { pl: "25 minut ciągłego biegu", en: "25 minutes of continuous running" },
    sessions: [
      { pl: "2 × (12 min truchtu + 2 min marszu)", en: "2 × (12 min easy jog + 2 min walk)" },
      { pl: "15 min truchtu + 2 min marszu + 8 min truchtu", en: "15 min easy jog + 2 min walk + 8 min easy jog" },
      { pl: "25 min truchtu bez przerwy. Gratulacje!", en: "25 min easy jog non-stop. Congratulations!" },
    ],
    minutes: 37,
  },
];

export const FREE_PLAN_RULES: { pl: string; en: string }[] = [
  {
    pl: "3 treningi w tygodniu, z co najmniej jednym dniem przerwy między nimi (np. pon, śr, sob).",
    en: "3 sessions a week with at least one rest day between them (e.g. Mon, Wed, Sat).",
  },
  {
    pl: "Każdy trening zaczynasz od 5 minut szybkiego marszu i kończysz 5 minutami spokojnego marszu.",
    en: "Start every session with 5 minutes of brisk walking and finish with 5 minutes of easy walking.",
  },
  {
    pl: "Trucht to tempo rozmowy: możesz mówić pełnymi zdaniami. Jeśli nie możesz, zwolnij.",
    en: "Easy jog means conversational pace: you can speak in full sentences. If you can’t, slow down.",
  },
  {
    pl: "Tydzień był za trudny? Powtórz go. To normalne i nic nie tracisz.",
    en: "Was a week too hard? Repeat it. That’s normal and you lose nothing.",
  },
  {
    pl: "Ostry ból (nie zmęczenie) to sygnał, żeby przerwać trening. Jeśli wraca, skonsultuj się z lekarzem lub fizjoterapeutą.",
    en: "Sharp pain (not fatigue) means stop. If it keeps coming back, see a doctor or physiotherapist.",
  },
];

export const FREE_PLAN_NAME = "Darmowy plan: Zacznij biegać";
