import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Maps database error codes raised by our functions to messages for people. */
export function friendlyDbError(message: string | undefined | null): string {
  const m = message ?? "";
  const known: [string, string][] = [
    ["INVITE_INVALID", "Zaproszenie jest nieaktualne albo zostało już wykorzystane."],
    ["INVITE_EMAIL_MISMATCH", "Ten link zaproszenia jest przypisany do innego adresu e-mail."],
    ["COACH_SIGNUP_CLOSED", "Rejestracja nowych trenerów jest wyłączona. Poproś trenera o zaproszenie."],
    ["ONLY_ATHLETES_CAN_ACCEPT", "Konto trenera nie może dołączyć jako zawodnik."],
    ["SESSION_NOT_FOUND", "Nie znaleziono treningu albo nie masz do niego dostępu."],
    ["PLAN_ATHLETE_MISMATCH", "Wybrany plan należy do innego zawodnika."],
    ["SESSION_OWNER_IMMUTABLE", "Nie można przenieść treningu do innego zawodnika. Skopiuj go zamiast tego."],
    ["EXECUTION_ATHLETE_MISMATCH", "Możesz zapisać wynik tylko własnego treningu."],
    ["NO_ATHLETES", "Wybierz co najmniej jednego zawodnika."],
    ["violates foreign key constraint", "Tego treningu nie można usunąć, bo ma zapisane wykonanie. Historia zostaje zachowana."],
    ["row-level security", "Nie masz uprawnień do tej operacji."],
    ["permission denied", "Nie masz uprawnień do tej operacji."],
    ["duplicate key value", "Taki wpis już istnieje."],
    ["violates check constraint", "Jedna z wartości jest poza dozwolonym zakresem."],
  ];
  for (const [needle, text] of known) if (m.includes(needle)) return text;
  return "Nie udało się zapisać. Spróbuj ponownie.";
}
