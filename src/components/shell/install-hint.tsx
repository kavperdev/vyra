"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "vyra.installHint.dismissed";

/**
 * A small card on phones suggesting "add VYRA to the home screen".
 * Android/Chrome gets a real install button; iPhone gets the Share → "Do ekranu początkowego" steps.
 * Hidden when already installed or once dismissed (remembered on this device).
 */
export function InstallHint() {
  const t = useT();
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      const at = Number(localStorage.getItem(KEY) ?? 0);
      // "1" was the old never-again flag; now a dismissal hides the card for 14 days.
      dismissed = at > 1 && Date.now() - at < 14 * 86400000;
    } catch {
      // storage unavailable: show the hint
    }
    const standalone = /VYRA-App/.test(navigator.userAgent) ||
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    if (dismissed || standalone || !mobile) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) setMode("ios");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!mode) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // storage unavailable: hide for this visit only
    }
    setMode(null);
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-surface p-4 lg:hidden">
      <div className="grid flex-1 gap-1.5">
        <p className="text-sm font-semibold">{t("Dodaj VYRA do ekranu głównego", "Add VYRA to your home screen")}</p>
        {mode === "ios" ? (
          <p className="text-[13px] text-muted">
            {t("Kliknij", "Tap")} <Share className="inline size-3.5 align-[-2px]" /> <b>{t("Udostępnij", "Share")}</b>{" "}
            {t("na dole Safari, a potem", "at the bottom of Safari, then")} <b>{t("Do ekranu początkowego", "Add to Home Screen")}</b>.{" "}
            {t("VYRA otworzy się jak aplikacja i będzie wysyłać powiadomienia.", "VYRA will open like an app and send notifications.")}{" "}
            <a href="/pobierz" className="font-medium text-foreground underline underline-offset-2">
              {t("Pokaż krok po kroku", "Show me how")}
            </a>
          </p>
        ) : (
          <>
            <p className="text-[13px] text-muted">{t("Otwieraj VYRA jednym kliknięciem, na pełnym ekranie, jak aplikację.", "Open VYRA with one tap, full screen, like an app.")}</p>
            <Button
              size="sm"
              className="w-fit"
              onClick={async () => {
                if (!prompt) return;
                await prompt.prompt();
                await prompt.userChoice.catch(() => null);
                close();
              }}
            >
              <Download className="size-4" /> {t("Zainstaluj", "Install")}
            </Button>
          </>
        )}
      </div>
      <button type="button" aria-label={t("Zamknij", "Close")} className="rounded-md p-1 text-muted hover:text-foreground" onClick={close}>
        <X className="size-4" />
      </button>
    </div>
  );
}
