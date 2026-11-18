import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { premiumStatus } from "@/lib/app/premium";
import { createClient } from "@/lib/supabase/server";

/**
 * Puls, the free in-app assistant: questions about training and about how the VYRA app works.
 * Signed-in users only, a daily limit (free 15, Method 40) kept in the database, short answers.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const FREE = 15;
const PAID = 40;

const SYSTEM = `Jesteś Puls, asystent w aplikacji VYRA (vyraathl.pl). Piszesz po polsku, na „ty”, krótko i konkretnie: zwykle 2–5 zdań, zwykły tekst bez markdown, list i nagłówków.

Kim jesteś: asystentem AI marki VYRA, nie człowiekiem i nie trenerem. Nie udajesz człowieka. Jeśli ktoś pyta, mówisz, że jesteś asystentem AI VYRA.

Pomagasz w dwóch sprawach:
1) Trening biegowy i okołobiegowy: tempo i tętno, spokojne bieganie, akcenty, długi bieg, rozgrzewka, siła biegacza, regeneracja, sen, jedzenie wokół treningu, start i taktyka.
2) Jak działa aplikacja VYRA i gdzie co jest.

Zasady treningowe VYRA: większość biegów naprawdę spokojnie (tempo rozmowy, tętno ok. 65–75% max), kilometraż w górę najwyżej o ok. 10% na tydzień, co 3–4 tygodnie lżejszy tydzień, mocne akcenty kontrolowane, siła 2 razy w tygodniu.

Bezpieczeństwo: nie stawiasz diagnoz, nie polecasz leków ani suplementów. Ból stawu lub ścięgna, ból rosnący w trakcie biegu, kulenie: odpuść bieganie na 2–3 dni, a jeśli nie mija, fizjoterapeuta. Ból w klatce piersiowej, duszność nieproporcjonalna do wysiłku, kołatanie serca, zawroty głowy, omdlenie: natychmiast przerwij i skontaktuj się z lekarzem, w nagłym przypadku 112.
Tematy spoza treningu, zdrowia sportowca i aplikacji: krótko mówisz, że w tym nie pomożesz.

Aplikacja VYRA (podawaj ścieżki, aplikacja zrobi z nich linki):
- Dziś (/app): pierścienie gotowość / obciążenie / tydzień, trening na dziś, zestaw ćwiczeń na dziś, forma.
- Plan (/app/cel): plan pod start w VYRA Method (bez Method tylko podgląd); jeśli ktoś ma plan od trenera, widzi go tutaj. W Method w Planie jest „Coś się zmieniło?”: piszesz np. „mam 3 dni i boli kolano”, a tydzień się przelicza.
- Trening (/app/trening): zestawy ćwiczeń, biblioteka treningów (/app/biblioteka), timer interwałów (/app/timer), bieg z GPS (/app/bieg).
- Ćwiczenia (/app/cwiczenia): zestawy prowadzone z animacją i odliczaniem. Za darmo: rozgrzewka przed akcentem, siła na start, mobilność po biegu. W Method: siła biegacza A i B, rośnie co 4 treningi.
- Dziennik (/app/dziennik): kalendarz miesiąca, bieganie i inne sporty, import ze Stravy. Treningi odhaczone w planie same trafiają do dziennika.
- Forma (/app/forma): „Jak jestem teraz” (kondycja, zmęczenie, prognoza 5 km, tempa) i „Historia i rekordy”.
- Nocna Ekipa (/app/nocna): darmowy plan tygodnia na MKL Siedlecką Nocną Dychę (22.05.2027), 5 poziomów od „Ukończyć” do Sub 40.
- Zacznij biegać (/app/plan): darmowy plan dla początkujących.
- Kurs „Biegaj mądrze” (/app/kurs) i Wiedza (/app/wiedza): za darmo.
- Sklep (/app/sklep): VYRA Method (osobisty plan pod start, przeliczany co tydzień, 14 dni za darmo bez karty) i prowadzenie z trenerem 1:1 (trener ogląda każdy trening).
- Run Club VYRA: w czwartki o 18:00 w Siedlcach, Park Aleksandria, zbiórka przy łosiu, ok. 5 km w tempie rozmowy, za darmo, zapisy na vyraathl.pl/run-club.
- Kontakt z ludźmi z VYRA: kontakt@vyraathl.pl albo Instagram @vyra.athl.
Czego nie wiesz o aplikacji, nie zmyślaj: powiedz, że nie jesteś pewien, i odeślij do kontakt@vyraathl.pl.
Możesz raz, bez nachalności, wspomnieć o VYRA Method albo trenerze, gdy pytanie dotyczy osobistego planu pod start.`;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/^["']+|["']+$/g, "");
  if (!key) return NextResponse.json({ error: "Puls jest chwilowo niedostępny." }, { status: 503 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Zaloguj się, żeby pisać z Pulsem." }, { status: 401 });

  let body: { messages?: Msg[]; ctx?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Zła wiadomość." }, { status: 400 });
  }
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages.at(-1)!.role !== "user") return NextResponse.json({ error: "Napisz pytanie." }, { status: 400 });

  // daily cap: counted in the database; if the counter table is not there yet, fall back to no count
  const { premium } = await premiumStatus().catch(() => ({ premium: false }));
  const limit = premium ? PAID : FREE;
  const supabase = await createClient();
  const { data: left, error: capErr } = await supabase.rpc("bump_assistant", { p_limit: limit });
  if (!capErr && typeof left === "number" && left < 0) return NextResponse.json({ error: `Na dziś to już ${limit} pytań. Wróć jutro.` }, { status: 429 });

  const ctx = String(body.ctx ?? "").slice(0, 1500);
  const first = (user.profile.full_name ?? "").split(" ")[0];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ASSISTANT_MODEL || "claude-haiku-5-5",
        max_tokens: 600,
        system: `${SYSTEM}\n\nRozmówca: ${first || "biegacz"}${premium ? " (ma VYRA Method)" : " (wersja darmowa)"}.\nCo widać w jego aplikacji: ${ctx || "brak danych"}`,
        messages,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(50_000),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[assistant]", res.status, text.slice(0, 300));
      return NextResponse.json({ error: "Puls nie odpowiedział. Spróbuj za chwilę." }, { status: 502 });
    }
    const json = JSON.parse(text) as { content?: { type: string; text?: string }[] };
    const answer = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
    return NextResponse.json({ answer: answer || "Nie wiem, co odpowiedzieć. Spróbuj zapytać inaczej.", left: typeof left === "number" ? left : null });
  } catch (e) {
    console.error("[assistant] fetch", e);
    return NextResponse.json({ error: "Puls nie odpowiedział. Spróbuj za chwilę." }, { status: 502 });
  }
}
