"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Download, Share, SquarePlus } from "lucide-react";
import { Sheet } from "@/components/app/sheet";

/** "Add to home screen" help, shown only when VYRA is opened in the browser, not as the installed app. */
export function InstallRow() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(true);
  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setShow(!standalone);
    setIos(!/android/i.test(navigator.userAgent));
  }, []);
  if (!show) return null;
  const steps = ios
    ? [
        [Share, "Trzy kropki ⋯, potem Udostępnij", "Trzy kropki są obok paska adresu w Safari."],
        [SquarePlus, "Pokaż więcej → Dodaj do ekranu głównego", "„Pokaż więcej” jest na dole listy udostępniania."],
        [Download, "Dodaj", "VYRA pojawi się na ekranie jak zwykła aplikacja."],
      ]
    : [
        [Share, "Menu przeglądarki", "Trzy kropki w prawym górnym rogu Chrome."],
        [SquarePlus, "Zainstaluj aplikację", "Albo „Dodaj do ekranu głównego”."],
        [Download, "Zainstaluj", "VYRA pojawi się wśród Twoich aplikacji."],
      ];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full min-w-0 items-center gap-3.5 px-4 py-3.5 text-left transition active:bg-white/[0.04]">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/80">
          <Download className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{ios ? "Dodaj VYRA do ekranu głównego" : "Pobierz aplikację VYRA"}</span>
        <ChevronRight className="size-4 shrink-0 text-white/25" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Zainstaluj VYRA" sub="Działa jak aplikacja: pełny ekran, bez paska przeglądarki.">
        {ios ? null : (
          <div className="mb-3 grid gap-2">
            <a href="/download/vyra.apk" download="VYRA.apk" className="flex h-13 items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98]">
              <Download className="size-4" /> Pobierz VYRA na Androida
            </a>
            <p className="px-1 text-[12.5px] leading-relaxed text-white/50">Otwórz pobrany plik i stuknij „Zainstaluj”. Telefon może zapytać o zgodę na instalowanie z przeglądarki: zezwól raz. Albo zainstaluj bez pliku:</p>
          </div>
        )}
        <ol className="grid gap-2">
          {steps.map(([Icon, title, sub], i) => {
            const I = Icon as typeof Share;
            return (
              <li key={i} className="flex items-center gap-3 rounded-[16px] bg-white/[0.04] p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black">
                  <I className="size-5" />
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{title as string}</span>
                  <span className="block text-[12.5px] text-white/50">{sub as string}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Sheet>
    </>
  );
}
