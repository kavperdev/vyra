import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Reset hasła", "Reset password") };
}

export default async function ForgotPasswordPage() {
  const { t } = await getT();
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">{t("Odzyskiwanie dostępu", "Account recovery")}</p>
        <h1 className="display text-3xl">{t("Nie pamiętasz hasła?", "Forgot your password?")}</h1>
        <p className="text-sm text-muted">{t("Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.", "Enter your account email. We’ll send you a link to set a new password.")}</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
