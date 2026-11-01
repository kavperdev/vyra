"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/** Error inside the panel: navigation stays visible and the screen can be retried in place. */
export function PanelError({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <div className="grid justify-items-start gap-4 rounded-lg border border-border bg-surface p-6 sm:p-8">
      <p className="eyebrow">{offline ? t("Brak połączenia", "No connection") : t("Błąd", "Error")}</p>
      <h1 className="display text-xl">{offline ? t("Jesteś offline", "You’re offline") : t("Nie udało się wczytać tego ekranu", "This screen couldn’t be loaded")}</h1>
      <p className="max-w-md text-sm text-muted">
        {offline
          ? t("Połącz się z internetem i spróbuj ponownie. Dane, które już zapisałeś, są bezpieczne.", "Connect to the internet and try again. Anything you’ve saved is safe.")
          : t("Spróbuj ponownie za chwilę. Jeśli problem wraca, daj znać trenerowi lub administratorowi.", "Try again in a moment. If it keeps happening, let your coach or administrator know.")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" /> {t("Spróbuj ponownie", "Try again")}
        </Button>
        <Button asChild variant="outline">
          <Link href={home}>{t("Wróć na start", "Back to start")}</Link>
        </Button>
      </div>
      {error.digest ? <p className="num text-[11px] text-subtle">{t("Kod błędu", "Error code")}: {error.digest}</p> : null}
    </div>
  );
}
