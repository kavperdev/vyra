import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset hasła" };

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">Odzyskiwanie dostępu</p>
        <h1 className="display text-3xl">Nie pamiętasz hasła?</h1>
        <p className="text-sm text-muted">Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
