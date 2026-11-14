import type { Metadata } from "next";
import { Bell, CalendarDays, Smartphone, Zap } from "lucide-react";
import { Faq, PageHero, Reveal, wrap } from "@/components/site/blocks";
import { InstallGuide } from "@/components/site/install-guide";
import { AndroidDownload } from "@/components/site/android-download";
import { POBIERZ_QR_SVG } from "@/components/site/pobierz-qr";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Pobierz aplikację", "Get the app"),
    description: t(
      "Zainstaluj VYRA na iPhonie albo Androidzie w 30 sekund: ikona na ekranie głównym, pełny ekran i powiadomienia o treningach.",
      "Install VYRA on iPhone or Android in 30 seconds: a home screen icon, full screen and training notifications.",
    ),
    alternates: { canonical: "/pobierz" },
  };
}

export default async function DownloadPage() {
  const { t } = await getT();
  const perks = [
    { icon: Smartphone, title: t("Ikona na ekranie", "Home screen icon"), body: t("Otwierasz VYRA jednym stuknięciem, na pełnym ekranie, bez paska przeglądarki.", "Open VYRA with one tap, full screen, no browser bar.") },
    { icon: Bell, title: t("Powiadomienia", "Notifications"), body: t("Nowy trening, zmiana godziny, wiadomość od trenera: dowiesz się od razu.", "New session, changed time, a message from your coach: you’ll know at once.") },
    { icon: CalendarDays, title: t("Plan zawsze pod ręką", "Your plan at hand"), body: t("Trening na dziś, wyniki i postępy w jednym miejscu, także na stadionie.", "Today’s session, results and progress in one place, at the track too.") },
    { icon: Zap, title: t("Zawsze aktualna", "Always up to date"), body: t("Nie trzeba niczego aktualizować. Nowe funkcje pojawiają się same.", "Nothing to update. New features just appear.") },
  ];
  return (
    <>
      <PageHero
        eyebrow={t("Aplikacja VYRA", "The VYRA app")}
        title={t("VYRA na Twoim telefonie", "VYRA on your phone")}
        lead={t(
          "Na Androidzie pobierasz aplikację prosto stąd. Na iPhonie dodajesz VYRA do ekranu początkowego, a wersja z App Store jest w drodze.",
          "On Android, download the app right here. On iPhone, add VYRA to your home screen; the App Store version is on its way.",
        )}
      />
      <section className={`${wrap} pb-20`}>
        <div className="mx-auto grid max-w-3xl gap-10">
          <AndroidDownload />
          <InstallGuide qr={<span className="block" dangerouslySetInnerHTML={{ __html: POBIERZ_QR_SVG }} />} />
        </div>
      </section>
      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-px py-20 sm:grid-cols-2 lg:grid-cols-4`}>
          {perks.map((p, i) => (
            <Reveal key={p.title} delay={i * 60} className="grid content-start gap-3 p-6">
              <p.icon className="size-6 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-white">{p.title}</h3>
              <p className="text-white/60">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="border-t border-white/10">
        <div className={`${wrap} mx-auto max-w-3xl py-20`}>
          <Faq
            items={[
              {
                q: t("Czy aplikacja na Androida jest bezpieczna? Telefon ostrzega przed nieznanym źródłem.", "Is the Android app safe? My phone warns about an unknown source."),
                a: t(
                  "Tak. To standardowe ostrzeżenie przy każdej aplikacji spoza Sklepu Play. Plik pobierasz tylko z vyraathl.pl i jest podpisany kluczem VYRA, więc nikt nie podmieni go po drodze. Po instalacji możesz wyłączyć zgodę na instalowanie z przeglądarki.",
                  "Yes. It’s the standard warning for any app from outside the Play Store. You only download it from vyraathl.pl and it’s signed with the VYRA key, so nobody can swap it on the way. After installing you can turn the browser install permission off again.",
                ),
              },
              {
                q: t("Kiedy VYRA będzie w App Store i Sklepie Play?", "When will VYRA be in the App Store and Play Store?"),
                a: t(
                  "Pracujemy nad tym. Do tego czasu na iPhonie dodaj VYRA do ekranu początkowego: ma własną ikonę, otwiera się na pełnym ekranie i wysyła powiadomienia.",
                  "We’re working on it. Until then, on iPhone add VYRA to your home screen: it has its own icon, opens full screen and sends notifications.",
                ),
              },
              {
                q: t("Nie widzę „Do ekranu początkowego” na iPhonie.", "I can’t see “Add to Home Screen” on my iPhone."),
                a: t(
                  "Upewnij się, że jesteś w Safari, a nie w przeglądarce Instagrama albo Messengera. W menu Udostępnij przewiń listę na sam dół. Czasem opcja kryje się pod „Edytuj czynności”.",
                  "Make sure you’re in Safari, not inside Instagram or Messenger. In the Share menu scroll the list to the very bottom; sometimes the option is under “Edit Actions”.",
                ),
              },
              {
                q: t("Nie dostaję powiadomień na iPhonie.", "I don’t get notifications on iPhone."),
                a: t(
                  "Na iPhonie powiadomienia działają tylko w zainstalowanej aplikacji (iOS 16.4 lub nowszy). Otwórz VYRA ikoną z ekranu głównego, wejdź w Ustawienia w aplikacji i włącz powiadomienia.",
                  "On iPhone, notifications only work in the installed app (iOS 16.4 or newer). Open VYRA from the home screen icon, go to Settings in the app and turn notifications on.",
                ),
              },
              {
                q: t("Czy muszę się logować za każdym razem?", "Do I have to log in every time?"),
                a: t("Nie. Logujesz się raz w zainstalowanej aplikacji i zostajesz zalogowany.", "No. Log in once in the installed app and you stay logged in."),
              },
              {
                q: t("Jak usunąć aplikację?", "How do I remove the app?"),
                a: t("Jak każdą inną: przytrzymaj ikonę i wybierz „Usuń”. Twoje dane w VYRA zostają na koncie.", "Like any other: hold the icon and choose “Remove”. Your VYRA data stays in your account."),
              },
            ]}
          />
        </div>
      </section>
    </>
  );
}
