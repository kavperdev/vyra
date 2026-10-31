import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { SetupNotice } from "@/components/auth/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">Witaj ponownie</p>
        <h1 className="display text-3xl">Zaloguj się</h1>
        <p className="text-sm text-muted">Trenerzy i zawodnicy logują się w tym samym miejscu. Po zalogowaniu trafisz do swojego panelu.</p>
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
