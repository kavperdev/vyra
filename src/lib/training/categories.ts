import { localized, tl } from "@/lib/i18n/runtime";
import type { SessionKind } from "@/lib/types";

export type CategoryKey =
  | "easy" | "recovery" | "long" | "tempo" | "threshold" | "intervals" | "fartlek" | "hills"
  | "progression" | "race_pace" | "test" | "race" | "custom_run"
  | "strength" | "power" | "circuit" | "mobility" | "motor_prep" | "other"
  // Club sports (volleyball, football, swimming...): the session is a team practice, not a run.
  | "technique" | "tactics" | "game" | "match" | "sparring" | "swim";

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  kind: SessionKind;
  /** Suggested running structure when the category is chosen. */
  structure?: "continuous" | "intervals" | "fartlek" | "progression" | "custom";
}

export const CATEGORIES: CategoryDef[] = [
  { key: "easy", get label() { return tl("Easy run", "Easy run"); }, kind: "running", structure: "continuous" },
  { key: "recovery", get label() { return tl("Bieg regeneracyjny", "Recovery run"); }, kind: "running", structure: "continuous" },
  { key: "long", get label() { return tl("Long run", "Long run"); }, kind: "running", structure: "continuous" },
  { key: "tempo", get label() { return tl("Tempo run", "Tempo run"); }, kind: "running", structure: "continuous" },
  { key: "threshold", get label() { return tl("Próg (threshold)", "Threshold"); }, kind: "running", structure: "intervals" },
  { key: "intervals", get label() { return tl("Interwały", "Intervals"); }, kind: "running", structure: "intervals" },
  { key: "fartlek", get label() { return tl("Fartlek", "Fartlek"); }, kind: "running", structure: "fartlek" },
  { key: "hills", get label() { return tl("Podbiegi", "Hills"); }, kind: "running", structure: "intervals" },
  { key: "progression", get label() { return tl("Bieg progresywny", "Progression run"); }, kind: "running", structure: "progression" },
  { key: "race_pace", get label() { return tl("Tempo startowe", "Race pace"); }, kind: "running", structure: "intervals" },
  { key: "test", get label() { return tl("Test biegowy", "Running test"); }, kind: "running", structure: "continuous" },
  { key: "race", get label() { return tl("Zawody", "Race"); }, kind: "running", structure: "continuous" },
  { key: "custom_run", get label() { return tl("Trening własny", "Custom run"); }, kind: "running", structure: "custom" },
  { key: "strength", get label() { return tl("Trening siłowy", "Strength training"); }, kind: "strength" },
  { key: "power", get label() { return tl("Moc / plyometria", "Power / plyometrics"); }, kind: "strength" },
  { key: "circuit", get label() { return tl("Obwód / interwały siłowe", "Circuit / strength intervals"); }, kind: "strength" },
  { key: "motor_prep", get label() { return tl("Przygotowanie motoryczne", "Athletic preparation"); }, kind: "strength" },
  { key: "mobility", get label() { return tl("Mobilność / stabilizacja", "Mobility / stability"); }, kind: "mobility" },
  { key: "other", get label() { return tl("Inne", "Other"); }, kind: "other" },
  { key: "technique", get label() { return tl("Technika", "Technique"); }, kind: "other" },
  { key: "tactics", get label() { return tl("Taktyka i ustawienia", "Tactics"); }, kind: "other" },
  { key: "game", get label() { return tl("Gra i małe gry", "Game play"); }, kind: "other" },
  { key: "match", get label() { return tl("Mecz / zawody", "Match / competition"); }, kind: "other" },
  { key: "sparring", get label() { return tl("Sparing", "Sparring"); }, kind: "other" },
  { key: "swim", get label() { return tl("Trening pływacki", "Swim session"); }, kind: "other" },
];

/** Session categories that only make sense for runners (and athletics). */
const RUN_ONLY = new Set<CategoryKey>(["easy", "recovery", "long", "tempo", "threshold", "intervals", "fartlek", "hills", "progression", "race_pace", "test", "race", "custom_run"]);
const CLUB_ONLY = new Set<CategoryKey>(["technique", "tactics", "game", "match", "sparring", "swim"]);

/** What each club sport plans (the "other" kind is its practice). Athletics and runners keep the running list. */
const SPORT_CATS: Record<string, CategoryKey[]> = {
  football: ["technique", "tactics", "game", "match", "sparring", "other"],
  volleyball: ["technique", "tactics", "game", "match", "sparring", "other"],
  basketball: ["technique", "tactics", "game", "match", "sparring", "other"],
  handball: ["technique", "tactics", "game", "match", "sparring", "other"],
  tennis: ["technique", "tactics", "game", "match", "other"],
  swimming: ["swim", "technique", "match", "other"],
  martial_arts: ["technique", "sparring", "match", "other"],
  gymnastics: ["technique", "match", "other"],
  other: ["technique", "tactics", "game", "match", "other"],
};

/** True for a club whose sport is not running/athletics: its coaches never see running fields. */
export const isTeamSport = (sport: string | null | undefined) => !!sport && sport !== "athletics" && sport in SPORT_CATS;

