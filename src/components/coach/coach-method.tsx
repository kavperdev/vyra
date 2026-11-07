"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-controls";
import { saveCoachMethod } from "@/lib/actions/assistant";
import { tl } from "@/lib/i18n/runtime";

/** Starting point to edit: a threshold-based week for amateurs. The coach rewrites it into their own method. */
const TEMPLATE = `STRUKTURA TYGODNIA
- 2 akcenty w tygodniu (np. wtorek i czwartek) + długie wybieganie w weekend. Reszta naprawdę spokojnie.
- Co najmniej 80% objętości w strefie spokojnej (Z1–Z2, swobodna rozmowa). Spokojne dni mają być spokojne.
- Po akcencie zawsze dzień spokojny albo wolny.

AKCENTY: PRÓG W KONTROLOWANEJ INTENSYWNOŚCI
- Podstawą są odcinki progowe: 5–8 × 1 km, 4–5 × 2 km, 3 × 3 km albo 6–10 × 6 min, przerwy krótkie 60–90 s truchtem.
- Tempo progowe: ok. tempo, które zawodnik utrzyma przez godzinę biegu, RPE 7 („komfortowo ciężko”). Lepiej zostawić zapas niż przekroczyć próg.
- Łączna praca progowa w jednym akcencie: 20–40 min (początkujący 15–20 min).
- Szybkie interwały (VO2max) oszczędnie: głównie w fazie szczytu, najwyżej raz w tygodniu.
- Przebieżki 4–6 × 80–100 m na luzie 1–2 razy w tygodniu po spokojnym biegu.

DŁUGIE WYBIEGANIE
- Do 25–30% tygodniowego kilometrażu, najwyżej ok. 2:30 h.
- W budowaniu i szczycie: ostatnie 15–30 min w tempie startowym.

PROGRESJA I REGENERACJA
- Kilometraż rośnie o 5–10% tygodniowo, co 3–4 tydzień tydzień lżejszy (o 20–30% mniej).
- Gdy samopoczucie jest słabe 2 dni z rzędu albo coś boli: akcent zamieniamy na spokojny bieg albo wolne.

SIŁA
- 2 razy w tygodniu po ok. 30 min, w dniu akcentu po bieganiu albo w dzień spokojny. Nie dzień przed akcentem.

PRZED STARTEM
- 10–14 dni przed startem docelowym objętość niżej o 30–50%, zostają krótkie akcenty w tempie startowym.`;

/** "Moja metoda": the principles the coach assistant follows when it analyses athletes and suggests sessions. */
export function CoachMethodCard({ initial, inherited }: { initial: string; inherited: boolean }) {
  const [body, setBody] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{tl("Moja metoda", "My method")}</CardTitle>
          <CardDescription className="max-w-2xl">
            {tl(
              "Zasady, według których trenujesz. Asystent trenera trzyma się ich przy każdej analizie i propozycji treningów. Pisz zwyczajnie, jak zawodnikowi albo drugiemu trenerowi: struktura tygodnia, rodzaje akcentów, tempa, długie wybieganie, progresja, siła, taper. Zasady bezpieczeństwa (np. ból, zbyt szybki wzrost kilometrażu) asystent stosuje zawsze.",
              "The principles you train by. The coach assistant follows them in every analysis and session suggestion. Write plainly: week structure, key sessions, paces, long run, progression, strength, taper. Safety rules (pain, too fast a volume increase) always apply.",
            )}
          </CardDescription>
          {inherited ? (
            <p className="text-[12.5px] text-accent">{tl("Nie masz jeszcze własnej metody: asystent używa metody założyciela zespołu.", "You have no method of your own yet: the assistant uses the team founder’s method.")}</p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-80 font-mono text-[13px] leading-relaxed"
          maxLength={6000}
          placeholder={tl("Np. 2 akcenty w tygodniu, głównie progowe odcinki 1–3 km…", "E.g. 2 key sessions a week, mostly threshold reps of 1–3 km…")}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-muted">{body.length} / 6000</span>
          <div className="flex flex-wrap gap-2">
            {!body.trim() ? (
              <Button type="button" variant="outline" onClick={() => setBody(TEMPLATE)}>
                {tl("Wstaw wzór do edycji", "Insert a template to edit")}
              </Button>
            ) : null}
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveCoachMethod(body);
                  if (res.ok) toast.success(res.message);
                  else toast.error(res.error);
                })
              }
            >
              {pending ? tl("Zapisywanie…", "Saving…") : tl("Zapisz metodę", "Save method")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
