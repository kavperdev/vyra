"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tl } from "@/lib/i18n/runtime";

/** The athlete's referral link with copy and the phone's share sheet. */
export function ReferralShare({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // the link stays visible to copy by hand
    }
  };
  return (
    // minmax(0,1fr): the long link must never widen the card on a phone.
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-2 px-3 py-3">
        <span className="num min-w-0 flex-1 truncate text-sm">{url}</span>
        <button type="button" onClick={copy} className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground">
          {copied ? <Check className="size-4 text-done" /> : <Copy className="size-4" />}
          {copied ? tl("Skopiowano", "Copied") : tl("Kopiuj", "Copy")}
        </button>
      </div>
      <Button
        type="button"
        variant="accent"
        size="lg"
        className="w-full sm:w-fit"
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title: "VYRA", text, url });
              return;
            } catch (e) {
              if ((e as Error).name === "AbortError") return;
            }
          }
          await copy();
        }}
      >
        <Share2 className="size-4" /> {tl("Wyślij znajomemu", "Send to a friend")}
      </Button>
    </div>
  );
}
