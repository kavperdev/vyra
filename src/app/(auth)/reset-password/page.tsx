import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Nowe hasło" };

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">Odzyskiwanie dostępu</p>
        <h1 className="display text-3xl">Ustaw nowe hasło</h1>
      </div>
      {user ? (
        <NewPasswordForm redirectTo={homeFor(user.profile.role)} />
      ) : (
        <div className="grid gap-3 text-sm text-muted">
          <p>Link do zmiany hasła wygasł albo został już użyty.</p>
          <Link href="/forgot-password" className="text-foreground underline underline-offset-4">
            Wyślij nowy link
          </Link>
        </div>
      )}
    </div>
  );
}
