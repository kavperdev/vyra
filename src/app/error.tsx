"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60dvh] place-content-center gap-4 px-6 text-center">
      <p className="eyebrow">Błąd</p>
      <h1 className="display text-2xl">Coś poszło nie tak</h1>
      <p className="max-w-md text-sm text-muted">
        Nie udało się wczytać tej strony. Sprawdź połączenie i spróbuj ponownie. Jeśli problem wraca, skontaktuj się z trenerem lub administratorem.
      </p>
      <Button className="mx-auto w-fit" onClick={reset}>
        Spróbuj ponownie
      </Button>
    </main>
  );
}
