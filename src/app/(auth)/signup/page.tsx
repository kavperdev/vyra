import type { Metadata } from "next";
import { CoachSignupForm } from "@/components/auth/auth-forms";
import { SetupNotice } from "@/components/auth/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Konto trenera", "Coach account") };
}

export default async function SignupPage() {
  const { t } = await getT();
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">{t("Dla trenerów", "For coaches")}</p>
        <h1 className="display text-3xl">{t("Załóż konto trenera", "Create a coach account")}</h1>
        <p className="text-sm text-muted">
          {t("Zawodnicy nie zakładają kont tutaj. Dołączają z linku zaproszenia, który wyślesz im z panelu trenera.", "Athletes don’t sign up here. They join from an invitation link you send them from the coach dashboard.")}
        </p>
      </div>
      {isSupabaseConfigured() ? <CoachSignupForm /> : <SetupNotice />}
    </div>
  );
}
