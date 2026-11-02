"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { openBillingPortal } from "@/lib/actions/checkout";
import { tl } from "@/lib/i18n/runtime";

export interface MembershipInfo {
  plan_name: string;
  kind: "monthly" | "once";
  status: "active" | "ended";
  access_until: string | null;
  stripe_customer: string | null;
}

/** Package and billing in the athlete's settings: card change and cancelling without writing to us. */
export function MembershipCard({ items }: { items: MembershipInfo[] }) {
  const [pending, start] = useTransition();
  if (!items.length) return null;
  const active = items.find((m) => m.status === "active");
  const shown = active ?? items[0];
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="grid gap-0.5">
          <p className="font-semibold">
            {tl("Pakiet", "Package")}: {shown.plan_name}
          </p>
          <p className="text-[13px] text-muted">
            {shown.status === "ended"
              ? tl("Zakończony. Kup nowy pakiet, żeby wrócić do prowadzenia.", "Ended. Buy a new package to resume coaching.")
              : shown.kind === "monthly"
                ? tl("Abonament miesięczny. Kartę zmienisz albo zrezygnujesz w panelu płatności; dostęp zostaje do końca opłaconego okresu.", "Monthly subscription. Change your card or cancel in the billing portal; access stays until the end of the paid period.")
                : shown.access_until
                  ? tl(`Dostęp do ${shown.access_until.split("-").reverse().join(".")}.`, `Access until ${shown.access_until}.`)
                  : ""}
          </p>
        </div>
        {shown.status === "ended" ? (
          <Button asChild variant="accent">
            <a href="/prowadzenie#pakiety">{tl("Wybierz pakiet", "Choose a package")}</a>
          </Button>
        ) : shown.kind === "monthly" && shown.stripe_customer ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await openBillingPortal();
                if (res.ok) window.location.assign(res.url);
                else toast.error(res.error);
              })
            }
          >
            {tl("Płatności i rezygnacja", "Billing and cancellation")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
