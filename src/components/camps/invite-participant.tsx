"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { createInvitation } from "@/lib/actions/athletes";

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
        <Check className="size-4" /> Ma konto w aplikacji VYRA i widzi zakładkę „Mój obóz”.
      </p>
    );
  }
  if (!email) return <p className="text-sm text-muted">Dodaj e-mail uczestnika, żeby zaprosić go do aplikacji.</p>;
  if (link) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-muted">Wyślij ten link uczestnikowi. Po założeniu konta zobaczy swój obóz, informacje i raport.</p>
        <div className="flex gap-2">
          <Input readOnly value={link} aria-label="Link zaproszenia" onFocus={(e) => e.currentTarget.select()} className="num text-[13px]" />
          <Button
            variant="outline"
            size="icon"
            aria-label="Kopiuj link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                toast.error("Zaznacz link i skopiuj ręcznie.");
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
      <Smartphone className="size-4" /> Zaproś do aplikacji
    </Button>
  );
}
