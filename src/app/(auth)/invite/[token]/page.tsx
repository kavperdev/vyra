import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInviteButton, InviteSignupForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { staffRoleLabel } from "@/lib/i18n/labels";
import type { StaffRole } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Zaproszenie", "Invitation") };
}

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
  const { t } = await getT();

  if (!invite || invite.status !== "pending" || invite.expired) {
    return (
      <div className="grid gap-4">
        <p className="eyebrow">{t("Zaproszenie", "Invitation")}</p>
        <h1 className="display text-3xl">{t("Link jest nieaktualny", "This link is no longer valid")}</h1>
        <p className="text-sm text-muted">
          {invite?.status === "accepted"
            ? t("To zaproszenie zostało już wykorzystane. Zaloguj się na swoje konto.", "This invitation has already been used. Sign in to your account.")
            : t("Zaproszenie wygasło albo zostało anulowane. Poproś trenera o nowe.", "The invitation has expired or was cancelled. Ask your coach for a new one.")}
        </p>
        <Link href="/login" className="text-sm underline underline-offset-4">
          {t("Przejdź do logowania", "Go to sign in")}
        </Link>
      </div>
    );
  }

  if (invite.staff_role) {
    return (
      <div className="grid gap-8">
        <div className="grid gap-2">
          <p className="eyebrow">{t("Zespół VYRA", "VYRA team")} · {staffRoleLabel(invite.staff_role, t)}</p>
          <h1 className="display text-3xl">{t(`${invite.coach_name} zaprasza Cię do zespołu VYRA`, `${invite.coach_name} invites you to the VYRA team`)}</h1>
          <p className="text-sm text-muted">
            {t(
              `Załóż konto, żeby pracować z zawodnikami VYRA w roli: ${staffRoleLabel(invite.staff_role, t).toLowerCase()}. Zobaczysz zawodników, których przypisze Ci założyciel.`,
              `Create an account to work with VYRA athletes as: ${staffRoleLabel(invite.staff_role, t).toLowerCase()}. You’ll see the athletes a founder assigns to you.`,
            )}
          </p>
        </div>
        {user ? (
          <p className="text-sm text-muted">
            {t(
              `Jesteś zalogowany(a) jako ${user.email}. Do zespołu dołączasz nowym kontem: wyloguj się i otwórz link ponownie.`,
              `You’re signed in as ${user.email}. You join the team with a new account: sign out and open the link again.`,
            )}
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
        <p className="eyebrow">{t("Zaproszenie do zespołu", "Team invitation")}</p>
        <h1 className="display text-3xl">{t(`${invite.coach_name} zaprasza Cię do VYRA`, `${invite.coach_name} invites you to VYRA`)}</h1>
        <p className="text-sm text-muted">
          {t(
            "Po dołączeniu zobaczysz swoje treningi, zapiszesz wyniki i dostaniesz informację zwrotną od trenera. Twoje dane widzisz tylko Ty i Twój trener.",
            "Once you join, you’ll see your sessions, log your results and get feedback from your coach. Only you and your coach can see your data.",
          )}
        </p>
      </div>
      {user ? (
        user.profile.role === "athlete" ? (
          user.email?.toLowerCase() === invite.email.toLowerCase() ? (
            <AcceptInviteButton token={token} />
          ) : (
            <p className="text-sm text-muted">
              {t(
                `Jesteś zalogowany(a) jako ${user.email}, a zaproszenie jest dla ${invite.email}. Wyloguj się i otwórz link ponownie.`,
                `You’re signed in as ${user.email}, but the invitation is for ${invite.email}. Sign out and open the link again.`,
              )}
            </p>
          )
        ) : (
          <p className="text-sm text-muted">{t("Jesteś zalogowany(a) jako trener. Zaproszenie jest przeznaczone dla zawodnika.", "You’re signed in as a coach. This invitation is for an athlete.")}</p>
        )
      ) : (
        <InviteSignupForm token={token} email={invite.email} fullName={invite.full_name ?? ""} />
      )}
    </div>
  );
}
