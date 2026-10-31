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
  { key: "easy", label: "Easy run", kind: "running", structure: "continuous" },
  { key: "recovery", label: "Bieg regeneracyjny", kind: "running", structure: "continuous" },
  { key: "long", label: "Long run", kind: "running", structure: "continuous" },
  { key: "tempo", label: "Tempo run", kind: "running", structure: "continuous" },
  { key: "threshold", label: "Próg (threshold)", kind: "running", structure: "intervals" },
  { key: "intervals", label: "Interwały", kind: "running", structure: "intervals" },
  { key: "fartlek", label: "Fartlek", kind: "running", structure: "fartlek" },
  { key: "hills", label: "Podbiegi", kind: "running", structure: "intervals" },
  { key: "progression", label: "Bieg progresywny", kind: "running", structure: "progression" },
  { key: "race_pace", label: "Tempo startowe", kind: "running", structure: "intervals" },
  { key: "test", label: "Test biegowy", kind: "running", structure: "continuous" },
  { key: "race", label: "Zawody", kind: "running", structure: "continuous" },
  { key: "custom_run", label: "Trening własny", kind: "running", structure: "custom" },
  { key: "strength", label: "Trening siłowy", kind: "strength" },
  { key: "power", label: "Moc / plyometria", kind: "strength" },
  { key: "circuit", label: "Obwód / interwały siłowe", kind: "strength" },
  { key: "motor_prep", label: "Przygotowanie motoryczne", kind: "strength" },
  { key: "mobility", label: "Mobilność / stabilizacja", kind: "mobility" },
  { key: "other", label: "Inne", kind: "other" },
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

export const KIND_LABEL: Record<SessionKind, string> = {
  running: "Bieg",
  strength: "Siła",
  mobility: "Mobilność",
  other: "Inne",
};

export const SEGMENT_TYPE_LABEL: Record<string, string> = {
  warmup: "Rozgrzewka",
  work: "Odcinek",
  recovery: "Przerwa",
  steady: "Bieg ciągły",
  strides: "Przebieżki",
  cooldown: "Schłodzenie",
};

export const INTENSITY_LABEL: Record<string, string> = {
  very_easy: "Bardzo lekko",
  easy: "Lekko",
  moderate: "Umiarkowanie",
  hard: "Mocno",
  very_hard: "Bardzo mocno",
  max: "Maksymalnie",
};

export const RECOVERY_LABEL: Record<string, string> = {
  jog: "trucht",
  walk: "marsz",
  standing: "w miejscu",
  easy: "lekki bieg",
};

export const STRUCTURE_LABEL: Record<string, string> = {
  continuous: "Ciągły",
  intervals: "Interwały",
  fartlek: "Fartlek",
  progression: "Progresja",
  custom: "Dowolna struktura",
};

export const ZONES = ["Z1", "Z2", "Z3", "Z4", "Z5"] as const;
