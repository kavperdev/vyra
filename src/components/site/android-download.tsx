import { Apple, Download, Smartphone } from "lucide-react";
import release from "@/lib/android-release.json";
import { getT } from "@/lib/i18n/server";

/** Android: the real app (APK) straight from the website. iPhone: the App Store version is on its way. */
export async function AndroidDownload() {
  const { t } = await getT();
  const ready = !!release.version;
  const mb = release.bytes ? (release.bytes / 1024 / 1024).toFixed(1).replace(".", ",") : null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-4 rounded-2xl border border-[var(--accent)]/40 bg-[#0b0b0d] p-6">
        <div className="flex items-center gap-3">
          <Smartphone className="size-6 text-[var(--accent)]" />
          <p className="text-lg font-semibold text-white">Android</p>
        </div>
        <p className="text-[15px] leading-relaxed text-white/60">
          {t(
            "Prawdziwa aplikacja VYRA do zainstalowania prosto ze strony. Bez sklepu, bez konta Google Play.",
            "The real VYRA app, installed straight from the website. No store, no Google Play account.",
          )}
        </p>
        {ready ? (
          <>
            <a
              href="/download/vyra.apk"
              download="VYRA.apk"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 font-semibold text-white transition-transform active:scale-[0.97]"
            >
              <Download className="size-5" />
              {t("Pobierz aplikację", "Download the app")}
            </a>
            <p className="font-mono text-[12px] tracking-wider text-white/40">
              {t("Wersja", "Version")} {release.version}
              {mb ? ` · ${mb} MB` : ""}
            </p>
            <ol className="grid gap-1.5 text-[14px] leading-relaxed text-white/60">
              <li>1. {t("Stuknij „Pobierz aplikację” i otwórz pobrany plik.", "Tap “Download the app” and open the downloaded file.")}</li>
              <li>2. {t("Telefon zapyta o zgodę na instalację z tej przeglądarki. Zezwól i wróć.", "Your phone asks to allow installs from this browser. Allow it and go back.")}</li>
              <li>3. {t("Stuknij „Zainstaluj”. Gotowe, VYRA jest na ekranie głównym.", "Tap “Install”. Done, VYRA is on your home screen.")}</li>
            </ol>
          </>
        ) : (
          <p className="rounded-full border border-white/15 px-6 py-3.5 text-center font-semibold text-white/60">{t("Już za chwilę", "Coming in a moment")}</p>
        )}
      </div>
      <div className="grid content-start gap-4 rounded-2xl border border-white/10 bg-[#0b0b0d] p-6">
        <div className="flex items-center gap-3">
          <Apple className="size-6 text-white" />
          <p className="text-lg font-semibold text-white">iPhone</p>
        </div>
        <p className="text-[15px] leading-relaxed text-white/60">
          {t(
            "Wersja z App Store jest w drodze. Do tego czasu dodaj VYRA do ekranu początkowego: działa na pełnym ekranie i wysyła powiadomienia. Instrukcja jest niżej.",
            "The App Store version is on its way. Until then add VYRA to your home screen: it runs full screen and sends notifications. Steps below.",
          )}
        </p>
      </div>
    </div>
  );
}
