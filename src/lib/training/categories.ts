import { localized, tl } from "@/lib/i18n/runtime";
import type { SessionKind } from "@/lib/types";

export type CategoryKey =
  | "easy" | "recovery" | "long" | "tempo" | "threshold" | "intervals" | "fartlek" | "hills"
  | "progression" | "race_pace" | "test" | "race" | "custom_run"
  | "strength" | "power" | "circuit" | "mobility" | "motor_prep" | "other";

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
];

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

export function categoryLabel(key: string): string {
  return BY_KEY.get(key as CategoryKey)?.label ?? key;
}

export function categoriesFor(kind: SessionKind): CategoryDef[] {
  return CATEGORIES.filter((c) => c.kind === kind);
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
