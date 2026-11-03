import "server-only";
import { stripe } from "@/lib/stripe";

/** Friend's discount on the first payment and the referrer's reward. */
export const REFERRAL_DISCOUNT_PCT = 15;
export const REFERRAL_CREDIT_PLN = 50;
export const REFERRAL_DAYS = 14;
const COUPON_ID = "VYRA-POLECENIE";

/** Referral code from the visitor's source cookie ("pol:kacper-7k2"). */
export function referralFromSource(src: string | null): string | null {
  if (!src?.startsWith("pol:")) return null;
  const code = src.slice(4);
  return /^[a-z0-9-]{3,40}$/.test(code) ? code : null;
}

/** The Stripe coupon for referred buyers, created on first use. Null if Stripe refuses. */
export async function referralCoupon(): Promise<string | null> {
  try {
    await stripe("GET", `coupons/${COUPON_ID}`);
    return COUPON_ID;
  } catch {
    try {
      await stripe("POST", "coupons", { id: COUPON_ID, name: "Polecenie VYRA", percent_off: REFERRAL_DISCOUNT_PCT, duration: "once" });
      return COUPON_ID;
    } catch (e) {
      console.error("[referral coupon]", e);
      return null;
    }
  }
}

/** Subscription referrer: money off the next invoice (Stripe customer balance). */
export async function creditReferrer(customer: string, buyerEmail: string) {
  try {
    await stripe("POST", `customers/${customer}/balance_transactions`, {
      amount: -REFERRAL_CREDIT_PLN * 100,
      currency: "pln",
      description: `Polecenie VYRA: ${buyerEmail}`.slice(0, 350),
    });
  } catch (e) {
    console.error("[referral credit]", e);
  }
}
