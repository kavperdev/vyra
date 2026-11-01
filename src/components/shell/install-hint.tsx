"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "vyra.installHint.dismissed";

/**
 * A small card on phones suggesting "add VYRA to the home screen".
 * Android/Chrome gets a real install button; iPhone gets the Share → "Do ekranu początkowego" steps.
 * Hidden when already installed or once dismissed (remembered on this device).
 */
export function InstallHint() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      // storage unavailable: show the hint
    }
    const standalone =
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
      localStorage.setItem(KEY, "1");
    } catch {
      // storage unavailable: hide for this visit only
    }
    setMode(null);
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-surface p-4 lg:hidden">
      <div className="grid flex-1 gap-1.5">
        <p className="text-sm font-semibold">Dodaj VYRA do ekranu głównego</p>
        {mode === "ios" ? (
          <p className="text-[13px] text-muted">
            Kliknij <Share className="inline size-3.5 align-[-2px]" /> <b>Udostępnij</b> na dole Safari, a potem{" "}
            <b>Do ekranu początkowego</b>. VYRA otworzy się jak aplikacja.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-muted">Otwieraj VYRA jednym kliknięciem, na pełnym ekranie, jak aplikację.</p>
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
              <Download className="size-4" /> Zainstaluj
            </Button>
          </>
        )}
      </div>
      <button type="button" aria-label="Zamknij" className="rounded-md p-1 text-muted hover:text-foreground" onClick={close}>
        <X className="size-4" />
      </button>
    </div>
  );
}
