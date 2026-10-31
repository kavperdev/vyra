import type { Metadata } from "next";
import { CoachSignupForm } from "@/components/auth/auth-forms";
import { SetupNotice } from "@/components/auth/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Konto trenera" };

export default function SignupPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">Dla trenerów</p>
        <h1 className="display text-3xl">Załóż konto trenera</h1>
        <p className="text-sm text-muted">
          Zawodnicy nie zakładają kont tutaj. Dołączają z linku zaproszenia, który wyślesz im z panelu trenera.
        </p>
      </div>
      {isSupabaseConfigured() ? <CoachSignupForm /> : <SetupNotice />}
    </div>
  );
}
