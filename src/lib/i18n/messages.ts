import type { ActionResult } from "@/lib/types";
import type { Lang } from "./shared";

/**
 * English versions of the messages server actions return (errors, confirmations, field validation).
 * Actions are written in Polish; localizeResult() translates the reply for English users in one place.
 * A message missing here simply stays in Polish.
 */
const EXACT: Record<string, string> = {
  // auth and invitations
  "Nieprawidłowy e-mail lub hasło.": "Incorrect email or password.",
  "Potwierdź adres e-mail, klikając link w wiadomości od nas.": "Confirm your email address using the link in our message.",
  "Sprawdź skrzynkę i potwierdź adres e-mail, aby się zalogować.": "Check your inbox and confirm your email address to sign in.",
  "Nie udało się przyjąć zaproszenia. Sprawdź, czy używasz adresu e-mail, na który przyszło zaproszenie, i czy link jest aktualny.":
    "We couldn’t accept the invitation. Check that you’re using the email address it was sent to and that the link is still valid.",
  "Konto utworzone. Potwierdź adres e-mail linkiem z wiadomości, a potem zaloguj się.":
    "Account created. Confirm your email address using the link in the message, then sign in.",
  "Jeśli konto istnieje, wysłaliśmy link do ustawienia nowego hasła.": "If the account exists, we’ve sent a link to set a new password.",
  "Link wygasł. Poproś o nowy link do zmiany hasła.": "The link has expired. Request a new password link.",
  "Nowe hasło musi różnić się od obecnego.": "The new password must be different from the current one.",
  "Hasło zostało zmienione.": "Your password has been changed.",
  "Konto z tym adresem już istnieje. Zaloguj się.": "An account with this address already exists. Sign in.",
  "Hasło nie spełnia wymagań bezpieczeństwa.": "The password doesn’t meet the security requirements.",
  "Nie udało się utworzyć konta. Spróbuj ponownie.": "We couldn’t create the account. Please try again.",
  "Podaj hasło": "Enter your password",
  "Hasła nie są takie same": "The passwords don’t match",
  "Hasło może mieć najwyżej 72 znaki": "The password can be at most 72 characters",
  "Hasło musi mieć co najmniej 8 znaków": "The password must be at least 8 characters",
  "Hasło musi zawierać literę i cyfrę": "The password must contain a letter and a number",
  "Zaproszenie jest nieaktualne albo zostało już wykorzystane.": "The invitation is no longer valid or has already been used.",
  "Ten link zaproszenia jest przypisany do innego adresu e-mail.": "This invitation link belongs to a different email address.",
  "Rejestracja nowych trenerów jest wyłączona. Poproś trenera o zaproszenie.": "New coach sign-up is closed. Ask a coach for an invitation.",
  "Konto trenera nie może dołączyć jako zawodnik.": "A coach account can’t join as an athlete.",
  "Na ten adres wysłano już aktywne zaproszenie.": "An active invitation has already been sent to this address.",
  "Ta osoba jest już w Twoim zespole.": "This person is already on your team.",
  "Ta osoba ma już konto w VYRA.": "This person already has a VYRA account.",
  "Zaproszenie anulowane.": "Invitation cancelled.",
  // general
  "Sesja wygasła. Zaloguj się ponownie.": "Your session has expired. Please sign in again.",
  "Coś poszło nie tak. Spróbuj ponownie.": "Something went wrong. Please try again.",
  "Sprawdź formularz.": "Please check the form.",
  "Nie udało się zapisać. Spróbuj ponownie.": "Couldn’t save. Please try again.",
  "Nie masz uprawnień do tej operacji.": "You don’t have permission to do this.",
  "Taki wpis już istnieje.": "This entry already exists.",
  "Jedna z wartości jest poza dozwolonym zakresem.": "One of the values is outside the allowed range.",
  "Podaj poprawny adres e-mail": "Enter a valid email address",
  "Podaj poprawny e-mail": "Enter a valid email",
  "Podaj imię": "Enter a first name",
  "Podaj imię i nazwisko": "Enter a full name",
  "Tekst jest za długi": "The text is too long",
  "Tekst jest za długi.": "The text is too long.",
  "Podaj liczbę.": "Enter a number.",
  "Wybierz datę": "Choose a date",
  "Wybierz datę.": "Choose a date.",
  "Nieznana rola.": "Unknown role.",
  "Nieznany status.": "Unknown status.",
  "Nieprawidłowa subskrypcja powiadomień.": "Invalid notification subscription.",
  "Powiadomienia włączone na tym urządzeniu.": "Notifications turned on for this device.",
  "Powiadomienia wyłączone na tym urządzeniu.": "Notifications turned off for this device.",
  // training sessions
  "Nie znaleziono treningu albo nie masz do niego dostępu.": "Session not found or you don’t have access to it.",
  "Nie znaleziono treningu.": "Session not found.",
  "Nie znaleziono zawodnika.": "Athlete not found.",
  "Wybrany plan należy do innego zawodnika.": "The selected plan belongs to another athlete.",
  "Nie można przenieść treningu do innego zawodnika. Skopiuj go zamiast tego.": "A session can’t be moved to another athlete. Copy it instead.",
  "Możesz zapisać wynik tylko własnego treningu.": "You can only log results for your own sessions.",
  "Wybierz co najmniej jednego zawodnika.": "Choose at least one athlete.",
  "Wybierz co najmniej jednego zawodnika": "Choose at least one athlete",
  "Wybierz zawodnika.": "Choose an athlete.",
  "Tego treningu nie można usunąć, bo ma zapisane wykonanie. Historia zostaje zachowana.":
    "This session can’t be deleted because it has a logged result. History is kept.",
  "Dodano trening.": "Session added.",
  "Zapisano zmiany w treningu.": "Session changes saved.",
  "Usunięto trening.": "Session deleted.",
  "Skopiowano trening.": "Session copied.",
  "Zmieniono termin. Zawodnik dostał powiadomienie.": "Date changed. The athlete has been notified.",
  "Wybierz tydzień.": "Choose a week.",
  "Wybierz inny tydzień albo innego zawodnika.": "Choose another week or another athlete.",
  "W wybranym tygodniu nie ma treningów do skopiowania.": "There are no sessions to copy in the selected week.",
  "Zapisano jako szablon.": "Saved as a template.",
  "Zapisano szablon.": "Template saved.",
  "Skopiowano szablon.": "Template copied.",
  "Usunięto szablon. Treningi utworzone z niego pozostają bez zmian.": "Template deleted. Sessions created from it stay unchanged.",
  "Zapisano plan.": "Plan saved.",
  "Usunięto plan. Treningi zostały, tylko bez przypisania do planu.": "Plan deleted. The sessions remain, just without a plan.",
  "Podaj nazwę treningu": "Enter a session name",
  "Podaj nazwę szablonu": "Enter a template name",
  "Podaj nazwę planu": "Enter a plan name",
  "Podaj nazwę ćwiczenia": "Enter an exercise name",
  "Wybierz rodzaj treningu": "Choose a session type",
  "Rodzaj nie pasuje do typu treningu": "The category doesn’t match the session type",
  "Dodaj co najmniej jedno ćwiczenie": "Add at least one exercise",
  "Dodaj co najmniej jedną serię": "Add at least one set",
  "Podaj dystans albo czas odcinka": "Enter a distance or time for the segment",
  "Dystans w metrach": "Distance in metres",
  "Przerwa w metrach": "Recovery in metres",
  "Godzina w formacie HH:MM": "Time in HH:MM format",
  "Tempo wpisz jako m:ss, np. 4:30": "Enter pace as m:ss, e.g. 4:30",
  "Czas wpisz jako mm:ss lub h:mm:ss.": "Enter time as mm:ss or h:mm:ss.",
  "Czas wpisz jako mm:ss, h:mm:ss albo w minutach": "Enter time as mm:ss, h:mm:ss or in minutes",
  "Dystans wpisz w km, np. 10,5": "Enter distance in km, e.g. 10.5",
  "Dystans wpisz w km.": "Enter distance in km.",
  "Wolniejsza granica musi być ≥ szybszej": "The slower limit must be ≥ the faster one",
  "Górna granica musi być ≥ dolnej": "The upper limit must be ≥ the lower one",
  "Podaj tempo albo wyłącz ręczną korektę": "Enter a pace or turn off manual override",
  "Tętno maks. nie może być niższe niż średnie": "Max heart rate can’t be lower than average",
  "Koniec nie może być przed początkiem": "The end can’t be before the start",
  // executions
  "Trening zapisany jako wykonany. Trener zobaczy wyniki.": "Session logged as completed. Your coach will see the results.",
  "Zapisano trening jako wykonany częściowo.": "Session logged as partly completed.",
  "Oznaczono trening jako pominięty.": "Session marked as skipped.",
  "Zapisano postęp. Możesz wrócić i dokończyć później.": "Progress saved. You can come back and finish later.",
  "Usunięto zapis wykonania. Plan treningu pozostał.": "Result deleted. The session plan remains.",
  // feedback, records, goals
  "Napisz komentarz": "Write a comment",
  "Notatka jest pusta": "The note is empty",
  "Notatka zapisana.": "Note saved.",
  "Podaj nazwę rekordu": "Enter a record name",
  "Podaj wynik": "Enter a result",
  "Nieprawidłowy wynik": "Invalid result",
  "Nieprawidłowy dystans": "Invalid distance",
  "Zapisano rekord.": "Record saved.",
  "Usunięto rekord.": "Record deleted.",
  "Podaj nazwę celu": "Enter a goal name",
  "Wartości celu wpisz jako liczby albo czas mm:ss.": "Enter goal values as numbers or a time in mm:ss.",
  "Zapisano cel.": "Goal saved.",
  "Usunięto cel.": "Goal deleted.",
  // profiles and team
  "Zapisano profil.": "Profile saved.",
  "Zapisano dane zawodnika.": "Athlete details saved.",
  "Zawodnik zarchiwizowany. Historia pozostaje dostępna.": "Athlete archived. Their history remains available.",
  "Zawodnik przywrócony.": "Athlete restored.",
  "Podaj rolę": "Enter a role",
  "Wybierz rolę": "Choose a role",
  "Ta osoba nie należy do zespołu.": "This person isn’t on the team.",
  "Tę operację może wykonać tylko założyciel.": "Only a founder can do this.",
  "VYRA musi mieć co najmniej jednego założyciela.": "VYRA must have at least one founder.",
  "Założyciele widzą wszystkich zawodników automatycznie.": "Founders see all athletes automatically.",
  // camps, site and offer
  "Obozami zarządzają założyciele.": "Camps are managed by founders.",
  "Stroną zarządzają założyciele.": "The website is managed by founders.",
  "Ofertą zarządzają założyciele.": "The offer is managed by founders.",
  "Finanse obozu widzą tylko założyciele.": "Only founders can see camp finances.",
  "Informacje dla uczestników edytują założyciele.": "Participant information is edited by founders.",
  "Podaj nazwę obozu": "Enter a camp name",
  "Obóz o takim adresie już istnieje. Zmień adres (slug).": "A camp with this address already exists. Change the address (slug).",
  "Zapisano obóz.": "Camp saved.",
  "Ta osoba jest już na liście tego obozu.": "This person is already on this camp’s list.",
  "Zapisano test startowy.": "Baseline test saved.",
  "Zapisano test końcowy.": "Final test saved.",
  "Zapisano. Uczestnicy z kontem dostali powiadomienie.": "Saved. Participants with an account have been notified.",
  "Zapisano budżet obozu.": "Camp budget saved.",
  "Podaj nazwę kosztu": "Enter a cost name",
  "Cena w zł, bez groszy": "Price in PLN, without grosze",
  "Liczba miejsc 1–500": "Places 1–500",
  "Podaj tytuł": "Enter a title",
  "Artykuł o takim adresie już istnieje. Zmień adres.": "An article with this address already exists. Change the address.",
  "Artykuł opublikowany.": "Article published.",
  "Zapisano szkic.": "Draft saved.",
  "Zapisano kartę zespołu.": "Team card saved.",
  "Podaj nazwę pakietu": "Enter a package name",
  "Podaj cenę w zł": "Enter a price in PLN",
  "Podaj cenę w zł albo zostaw puste": "Enter a price in PLN or leave it empty",
  "Zapisano pakiet.": "Package saved.",
  "Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.": "We couldn’t send your request. Please try again in a moment.",
};

