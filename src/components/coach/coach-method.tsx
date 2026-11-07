"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-controls";
import { saveCoachMethod } from "@/lib/actions/assistant";
import { tl } from "@/lib/i18n/runtime";
import { VYRA_METHOD } from "@/lib/training/vyra-method-text";

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
          {!initial.trim() ? (
            <p className="text-[12.5px] text-accent">
              {inherited
                ? tl("Nie masz jeszcze własnej metody: asystent używa metody założyciela zespołu.", "You have no method of your own yet: the assistant uses the team founder’s method.")
                : tl("Pole jest puste: asystent używa wbudowanej Metody treningowej VYRA. Wpisz tu własną, jeśli chcesz ją zastąpić.", "Empty: the assistant uses the built-in VYRA training method. Write your own here to replace it.")}
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-80 font-mono text-[13px] leading-relaxed"
          maxLength={20000}
          placeholder={tl("Np. 2 akcenty w tygodniu, głównie progowe odcinki 1–3 km…", "E.g. 2 key sessions a week, mostly threshold reps of 1–3 km…")}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-muted">{body.length} / 20 000</span>
          <div className="flex flex-wrap gap-2">
            {!body.trim() ? (
              <Button type="button" variant="outline" onClick={() => setBody(VYRA_METHOD)}>
                {tl("Wstaw metodę VYRA do edycji", "Insert the VYRA method to edit")}
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
