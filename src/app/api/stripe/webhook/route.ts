import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordCheckout } from "@/lib/actions/checkout";
import { recordVoucher } from "@/lib/actions/vouchers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Verifies the Stripe-Signature header (HMAC-SHA256 of "timestamp.payload", 5-minute tolerance). */
function verify(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const signatures = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  return signatures.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

/**
 * Stripe → VYRA:
 * - checkout.session.completed / async_payment_succeeded: records the purchase and gives access,
 *   even if the buyer closed the browser before the thank-you page;
 * - customer.subscription.deleted: the subscription ended, so the athlete's access ends too.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const payload = await request.text();
  if (!verify(payload, request.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  const event = JSON.parse(payload) as { type: string; data: { object: { id: string; metadata?: Record<string, string> } } };
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      if (event.data.object.metadata?.kind === "voucher") await recordVoucher(event.data.object.id);
      else await recordCheckout(event.data.object.id);
    } else if (event.type === "customer.subscription.deleted") {
      const purchaseSecret = process.env.VYRA_PURCHASE_SECRET;
      if (purchaseSecret) {
        const supabase = await createClient();
        const { error } = await supabase.rpc("purchase_end", { p_secret: purchaseSecret, p_subscription: event.data.object.id });
        if (error) throw new Error(error.message);
      }
    }
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
