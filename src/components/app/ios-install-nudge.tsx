"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";
import { load, save } from "@/lib/app/store";

const KEY = "vyra-ios-nudge";

/** iPhone in Safari, not installed yet: a small card showing the two taps that make VYRA an app. */
export function IosInstallNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const safari = ios && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Messenger|TikTok/i.test(ua);
    const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
    const last = load<number>(KEY, 0);
    if (safari && !standalone && Date.now() - last > 3 * 86400000) setShow(true);
  }, []);
  if (!show) return null;
  const close = () => {
    save(KEY, Date.now());
    setShow(false);
  };
  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 mx-auto max-w-md rounded-[22px] border border-white/10 bg-[#18181b]/95 p-4 shadow-2xl backdrop-blur">
      <button type="button" aria-label="Zamknij" onClick={close} className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white/10">
        <X className="size-4" />
      </button>
      <p className="pr-8 text-[15px] font-semibold">Zainstaluj VYRA na iPhonie</p>
      <p className="mt-0.5 text-[12.5px] text-white/55">Za darmo, 2 stuknięcia. Pełny ekran, ikona i powiadomienia.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
        <span className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2.5">
          <Share className="size-4 shrink-0 text-[#0a84ff]" /> 1. Udostępnij (lub ⋯)
        </span>
        <span className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2.5">
          <SquarePlus className="size-4 shrink-0" /> 2. Do ekranu początk.
        </span>
      </div>
    </div>
  );
}
