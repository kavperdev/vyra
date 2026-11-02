import "server-only";

/** Minimal Stripe REST client (no SDK): form-encoded requests with the secret key from STRIPE_SECRET_KEY. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Publishable key for paying on our own page (Embedded Checkout). Without it, buyers go to the Stripe page. */
export function stripePublishableKey(): string | null {
  const k = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return k && /^pk_(test|live)_/.test(k) ? k : null;
}

function encode(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) return [];
    if (typeof v === "object") return encode(v as Record<string, unknown>, key);
    return [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];
  });
}

export async function stripe<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Pinned so new account defaults can't change field names under us.
      "Stripe-Version": "2024-06-20",
    },
    body: body ? encode(body).join("&") : undefined,
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  client_secret?: string | null;
  subscription?: string | null;
  customer?: string | null;
  mode: "payment" | "subscription";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  amount_total: number | null;
  currency: string;
  customer_details: { email: string | null; name: string | null; phone: string | null } | null;
  metadata: Record<string, string>;
  total_details: { amount_discount: number } | null;
}
