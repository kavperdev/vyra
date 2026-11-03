"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { submitFeedback } from "@/lib/actions/growth";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

export function FeedbackForm({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [v, setV] = useState({ changed: "", quote: "", result: "", display_name: firstName });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await submitFeedback({ rating: rating ?? 0, ...v, consent_publish: consent });
          if (res.ok) {
            toast.success(res.message ?? tl("Dziękujemy!", "Thank you!"));
            router.push("/athlete");
            router.refresh();
          } else {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
          }
        });
      }}
    >
      <Card>
        <CardContent className="grid gap-6 pt-5">
          <fieldset className="grid gap-3">
            <legend className="mb-3 font-semibold">{tl("Jak bardzo poleciłbyś VYRA znajomemu?", "How likely are you to recommend VYRA to a friend?")}</legend>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={rating === n}
                  onClick={() => setRating(n)}
                  className={cn(
                    "num h-11 rounded-lg border text-[15px] font-semibold transition-colors",
                    rating === n ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-border-strong",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[12px] text-subtle">
              <span>{tl("wcale", "not at all")}</span>
              <span>{tl("na pewno", "definitely")}</span>
            </div>
            {errors.rating ? <p className="text-[13px] text-problem">{errors.rating[0]}</p> : null}
          </fieldset>

          <Field label={tl("Co się zmieniło od początku współpracy?", "What has changed since we started?")} htmlFor="fb-changed" hint={tl("Forma, samopoczucie, regularność, wynik. Tylko dla trenera.", "Fitness, how you feel, consistency, a result. For your coach only.")}>
            <Textarea id="fb-changed" rows={3} value={v.changed} onChange={(e) => setV({ ...v, changed: e.target.value })} />
          </Field>

          <Field label={tl("Twoja opinia o VYRA w kilku zdaniach", "Your opinion of VYRA in a few sentences")} htmlFor="fb-quote" error={errors.quote?.[0]}>
            <Textarea id="fb-quote" rows={4} maxLength={600} value={v.quote} onChange={(e) => setV({ ...v, quote: e.target.value })} placeholder={tl("Np. co Ci daje plan, jak wygląda współpraca z trenerem…", "E.g. what the plan gives you, what working with the coach is like…")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tl("Twój wynik lub efekt (opcjonalnie)", "Your result (optional)")} htmlFor="fb-result" hint={tl("Np. 10 km: 52:10 → 47:30", "E.g. 10K: 52:10 → 47:30")}>
              <Input id="fb-result" maxLength={120} value={v.result} onChange={(e) => setV({ ...v, result: e.target.value })} />
            </Field>
            <Field label={tl("Podpis pod opinią", "Name under the opinion")} htmlFor="fb-name" hint={tl("Np. imię albo imię i pierwsza litera nazwiska", "E.g. first name or first name and initial")}>
              <Input id="fb-name" maxLength={80} value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} />
            </Field>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>
              {tl(
                "Zgadzam się na publikację mojej opinii, wyniku i podpisu na stronie VYRA i w mediach społecznościowych VYRA. Zgodę mogę wycofać w każdej chwili.",
                "I agree to my opinion, result and name being published on the VYRA website and VYRA social media. I can withdraw this at any time.",
              )}
            </span>
          </label>

          <Button type="submit" variant="accent" size="lg" disabled={pending || rating == null} className="w-full sm:w-fit">
            {pending ? tl("Wysyłanie…", "Sending…") : tl("Wyślij opinię", "Send feedback")}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
