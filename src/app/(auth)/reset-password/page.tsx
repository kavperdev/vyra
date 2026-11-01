import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Nowe hasło", "New password") };
}

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  const { t } = await getT();
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">{t("Odzyskiwanie dostępu", "Account recovery")}</p>
        <h1 className="display text-3xl">{t("Ustaw nowe hasło", "Set a new password")}</h1>
      </div>
      {user ? (
        <NewPasswordForm redirectTo={homeFor(user.profile.role)} />
      ) : (
        <div className="grid gap-3 text-sm text-muted">
          <p>{t("Link do zmiany hasła wygasł albo został już użyty.", "The password link has expired or was already used.")}</p>
          <Link href="/forgot-password" className="text-foreground underline underline-offset-4">
            {t("Wyślij nowy link", "Send a new link")}
          </Link>
        </div>
      )}
    </div>
  );
}
