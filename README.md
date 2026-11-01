# VYRA — platforma treningowa

Aplikacja dla trenera i jego zawodników: indywidualne plany, kalendarz, kreator treningów biegowych (interwały, fartlek, dowolne odcinki) i siłowych (ćwiczenia z osobnymi seriami), zapis wykonania oddzielony od planu, porównanie plan / wykonanie, komentarze, rekordy, cele, analityka, powiadomienia oraz raporty CSV i PDF.

Robocza nazwa ze specyfikacji to „ATHLETE OS”. Interfejs używa marki **VYRA** z dostarczonych materiałów.

---

## Spis treści

1. [Technologie](#technologie)
2. [Wymagania](#wymagania)
3. [Instalacja i uruchomienie lokalne](#instalacja-i-uruchomienie-lokalne)
4. [Konfiguracja Supabase](#konfiguracja-supabase)
5. [Pierwsze konto trenera](#pierwsze-konto-trenera)
6. [Zapraszanie zawodników](#zapraszanie-zawodników)
7. [Testy](#testy)
8. [Wdrożenie](#wdrożenie)
9. [Architektura](#architektura)
10. [Model danych i bezpieczeństwo](#model-danych-i-bezpieczeństwo)
11. [Branding](#branding)
12. [Co wymaga zewnętrznej konfiguracji](#co-wymaga-zewnętrznej-konfiguracji)
13. [Ograniczenia i dalszy rozwój](#ograniczenia-i-dalszy-rozwój)

---

## Technologie

| Warstwa | Wybór |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript (strict) |
| UI | Tailwind CSS 4, komponenty w stylu shadcn/ui (Radix: Dialog, Dropdown Menu, Slot), Lucide Icons |
| Formularze | React Hook Form + Zod (te same schematy na kliencie i na serwerze) |
| Wykresy | Recharts |
| Daty | date-fns (strefa czasowa użytkownika, domyślnie Europe/Warsaw) |
| Backend | Server Actions i Route Handlers Next.js |
| Baza i auth | Supabase: PostgreSQL, Supabase Auth, Row Level Security |
| Raporty | CSV (Excel, UTF-8 BOM) i PDF (pdf-lib, czcionka DejaVu z polskimi znakami) |
| Testy | Vitest (logika), testy SQL na prawdziwym PostgreSQL (RLS, triggery, funkcje), Playwright (scenariusz E2E) |

## Wymagania

- Node.js 20.9 lub nowszy, npm 10+
- Projekt w [Supabase](https://supabase.com) (darmowy plan wystarczy)
- Opcjonalnie: [Supabase CLI](https://supabase.com/docs/guides/cli) do migracji z terminala
- Opcjonalnie: PostgreSQL 15/16 lokalnie do testów bazy (`npm run test:db`)

## Instalacja i uruchomienie lokalne

```bash
npm install
cp .env.example .env.local      # uzupełnij wartości z Supabase (poniżej)
npm run dev                     # http://localhost:3000
```

Bez uzupełnionego `.env.local` aplikacja pokaże komunikat o brakującej konfiguracji zamiast formularza logowania.

### Zmienne środowiskowe

| Zmienna | Skąd | Opis |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Adres projektu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | jw. (klucz `anon` / `publishable`) | Klucz publiczny. Bezpieczny w przeglądarce, bo każde zapytanie ogranicza RLS |
| `NEXT_PUBLIC_SITE_URL` | Twój adres | Używany w linkach zaproszeń i resetu hasła, np. `https://app.vyra.pl` |

Aplikacja **nie używa** klucza `service_role`. Nie dodawaj go do zmiennych środowiskowych.

## Konfiguracja Supabase

### 1. Migracje bazy

Migracje są w `supabase/migrations` i trzeba je uruchomić **w kolejności nazw plików**:

1. `20261029000100_core_schema.sql` — tabele, typy, indeksy
2. `20261029000200_logic_and_security.sql` — funkcje dostępu, triggery, RLS, uprawnienia kolumn
3. `20261029000300_rpc.sql` — transakcyjne funkcje zapisu (plan, wykonanie, kopiowanie)
4. `20261101000100_applications.sql` — zgłoszenia ze strony głównej (widzi je tylko trener)
5. `20261101000200_applications_kind.sql` — rodzaj zgłoszenia: lista obozów albo prowadzenie
6. `20261101000300_team_roles.sql` — role zespołu: założyciel, trener biegowy, trener siłowy, fizjoterapeuta
7. `20261101000400_camps_and_content.sql` — obozy, uczestnicy, testy, artykuły i zespół na stronie
8. `20261101000500_push_and_camp_app.sql` — powiadomienia push, uczestnicy obozu w aplikacji
9. `20261101000600_camp_budget.sql` — finanse obozu dla założycieli
10. `20261101000700_coaching_plans.sql` — pakiety prowadzenia na stronie (edycja w panelu)
11. `20261101000800_copy_week.sql` — kopiowanie tygodnia treningów z jednym powiadomieniem

**Opcja A, SQL Editor:** Supabase → SQL Editor → wklej kolejno zawartość trzech plików → Run.

**Opcja B, Supabase CLI:**

```bash
supabase login
supabase link --project-ref <ref-projektu>
supabase db push
```

### 2. Ustawienia Auth

Supabase → Authentication → URL Configuration:

- **Site URL:** adres aplikacji (lokalnie `http://localhost:3000`)
- **Redirect URLs:** dodaj `http://localhost:3000/auth/callback` oraz `https://<twoja-domena>/auth/callback`

Authentication → Providers → Email: włączony. Potwierdzanie adresu e-mail („Confirm email”) może zostać włączone: po rejestracji użytkownik dostanie link, który wraca do `/auth/callback`.

Do wysyłki e-maili (potwierdzenie konta, reset hasła) Supabase używa własnej skrzynki z niskim limitem. Do pracy z zespołem ustaw własny SMTP: Authentication → Emails → SMTP Settings.

### 3. (Opcjonalnie) Typy TypeScript z bazy

```bash
npm run db:types   # wymaga supabase link
```

## Pierwsze konto trenera

1. Wejdź na `/signup` i załóż konto. Rejestracja bez zaproszenia zawsze tworzy konto **trenera**.
2. Gdy masz już swoje konto, możesz zablokować zakładanie kolejnych kont trenerów (zawodnicy nadal dołączają z zaproszeń). W SQL Editor:

```sql
update public.app_config set value = 'closed' where key = 'coach_signup';
```

Rola jest ustawiana wyłącznie przez bazę (trigger przy rejestracji). Użytkownik nie może jej zmienić: kolumna `role` nie jest dostępna do edycji z poziomu aplikacji.

## Zapraszanie zawodników

1. Panel trenera → **Zawodnicy** → **Zaproś zawodnika** → e-mail (opcjonalnie imię i wiadomość).
2. Aplikacja tworzy osobisty link `…/invite/<token>`, ważny 14 dni. Skopiuj go albo kliknij „Otwórz w programie pocztowym”.
3. Zawodnik otwiera link, ustawia imię i hasło. Konto powstaje jako **zawodnik** i od razu jest przypisane do trenera.
4. Link działa tylko dla adresu e-mail z zaproszenia i tylko raz. Zawodnik, który ma już konto, loguje się i klika „Dołącz do zespołu”.

Aplikacja **nie wysyła e-maili z zaproszeniem samodzielnie** (nie udaje wysyłki). Link przekazujesz sam, co działa bez konfiguracji SMTP.

## Testy

| Polecenie | Co sprawdza |
|---|---|
| `npm test` | Vitest: obliczenia tempa i czasu, strefy czasowe, statusy, porównanie plan/wykonanie, 1RM, analityka, rekordy, walidacja formularzy, eksport CSV |
| `npm run test:db` | Migracje na tymczasowym PostgreSQL i 68 asercji bezpieczeństwa: role, RLS, izolacja zawodników, zaproszenia, plan vs wykonanie, historia, powiadomienia, funkcje RPC |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint (konfiguracja Next.js) |
| `npm run test:e2e` | Playwright: pełny scenariusz trener → zawodnik → trener |

### Testy bazy (`npm run test:db`)

Skrypt `scripts/test-db.sh` tworzy tymczasowy klaster PostgreSQL, dodaje minimalny zamiennik schematu `auth` z Supabase (`supabase/tests/00_supabase_stub.sql`), uruchamia wszystkie migracje i `supabase/tests/10_security_test.sql`. Każda nieudana asercja przerywa test. Potrzebne są binarki PostgreSQL (`initdb`, `pg_ctl`, `psql`) w PATH albo w `PG_BIN`. Skrypt nie może działać jako root (wymóg PostgreSQL).

### Testy end-to-end

Potrzebują działającej aplikacji połączonej z projektem Supabase oraz dwóch kont: trenera i zawodnika, który przyjął zaproszenie od tego trenera.

```bash
npx playwright install chromium
E2E_COACH_EMAIL=… E2E_COACH_PASSWORD=… E2E_ATHLETE_EMAIL=… E2E_ATHLETE_PASSWORD=… npm run test:e2e
```

Test tworzy treningi na jutro z unikalnym znacznikiem, więc można go uruchamiać wielokrotnie. Używaj osobnego projektu Supabase do testów.

## Wdrożenie

Rekomendowane: **Vercel** + Supabase.

1. Wypchnij repozytorium na GitHub i zaimportuj je w Vercel.
2. Dodaj zmienne `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (adres produkcyjny).
3. W Supabase dodaj `https://<domena>/auth/callback` do Redirect URLs i ustaw Site URL.
4. Deploy. Raport PDF działa w runtime Node.js (czcionki i logo są dołączane przez `outputFileTracingIncludes` w `next.config.ts`).

Inne platformy z Node.js 20+ też zadziałają (`npm run build && npm start`).

### Przypomnienia o treningach (opcjonalnie)

Funkcja `public.create_session_reminders()` tworzy powiadomienia „Jutro: …” dla zawodników. Uruchamiaj ją raz dziennie przez pg_cron (Supabase → Database → Extensions → `pg_cron`):

```sql
select cron.schedule('vyra-reminders', '0 17 * * *', $$select public.create_session_reminders()$$);
```

Bez tego kroku przypomnienia po prostu nie powstają. Pozostałe powiadomienia działają bez konfiguracji.

## Architektura

```
src/
  app/
    (auth)/           logowanie, rejestracja trenera, reset hasła, zaproszenie
    auth/             callback (PKCE) i wylogowanie
    coach/            pulpit, zawodnicy, profil zawodnika (10 sekcji), kalendarz,
                      kreator i szczegóły treningu, szablony, analityka, powiadomienia, ustawienia
    athlete/          dziś, kalendarz, trening + zapis wykonania, historia, postępy, rekordy i cele
    api/reports/      eksport CSV i PDF
  components/
    ui/               przyciski, pola, karty, dialogi, odznaki (styl shadcn/ui)
    shell/            nawigacja: sidebar na desktopie, dolny pasek na telefonie
    training/         kreator, formularz wykonania, widoki planu i porównania, komentarze
    calendar/         kalendarz miesiąc / tydzień / dzień / lista
    charts/           wykresy i panel analityki
    coach/, athlete/  komponenty sekcji
  lib/
    supabase/         klienci (serwer, przeglądarka, middleware)
    actions/          Server Actions (walidacja Zod → zapis przez RLS)
    data/             zapytania do bazy
    validation/       schematy Zod i konwersja formularz ⇄ dane
    training/         logika domenowa: statusy, porównanie, siła, analityka, rekordy
    reports/          CSV i PDF
supabase/
  migrations/         schemat, RLS, triggery, funkcje
  tests/              testy bezpieczeństwa SQL
tests/
  unit/               Vitest
  e2e/                Playwright
```

**Przepływ zapisu:** formularz (React Hook Form + Zod) → Server Action (ponowna walidacja tym samym schematem, sprawdzenie roli) → funkcja PostgreSQL `save_session` / `save_execution` uruchamiana z uprawnieniami użytkownika (SECURITY INVOKER, więc obowiązuje RLS). Zapis planu z odcinkami lub ćwiczeniami i seriami jest atomowy.

## Model danych i bezpieczeństwo

### Plan i wykonanie są rozdzielone

| Plan (trener) | Wykonanie (zawodnik) |
|---|---|
| `training_sessions` — data, typ, cel, instrukcje, wersja | `workout_executions` — status, data wykonania, RPE, samopoczucie, komentarz, **zamrożona kopia planu** (`plan_snapshot`, `plan_version`) |
| `running_workouts` — dystans, czas, zakres tempa i tętna, strefa | `running_execution_results` — dystans, czas, tempo (liczone automatycznie lub ręcznie z flagą), tętno śr./maks., przewyższenie, kadencja, warunki |
| `running_segments` — dowolna liczba odcinków o różnych dystansach, czasach, tempach i przerwach | `running_lap_results` — wyniki pojedynczych powtórzeń |
| `strength_exercises` + `strength_sets` — każda seria osobno | `exercise_execution_results` + `set_execution_results` — każda seria osobno |

- Status treningu (`zaplanowany`, `rozpoczęty`, `wykonany`, `częściowo`, `pominięty`) ustawia **tylko** trigger po zapisie wykonania przez zawodnika. „Do uzupełnienia” to stan wyliczany (termin minął, brak wpisu), nigdy nie jest zapisywany i nigdy nie zamienia się w „wykonany”.
- Edycja planu podnosi jego wersję. Wykonanie zachowuje kopię planu z dnia zapisu, więc porównanie pokazuje to, co zawodnik naprawdę miał zrobić.
- Treningu z zapisanym wykonaniem nie da się usunąć (klucz obcy `on delete restrict`), więc historia nie znika.
- Szablony (`training_templates`) są osobnymi rekordami. Trening utworzony z szablonu to niezależna kopia.

### Uprawnienia

- **RLS na każdej tabeli.** Zawodnik widzi tylko swoje dane. Trener widzi tylko zawodników połączonych z nim w `coach_athletes`.
- **Uprawnienia kolumn:** zawodnik nie zmieni roli ani planu, trener nie zmieni wyników zawodnika ani statusu treningu, nikt z aplikacji nie utworzy powiadomienia ani połączenia trener–zawodnik.
- Zarchiwizowany zawodnik: trener dalej czyta historię, ale nie może planować nowych treningów.
- Notatki trenera (`coach_notes`) są niewidoczne dla zawodnika.
- Zmiana identyfikatora w adresie URL nic nie daje: dane są filtrowane w bazie, a strona zwraca 404.
- Testy w `supabase/tests/10_security_test.sql` sprawdzają te reguły na prawdziwym PostgreSQL.

## Branding

Źródło: materiały w `public/branding/source/` (logo w kole, plakat neonowy, plansza z hasłem, dwa zdjęcia nastrojowe).

| Element | Z materiałów | W aplikacji |
|---|---|---|
| Logo | Biały znak VYRA na czarnym tle, geometryczny, R z otwartym brzuścem, A bez poprzeczki | Ścieżki wektorowe odrysowane 1:1 z oryginału: `vyra-logo.svg` (kolor dziedziczony z motywu), wersje białe/czarne SVG i PNG |
| Ikona | — (brak osobnego znaku) | Litera V z oryginalnego logo w czarnym kole, jak na okrągłym logo: `vyra-icon*.png`, `vyra-icon.svg`, favicon |
| Kolory | Czerń, biel, neonowa czerwień z plakatu (#F03339, próbkowana z obrazu) | Motyw ciemny jako domyślny, czerwień jako jedyny akcent; jasny motyw jako opcja |
| Typografia | Hasło „ELITE IS STANDARD” szeroko rozstrzelonymi wersalikami, podpisy monospace na plakacie | Archivo (szeroki krój nagłówków), JetBrains Mono dla etykiet i liczb, rozstrzelone wersaliki w nagłówkach sekcji |
| Charakter | Minimalizm, wysoki kontrast, sport wyczynowy | Mało koloru, cienkie linie, dane w monospace |

Tokeny są w `src/app/globals.css`. Logo w kodzie: `src/components/brand/logo.tsx`.

Zdjęcia biegaczy z materiałów **nie są używane w interfejsie**, zgodnie ze specyfikacją (bez zdjęć zawodników jako dekoracji). Są zachowane w `public/branding/source/` do użycia np. na stronie marketingowej. Logo zostało odrysowane z pliku PNG. Jeśli masz plik wektorowy od projektanta, podmień `public/branding/vyra-logo.svg` i ścieżkę w `logo.tsx`.

Kolory statusów są semantyczne i używane tylko dla statusu treningu: zielony — wykonany, niebieski — zaplanowany, pomarańczowy — do uzupełnienia lub częściowo, czerwony — pominięty, szary — neutralny.

## Co wymaga zewnętrznej konfiguracji

| Funkcja | Co zrobić |
|---|---|
| Logowanie, dane, wszystko | Projekt Supabase, migracje, zmienne środowiskowe |
| E-maile Supabase (potwierdzenie konta, reset hasła) | Działają od razu z limitem Supabase. Do produkcji: własny SMTP |
| Przypomnienia „jutro trening” | pg_cron (instrukcja wyżej) |
| Wysyłka zaproszeń e-mailem z aplikacji | Niezaimplementowana celowo. Link kopiujesz lub otwierasz w programie pocztowym |
| Integracja z zegarkami (Garmin, Strava) | Brak. Zawodnik wpisuje wyniki ręcznie |

## Ograniczenia i dalszy rozwój

- **Aplikacja nie była uruchomiona w środowisku, w którym powstała** (brak dostępu do rejestru npm). Logika domenowa i baza danych są przetestowane (sekcja „Testy”), ale build Next.js, lint i E2E trzeba uruchomić po `npm install`. Jeśli coś się nie skompiluje, najpewniej chodzi o drobne różnice wersji bibliotek.
- Kalendarz nie ma przeciągania treningów myszą. Termin zmienia się z poziomu treningu („Zmień datę”), kopiowanie działa przez „Kopiuj trening”.
- Wersje planu: zapisywana jest kopia planu przy wykonaniu i numer wersji. Pełna historia każdej edycji (`training_session_versions`) nie jest prowadzona.
- Aplikacja obsługuje wielu trenerów, ale zawodnik jest zwykle połączony z jednym. Kilku trenerów jednego zawodnika działa na poziomie danych, a interfejs pokazuje pierwszego.
- Brak importu plików FIT/GPX i integracji z Garmin/Strava.
- Raport PDF zawiera statystyki, wykres objętości i tabelę treningów. Wykresów siłowych w PDF nie ma.

## Zespół VYRA (role)

Konta zespołu mają rolę `coach` i dodatkowo `staff_role`:

| Rola | Co może |
|---|---|
| Założyciel (`founder`) | Widzi wszystkich zawodników, zaprasza zespół, nadaje role, przypisuje zawodników, obsługuje zgłoszenia ze strony |
| Trener biegowy / siłowy | Planuje i analizuje treningi przypisanych zawodników |
| Fizjoterapeuta (`physio`) | Widzi przypisanych zawodników i ich treningi, pisze notatki zespołu, nie planuje treningów |

- Pierwsze konto w systemie zostaje założycielem. Założyciele są automatycznie połączeni z każdym zawodnikiem.
- Zespół zaprasza założyciel w **Panel → Zespół VYRA** (osobisty link, nowe konto).
- Notatki o zawodniku widzi cały zespół, który z nim pracuje; zawodnik ich nie widzi.
- Uprawnienia egzekwuje baza (RLS i funkcje `set_staff_assignment`, `set_staff_role`), testy w `supabase/tests/10_security_test.sql`.

## Obozy i treści strony

- **Panel → Obozy**: obóz zapisany jako szkic nie jest widoczny na stronie; „Zapisz i opublikuj” pokazuje go w `/obozy` i `/obozy/<adres>` z formularzem zapisów. Zapisy ze strony trafiają na listę uczestników obozu (status „Zainteresowany”).
- **Uczestnik obozu**: testy na starcie i na końcu (VO2max, progi, skład ciała, CMJ) i raport „przed i po” z wyznaczonymi strefami; „Drukuj / PDF” zapisuje raport.
- **Panel → Strona VYRA** (założyciele): artykuły do zakładki Wiedza (szkic / opublikowany) i karty zespołu.
- Prosty format tekstu w edytorach: `## nagłówek`, `- lista`, `1. lista`, `**pogrubienie**`, `[tekst](https://link)`.

## Powiadomienia push i aplikacja na telefonie

- Aplikacja ma manifest (ikona, pełny ekran, start w `/panel`) i service worker `public/sw.js`.
- Każde powiadomienie w bazie (nowy lub zmieniony trening, wykonany trening, komentarz, informacje o obozie) wywołuje
  `pg_net` → `POST /api/push` z `{ id }`. Trasa odbiera je raz funkcją `take_push_job` i wysyła Web Push.
- Zmienne w Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (np. `mailto:...`).
  Parę kluczy wygenerujesz `npx web-push generate-vapid-keys`.
- Adres odbiorcy jest w `app_config.push_endpoint`; po zmianie domeny:
  `update public.app_config set value = 'https://twoja-domena.pl/api/push' where key = 'push_endpoint';`
- iPhone: powiadomienia działają po dodaniu VYRA do ekranu początkowego (iOS 16.4+).