/** Messages with numbers or names in them. */
const PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^Maksymalnie (\d+) znaków$/, (n) => `At most ${n} characters`],
  [/^Podaj liczbę całkowitą (.+)–(.+)$/, (a, b) => `Enter a whole number ${a}–${b}`],
  [/^Podaj wartość (.+)–(.+)$/, (a, b) => `Enter a value ${a}–${b}`],
  [/^Dodano trening dla (\d+) zawodników\.$/, (n) => `Session added for ${n} athletes.`],
  [/^Skopiowano (\d+) trening(?:i|ów)?\. Zawodnik dostał jedno powiadomienie\.$/, (n) => `Copied ${n} session${n === "1" ? "" : "s"}. The athlete got one notification.`],
  [/^Ta operacja jest dostępna tylko dla roli: (trener|zawodnik)\.$/, (r) => `This action is only available to: ${r === "trener" ? "coach" : "athlete"}.`],
  [/^Nie udało się zmienić hasła\. ?(.*)$/, (rest) => `Couldn’t change the password. ${rest ? translate(rest, "en") : ""}`.trim()],
  [/^Tętno (?:maks\. |easy |spoczynkowe )?(\d+)–(\d+)$/, (a, b) => `Heart rate ${a}–${b}`],
  [/^RPE 1–10$/, () => "RPE 1–10"],
  [/^Powtórzenia:? (.+)$/, (r) => `Reps ${r}`],
  [/^Obciążenie (.+)$/, (r) => `Load ${r}`],
  [/^Masa (.+)$/, (r) => `Weight ${r}`],
  [/^Wzrost (.+)$/, (r) => `Height ${r}`],
  [/^Kadencja (.+)$/, (r) => `Cadence ${r}`],
  [/^Rok (.+)$/, (r) => `Year ${r}`],
];

