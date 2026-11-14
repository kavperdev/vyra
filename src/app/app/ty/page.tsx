import Link from "next/link";
import { Calculator, ChevronRight, Download, Globe, Mail, Shield, Trophy, User } from "lucide-react";
import { TrackLines } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Ty" };

function Row({ href, icon: Icon, label, sub }: { href: string; icon: typeof User; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 px-5 py-4 transition active:bg-white/5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.07]"><Icon className="size-5 text-white/80" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {sub ? <span className="block text-[13px] text-white/50">{sub}</span> : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-white/35" />
    </Link>
  );
}

export default async function AppYou() {
  const { t } = await getT();
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  return (
    <div className="app-rise grid grid-cols-1 gap-3.5">
      <div className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-1 pt-6">
        <TrackLines className="-right-24 -top-28 size-[380px] opacity-80" />
        <h1 className="display relative text-[40px] leading-[0.98] tracking-tight">{t("Ty", "You")}</h1>
      </div>
      {user ? (
        <section className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5">
          <p className="text-white/55">{t("Zalogowano jako", "Signed in as")}</p>
          <p className="mt-1 text-xl font-bold">{user.profile.full_name || user.profile.email}</p>
          <Link href="/panel" className="mt-4 block rounded-full bg-white py-3 text-center font-semibold text-black active:scale-[0.97]">
            {t("Mój plan i treningi", "My plan and sessions")}
          </Link>
        </section>
      ) : (
        <section className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5">
          <p className="text-xl font-bold">{t("Konto nie jest potrzebne", "No account needed")}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-white/60">
            {t(
              "Kurs, wiedza, Run Club i sklep działają bez logowania. Konto przyda się, gdy masz plan VYRA Method albo prowadzenie przez trenera.",
              "The course, journal, Run Club and shop work without signing in. You need an account once you have VYRA Method or coaching.",
            )}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/login" className="rounded-full bg-white py-3 text-center font-semibold text-black active:scale-[0.97]">
              {t("Zaloguj się", "Sign in")}
            </Link>
            <Link href="/signup" className="rounded-full border border-white/20 py-3 text-center font-semibold active:scale-[0.97]">
              {t("Załóż konto", "Sign up")}
            </Link>
          </div>
        </section>
      )}
      <section className="divide-y divide-white/[0.06] overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03]">
        <Row href="/wyzwania" icon={Trophy} label={t("Wyzwania", "Challenges")} sub={t("Biegaj z innymi i zbieraj kilometry", "Run with others and collect kilometres")} />
        <Row href="/kalkulator" icon={Calculator} label={t("Kalkulator tempa", "Pace calculator")} />
        <Row href="/pobierz" icon={Download} label={t("Dodaj VYRA do ekranu głównego", "Add VYRA to your home screen")} />
        <Row href="/" icon={Globe} label={t("Strona vyraathl.pl", "vyraathl.pl website")} />
        <Row href="/kontakt" icon={Mail} label={t("Kontakt", "Contact")} />
        <Row href="/polityka-prywatnosci" icon={Shield} label={t("Prywatność i regulamin", "Privacy and terms")} />
      </section>
    </div>
  );
}
