import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInviteButton, InviteSignupForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLE_LABEL, type StaffRole } from "@/lib/types";

export const metadata: Metadata = { title: "Zaproszenie" };

interface InvitationInfo {
  email: string;
  full_name: string | null;
  coach_name: string;
  status: "pending" | "accepted" | "revoked";
  expired: boolean;
  staff_role: StaffRole | null;
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  const invite = (Array.isArray(data) ? data[0] : data) as InvitationInfo | undefined;
  const user = await getCurrentUser();

  if (!invite || invite.status !== "pending" || invite.expired) {
    return (
      <div className="grid gap-4">
        <p className="eyebrow">Zaproszenie</p>
        <h1 className="display text-3xl">Link jest nieaktualny</h1>
        <p className="text-sm text-muted">
          {invite?.status === "accepted"
            ? "To zaproszenie zostało już wykorzystane. Zaloguj się na swoje konto."
            : "Zaproszenie wygasło albo zostało anulowane. Poproś trenera o nowe."}
        </p>
        <Link href="/login" className="text-sm underline underline-offset-4">
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  if (invite.staff_role) {
    return (
      <div className="grid gap-8">
        <div className="grid gap-2">
          <p className="eyebrow">Zespół VYRA · {STAFF_ROLE_LABEL[invite.staff_role]}</p>
          <h1 className="display text-3xl">{invite.coach_name} zaprasza Cię do zespołu VYRA</h1>
          <p className="text-sm text-muted">
            Załóż konto, żeby pracować z zawodnikami VYRA w roli: {STAFF_ROLE_LABEL[invite.staff_role].toLowerCase()}. Zobaczysz
            zawodników, których przypisze Ci założyciel.
          </p>
        </div>
        {user ? (
          <p className="text-sm text-muted">
            Jesteś zalogowany(a) jako {user.email}. Do zespołu dołączasz nowym kontem: wyloguj się i otwórz link ponownie.
          </p>
        ) : (
          <InviteSignupForm token={token} email={invite.email} fullName={invite.full_name ?? ""} />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="eyebrow">Zaproszenie do zespołu</p>
        <h1 className="display text-3xl">{invite.coach_name} zaprasza Cię do VYRA</h1>
        <p className="text-sm text-muted">
          Po dołączeniu zobaczysz swoje treningi, zapiszesz wyniki i dostaniesz informację zwrotną od trenera. Twoje dane widzisz tylko Ty i Twój trener.
        </p>
      </div>
      {user ? (
        user.profile.role === "athlete" ? (
          user.email?.toLowerCase() === invite.email.toLowerCase() ? (
            <AcceptInviteButton token={token} />
          ) : (
            <p className="text-sm text-muted">
              Jesteś zalogowany(a) jako {user.email}, a zaproszenie jest dla {invite.email}. Wyloguj się i otwórz link ponownie.
            </p>
          )
        ) : (
          <p className="text-sm text-muted">Jesteś zalogowany(a) jako trener. Zaproszenie jest przeznaczone dla zawodnika.</p>
        )
      ) : (
        <InviteSignupForm token={token} email={invite.email} fullName={invite.full_name ?? ""} />
      )}
    </div>
  );
}
