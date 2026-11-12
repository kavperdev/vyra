"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Ellipsis, MonitorSmartphone, Plus, Share, Smartphone } from "lucide-react";
import { useT } from "@/lib/i18n/client";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

type Device =
  | { kind: "installed" }
  | { kind: "ios-safari"; modern: boolean }
  | { kind: "ios-other" } // Chrome, Firefox, Edge on iPhone: share button in the address bar
  | { kind: "in-app"; ios: boolean } // Instagram, Facebook, Messenger… browsers that can't install
  | { kind: "android" }
  | { kind: "desktop" };

function detect(): Device {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return { kind: "installed" };
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (/FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|TikTok|Snapchat|LinkedInApp|Twitter/i.test(ua)) return { kind: "in-app", ios };
  if (ios) {
    if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua)) return { kind: "ios-other" };
    const v = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
    return { kind: "ios-safari", modern: v >= 26 };
  }
  if (/android/i.test(ua)) return { kind: "android" };
  return { kind: "desktop" };
}

/** One step: number, words and a small picture of what the screen looks like at that moment. */
function Step({ n, title, children, picture }: { n: number; title: React.ReactNode; children?: React.ReactNode; picture: React.ReactNode }) {
  return (
    <li className="grid items-center gap-4 rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 sm:grid-cols-[1fr_220px]">
      <div className="grid gap-2">
        <span className="font-mono text-sm text-[var(--accent)]">{String(n).padStart(2, "0")}</span>
        <p className="text-lg font-semibold leading-snug text-white">{title}</p>
        {children ? <p className="text-[15px] leading-relaxed text-white/60">{children}</p> : null}
      </div>
      <div className="mx-auto w-full max-w-[220px]">{picture}</div>
    </li>
  );
}

const Ring = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-grid size-10 place-items-center rounded-full bg-white/10 text-white">
    <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/40" />
    <span className="relative">{children}</span>
  </span>
);

/** The bottom of Safari: the address bar with ⋯ (iOS 26) or the toolbar with the Share icon (older iOS). */
function SafariBar({ modern }: { modern: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#1c1c1f]">
      <div className="h-16 bg-gradient-to-b from-white/5 to-transparent" />
      {modern ? (
        <div className="flex items-center gap-2 p-3">
          <span className="grid size-10 place-items-center rounded-full bg-white/10 text-white/70">‹</span>
          <span className="flex h-10 flex-1 items-center justify-center rounded-full bg-white/10 text-[13px] text-white/70">vyraathl.pl</span>
          <Ring>
            <Ellipsis className="size-5" />
          </Ring>
        </div>
      ) : (
        <>
          <div className="mx-3 flex h-9 items-center justify-center rounded-lg bg-white/10 text-[13px] text-white/70">vyraathl.pl</div>
          <div className="flex items-center justify-around p-3 text-white/60">
            <span>‹</span>
            <span>›</span>
            <Ring>
              <Share className="size-5" />
            </Ring>
            <span>▢</span>
            <span>⧉</span>
          </div>
        </>
      )}
    </div>
  );
}