/** Sport-specific wording for the practice categories. */
const SPORT_LABEL: Record<string, Partial<Record<CategoryKey, string>>> = {
  volleyball: { technique: "Technika: zagrywka, przyjęcie, atak, blok", tactics: "Taktyka: ustawienia i systemy gry", game: "Gra 6 na 6 i małe gry", match: "Mecz", sparring: "Sparing" },
  football: { technique: "Technika: podanie, przyjęcie, drybling, strzał", tactics: "Taktyka i stałe fragmenty", game: "Gry w małych grupach", match: "Mecz", sparring: "Sparing" },
  basketball: { technique: "Technika: kozłowanie, podanie, rzut", tactics: "Taktyka: atak i obrona", game: "Gra 5 na 5 i małe gry", match: "Mecz", sparring: "Sparing" },
  handball: { technique: "Technika: podanie, rzut, zwody", tactics: "Taktyka: atak pozycyjny, obrona", game: "Gra i małe gry", match: "Mecz", sparring: "Sparing" },
  tennis: { technique: "Technika: forhend, bekhend, serwis", tactics: "Taktyka meczowa", game: "Gra punktowa", match: "Turniej / mecz" },
  swimming: { swim: "Trening w wodzie (serie)", technique: "Technika pływania", match: "Zawody" },
  martial_arts: { technique: "Technika", sparring: "Sparing / randori", match: "Zawody" },
  gymnastics: { technique: "Elementy i układy", match: "Zawody" },
};

/** Categories a coach picks from, for this kind of session and this club sport (none = runner / athletics). */
export function categoriesForSport(kind: SessionKind, sport?: string | null): CategoryDef[] {
  if (!isTeamSport(sport)) return CATEGORIES.filter((c) => c.kind === kind && !CLUB_ONLY.has(c.key));
  const keys = kind === "other" ? SPORT_CATS[sport!] : null;
  const list = keys ? keys.map((k) => CATEGORIES.find((c) => c.key === k)!).filter(Boolean) : CATEGORIES.filter((c) => c.kind === kind && !RUN_ONLY.has(c.key) && !CLUB_ONLY.has(c.key));
  const words = SPORT_LABEL[sport!] ?? {};
  return list.map((c) => (words[c.key] ? { ...c, label: words[c.key]! } : c));
}

/** The session types a club sport's coach chooses between, with their names. */
export function kindsForSport(sport?: string | null): { kind: SessionKind; label: string }[] {
  if (!isTeamSport(sport)) return (Object.keys(KIND_LABEL) as SessionKind[]).map((k) => ({ kind: k, label: KIND_LABEL[k] }));
  return [
    { kind: "other", label: tl("Trening", "Practice") },
    { kind: "strength", label: tl("Motoryka", "Conditioning") },
    { kind: "mobility", label: tl("Regeneracja", "Recovery") },
  ];
}

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

export function categoryLabel(key: string): string {
  return BY_KEY.get(key as CategoryKey)?.label ?? key;
}

export function categoriesFor(kind: SessionKind): CategoryDef[] {
  return CATEGORIES.filter((c) => c.kind === kind && !CLUB_ONLY.has(c.key));
}

export function defaultCategory(kind: SessionKind): CategoryKey {
  return categoriesFor(kind)[0]?.key ?? "other";
}

export function isCategoryKey(value: string): value is CategoryKey {
  return BY_KEY.has(value as CategoryKey);
}

export const KIND_LABEL: Record<SessionKind, string> = localized<SessionKind>({
  running: "Bieg",
  strength: "Siła",
  mobility: "Mobilność",
  other: "Inne",
}, { running: "Run", strength: "Strength", mobility: "Mobility", other: "Other" });

export const SEGMENT_TYPE_LABEL: Record<string, string> = localized<string>({
  warmup: "Rozgrzewka",
  work: "Odcinek",
  recovery: "Przerwa",
  steady: "Bieg ciągły",
  strides: "Przebieżki",
  cooldown: "Schłodzenie",
}, { warmup: "Warm-up", work: "Rep", recovery: "Recovery", steady: "Steady run", strides: "Strides", cooldown: "Cool-down" });

export const INTENSITY_LABEL: Record<string, string> = localized<string>({
  very_easy: "Bardzo lekko",
  easy: "Lekko",
  moderate: "Umiarkowanie",
  hard: "Mocno",
  very_hard: "Bardzo mocno",
  max: "Maksymalnie",
}, { very_easy: "Very easy", easy: "Easy", moderate: "Moderate", hard: "Hard", very_hard: "Very hard", max: "Maximal" });

export const RECOVERY_LABEL: Record<string, string> = localized<string>({
  jog: "trucht",
  walk: "marsz",
  standing: "w miejscu",
  easy: "lekki bieg",
}, { jog: "jog", walk: "walk", standing: "standing", easy: "easy run" });

export const STRUCTURE_LABEL: Record<string, string> = localized<string>({
  continuous: "Ciągły",
  intervals: "Interwały",
  fartlek: "Fartlek",
  progression: "Progresja",
  custom: "Dowolna struktura",
}, { continuous: "Continuous", intervals: "Intervals", fartlek: "Fartlek", progression: "Progression", custom: "Custom structure" });

export const ZONES = ["Z1", "Z2", "Z3", "Z4", "Z5"] as const;