export function translate(message: string, lang: Lang): string {
  if (lang !== "en" || !message) return message;
  const exact = EXACT[message];
  if (exact) return exact;
  for (const [re, fn] of PATTERNS) {
    const m = message.match(re);
    if (m) return fn(...m.slice(1));
  }
  return message;
}

export function localizeResult<T>(result: ActionResult<T>, lang: Lang): ActionResult<T> {
  if (lang !== "en" || !result) return result;
  if (result.ok) return result.message ? { ...result, message: translate(result.message, lang) } : result;
  const fieldErrors = result.fieldErrors
    ? Object.fromEntries(Object.entries(result.fieldErrors).map(([k, v]) => [k, v?.map((m) => translate(m, lang))]))
    : undefined;
  return { ...result, error: translate(result.error, lang), ...(fieldErrors ? { fieldErrors } : {}) };
}

/** Notification titles are written by the database in Polish; shown in English for English users. */
const NOTIFICATION_RULES: [RegExp, (...m: string[]) => string][] = [
  [/^Nowy trening: (.*)$/s, (x) => `New session: ${x}`],
  [/^Zmiana terminu: (.*)$/s, (x) => `Date changed: ${x}`],
  [/^Trener zmienił trening: (.*)$/s, (x) => `Your coach updated: ${x}`],
  [/^Komentarz trenera: (.*)$/s, (x) => `Coach comment: ${x}`],
  [/^Nowe informacje: (.*)$/s, (x) => `New information: ${x}`],
  [/^Jutro: (.*)$/s, (x) => `Tomorrow: ${x}`],
  [/^Nowy zawodnik: (.*)$/s, (x) => `New athlete: ${x}`],
  [/^Nowy plan tygodnia$/, () => "New weekly plan"],
  [/^(\d+) × trening · (.*)$/s, (n, x) => `${n} × session · ${x}`],
  [/^(.*) dołączył\(a\) do zespołu(.*)$/s, (who, x) => `${who} joined the team${x}`],
  [/^(.*) skomentował\(a\): (.*)$/s, (who, x) => `${who} commented: ${x}`],
  [/^(.*) wykonał\(a\) częściowo: (.*)$/s, (who, x) => `${who} partly completed: ${x}`],
  [/^(.*) wykonał\(a\): (.*)$/s, (who, x) => `${who} completed: ${x}`],
  [/^(.*) pominął\(a\): (.*)$/s, (who, x) => `${who} skipped: ${x}`],
];

export function translateNotification(text: string | null | undefined, lang: Lang): string {
  if (!text || lang !== "en") return text ?? "";
  for (const [re, fn] of NOTIFICATION_RULES) {
    const m = text.match(re);
    if (m) return fn(...m.slice(1));
  }
  return text;
}