function SheetRow({ icon, label, on }: { icon: React.ReactNode; label: string; on?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] ${on ? "bg-[var(--accent)]/15 text-white ring-1 ring-[var(--accent)]" : "text-white/55"}`}>
      <span>{label}</span>
      <span className={on ? "text-white" : "text-white/40"}>{icon}</span>
    </div>
  );
}

function AddDialog() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#1c1c1f] p-3">
      <div className="mb-3 flex items-center justify-between text-[13px]">
        <span className="text-white/50">Anuluj</span>
        <span className="font-semibold text-white">Do ekranu początk.</span>
        <span className="relative rounded-full bg-[var(--accent)] px-3 py-1 font-semibold text-white">
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/50" />
          <span className="relative">Dodaj</span>
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/vyra-icon-96.png" alt="" className="size-11 rounded-xl" />
        <div className="text-[13px]">
          <p className="font-semibold text-white">VYRA</p>
          <p className="text-white/45">vyraathl.pl</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-[13px] text-white/75">
        Otwórz jako aplikację
        <span className="h-5 w-9 rounded-full bg-[#30d158] p-0.5">
          <span className="block size-4 translate-x-4 rounded-full bg-white" />
        </span>
      </div>
    </div>
  );
}

function HomeScreen() {
  return (
    <div className="grid grid-cols-4 gap-3 rounded-2xl border border-white/15 bg-gradient-to-br from-[#1a1a2e] to-[#0b0b0d] p-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <span key={i} className="aspect-square rounded-xl bg-white/10" />
      ))}
      <span className="relative grid place-items-center">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-[var(--accent)]/40" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/vyra-icon-96.png" alt="" className="relative aspect-square w-full rounded-xl" />
      </span>
    </div>
  );
}

function CopyLink() {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText("https://vyraathl.pl/pobierz");
          setDone(true);
        } catch {
          setDone(false);
        }
      }}
      className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white hover:border-white/60"
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? t("Skopiowano", "Copied") : t("Kopiuj link", "Copy link")}
    </button>
  );
}

/** Works out the phone and browser and shows only the steps for it, with pictures of each screen. */
export function InstallGuide({ qr }: { qr: React.ReactNode }) {
  const t = useT();
  const [device, setDevice] = useState<Device | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setDevice(detect());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  if (!device) return <div className="h-64" />;

  if (installed || device.kind === "installed")
    return (
      <div className="grid gap-3 rounded-2xl border border-[#30d158]/40 bg-[#30d158]/10 p-6">
        <p className="flex items-center gap-2 text-xl font-semibold text-white">
          <Check className="size-6 text-[#30d158]" /> {t("VYRA jest na Twoim telefonie", "VYRA is on your phone")}
        </p>
        <p className="text-white/65">{t("Otwieraj ją ikoną na ekranie głównym. Zaloguj się raz i zostaniesz zalogowany.", "Open it from the home screen icon. Log in once and you stay logged in.")}</p>
        <a href="/panel" className="inline-flex h-12 w-fit items-center rounded-full bg-white px-6 text-sm font-semibold text-black">
          {t("Otwórz VYRA", "Open VYRA")}
        </a>
      </div>
    );

  const iosSafari = (modern: boolean) => (
    <ol className="grid gap-4">
      <Step n={1} title={modern ? t("Stuknij ⋯ obok paska adresu", "Tap ⋯ next to the address bar") : t("Stuknij ikonę Udostępnij na dole ekranu", "Tap the Share icon at the bottom")} picture={<SafariBar modern={modern} />}>
        {modern ? t("Potem w menu wybierz „Udostępnij”.", "Then choose “Share” in the menu.") : t("To kwadrat ze strzałką w górę.", "It’s the square with an arrow pointing up.")}
      </Step>
      <Step
        n={2}
        title={t("Przewiń w dół i wybierz „Do ekranu początkowego”", "Scroll down and choose “Add to Home Screen”")}
        picture={
          <div className="grid gap-1.5 rounded-2xl border border-white/15 bg-[#1c1c1f] p-2.5">
            <SheetRow icon={<Copy className="size-4" />} label="Kopiuj" />
            <SheetRow icon={<span>☆</span>} label="Dodaj do ulubionych" />
            <SheetRow icon={<Plus className="size-4" />} label="Do ekranu początkowego" on />
          </div>
        }
      >
        {t("Jeśli go nie widzisz, stuknij „Więcej” albo „Edytuj czynności” na dole listy.", "If you can’t see it, tap “More” or “Edit Actions” at the bottom of the list.")}
      </Step>
      <Step n={3} title={t("Stuknij „Dodaj” w prawym górnym rogu", "Tap “Add” in the top right")} picture={<AddDialog />}>
        {t("Jeśli jest przełącznik „Otwórz jako aplikację”, zostaw go włączonego.", "If there’s an “Open as Web App” switch, leave it on.")}
      </Step>
      <Step n={4} title={t("Gotowe: otwieraj VYRA ikoną na ekranie głównym", "Done: open VYRA from the home screen")} picture={<HomeScreen />}>
        {t("Po pierwszym otwarciu z ikony włącz powiadomienia. Na iPhonie działają tylko w zainstalowanej aplikacji.", "After opening it from the icon, turn on notifications. On iPhone they only work in the installed app.")}
      </Step>
    </ol>
  );

  const androidSteps = (
    <div className="grid gap-5">
      {prompt ? (
        <button type="button" onClick={install} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-semibold text-black sm:w-fit sm:px-10">
          <Download className="size-5" /> {t("Zainstaluj VYRA", "Install VYRA")}
        </button>
      ) : null}
      <ol className="grid gap-4">
        <Step
          n={1}
          title={prompt ? t("Albo ręcznie: stuknij ⋮ w prawym górnym rogu Chrome", "Or by hand: tap ⋮ at the top right of Chrome") : t("Stuknij ⋮ w prawym górnym rogu przeglądarki", "Tap ⋮ at the top right of the browser")}
          picture={
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-[#1c1c1f] p-3">
              <span className="flex h-10 flex-1 items-center rounded-full bg-white/10 px-4 text-[13px] text-white/70">vyraathl.pl</span>
              <Ring>
                <span className="text-lg leading-none">⋮</span>
              </Ring>
            </div>
          }
        >
          {t("W Samsung Internet to ☰ na dole ekranu.", "In Samsung Internet it’s ☰ at the bottom.")}
        </Step>
        <Step
          n={2}
          title={t("Wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”", "Choose “Install app” or “Add to Home screen”")}
          picture={
            <div className="grid gap-1.5 rounded-2xl border border-white/15 bg-[#1c1c1f] p-2.5">
              <SheetRow icon={<span>↻</span>} label="Nowa karta" />
              <SheetRow icon={<Download className="size-4" />} label="Zainstaluj aplikację" on />
              <SheetRow icon={<span>⚙</span>} label="Ustawienia" />
            </div>
          }
        />
        <Step n={3} title={t("Potwierdź „Zainstaluj” i otwieraj VYRA ikoną", "Confirm “Install” and open VYRA from its icon")} picture={<HomeScreen />} />
      </ol>
    </div>
  );

  let main: React.ReactNode;
  if (device.kind === "ios-safari") main = iosSafari(device.modern);
  else if (device.kind === "ios-other")
    main = (
      <ol className="grid gap-4">
        <Step
          n={1}
          title={t("Stuknij ikonę Udostępnij w pasku adresu", "Tap the Share icon in the address bar")}
          picture={
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-[#1c1c1f] p-3">
              <span className="flex h-10 flex-1 items-center rounded-full bg-white/10 px-4 text-[13px] text-white/70">vyraathl.pl</span>
              <Ring>
                <Share className="size-5" />
              </Ring>
            </div>
          }
        >
          {t("Jeśli jej nie ma, otwórz tę stronę w Safari: tam instalacja działa zawsze.", "If it isn’t there, open this page in Safari, where installing always works.")}
        </Step>
        <Step n={2} title={t("Wybierz „Dodaj do ekranu początkowego” i stuknij „Dodaj”", "Choose “Add to Home Screen” and tap “Add”")} picture={<AddDialog />} />
        <Step n={3} title={t("Gotowe: otwieraj VYRA ikoną", "Done: open VYRA from its icon")} picture={<HomeScreen />} />
      </ol>
    );
  else if (device.kind === "in-app")
    main = (
      <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#0b0b0d] p-6">
        <p className="text-xl font-semibold text-white">
          {device.ios ? t("Otwórz tę stronę w Safari", "Open this page in Safari") : t("Otwórz tę stronę w Chrome", "Open this page in Chrome")}
        </p>
        <p className="text-white/65">
          {t(
            "Jesteś w przeglądarce wbudowanej w Instagram, Facebooka albo Messengera. Z niej nie da się zainstalować aplikacji. Stuknij ⋯ w rogu i wybierz „Otwórz w przeglądarce”, albo skopiuj link i wklej go w przeglądarce.",
            "You’re in the browser built into Instagram, Facebook or Messenger, which can’t install apps. Tap ⋯ in the corner and choose “Open in browser”, or copy the link and paste it into your browser.",
          )}
        </p>
        <CopyLink />
      </div>
    );
  else if (device.kind === "android") main = androidSteps;
  else
    main = (
      <div className="grid gap-6 rounded-2xl border border-white/10 bg-[#0b0b0d] p-6 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="rounded-xl bg-white p-2">{qr}</div>
        <div className="grid gap-3">
          <p className="flex items-center gap-2 text-xl font-semibold text-white">
            <Smartphone className="size-5" /> {t("Zeskanuj kod telefonem", "Scan the code with your phone")}
          </p>
          <p className="text-white/65">{t("Otworzy się ta strona z instrukcją dla Twojego telefonu: iPhone albo Android.", "This page opens with the steps for your phone, iPhone or Android.")}</p>
          {prompt ? (
            <button type="button" onClick={install} className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black">
              <MonitorSmartphone className="size-4" /> {t("Zainstaluj na tym komputerze", "Install on this computer")}
            </button>
          ) : null}
        </div>
      </div>
    );

  return (
    <div className="grid gap-8">
      {main}
      <div className="grid gap-4">
        <button type="button" className="w-fit text-sm text-white/50 underline underline-offset-4 hover:text-white" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t("Ukryj inne telefony", "Hide other phones") : t("Masz inny telefon? Pokaż wszystkie instrukcje", "Different phone? Show all instructions")}
        </button>
        {showAll ? (
          <div className="grid gap-10">
            <section className="grid gap-4">
              <h3 className="text-lg font-semibold text-white">iPhone (Safari)</h3>
              {iosSafari(true)}
              <p className="text-sm text-white/45">{t("Starszy iOS: zamiast ⋯ stuknij ikonę Udostępnij na dole ekranu.", "Older iOS: instead of ⋯ tap the Share icon at the bottom.")}</p>
            </section>
            <section className="grid gap-4">
              <h3 className="text-lg font-semibold text-white">Android</h3>
              {androidSteps}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
