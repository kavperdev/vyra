import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { SetupNotice } from "@/components/auth/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Logowanie", "Sign in") };
}

export default async function LoginPage() {
  const { t } = await getT();
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">{t("Witaj ponownie", "Welcome back")}</p>
        <h1 className="display text-3xl">{t("Zaloguj się", "Sign in")}</h1>
        <p className="text-sm text-muted">{t("Jedno konto VYRA do aplikacji, planu i panelu trenera.", "Coaches and athletes sign in here. After signing in you’ll go straight to your dashboard.")}</p>
      </div>
      {isSupabaseConfigured() ? (
        <Suspense>
          <LoginForm />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </div>
  );
}
