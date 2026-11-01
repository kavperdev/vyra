"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { createInvitation } from "@/lib/actions/athletes";
import { tl } from "@/lib/i18n/runtime";

/** Creates an athlete invitation for a camp participant; after sign-up the account is linked by e-mail. */
export function InviteParticipant({
  name,
  email,
  hasAccount,
  siteUrl,
}: {
  name: string;
  email: string | null;
  hasAccount: boolean;
  siteUrl: string;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (hasAccount) {
    return (
      <p className="flex items-center gap-2 text-sm text-done">
        <Check className="size-4" /> {tl("Ma konto w aplikacji VYRA i widzi zakładkę „Mój obóz”.", "Has a VYRA app account and sees the “My camp” tab.")}
      </p>
    );
  }
  if (!email) return <p className="text-sm text-muted">{tl("Dodaj e-mail uczestnika, żeby zaprosić go do aplikacji.", "Add the participant’s email to invite them to the app.")}</p>;
  if (link) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-muted">{tl("Wyślij ten link uczestnikowi. Po założeniu konta zobaczy swój obóz, informacje i raport.", "Send this link to the participant. After creating an account they’ll see their camp, information and report.")}</p>
        <div className="flex gap-2">
          <Input readOnly value={link} aria-label={tl("Link zaproszenia", "Invitation link")} onFocus={(e) => e.currentTarget.select()} className="num text-[13px]" />
          <Button
            variant="outline"
            size="icon"
            aria-label={tl("Kopiuj link", "Copy link")}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                toast.error(tl("Zaznacz link i skopiuj ręcznie.", "Select the link and copy it manually."));
              }
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-fit"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createInvitation({ email, full_name: name, message: "Zaproszenie na obóz VYRA" });
          if (res.ok && res.data) setLink(`${siteUrl}/invite/${res.data.token}`);
          else if (!res.ok) toast.error(res.error);
        })
      }
    >
      <Smartphone className="size-4" /> {tl("Zaproś do aplikacji", "Invite to the app")}
    </Button>
  );
}
