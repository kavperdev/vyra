import "server-only";

/** Strips what copying into Vercel often adds: quotes, spaces, line breaks, "=" padding, standard base64 signs. */
export function cleanVapidKey(v: string | undefined): string {
  return (v ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, "")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function vapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = cleanVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = cleanVapidKey(process.env.VAPID_PRIVATE_KEY);
  return publicKey && privateKey ? { publicKey, privateKey } : null;
}

/** VAPID "subject" must be a mailto: or https: address; a bare e-mail breaks every send. */
export function vapidSubject(): string {
  const raw = (process.env.VAPID_SUBJECT ?? "").trim().replace(/^["']+|["']+$/g, "").replace(/^mailto:\s*/i, "mailto:");
  if (/^mailto:[^\s@]+@[^\s@]+$/.test(raw) || /^https:\/\/\S+$/.test(raw)) return raw;
  if (/^[^\s@]+@[^\s@]+$/.test(raw)) return `mailto:${raw}`;
  return "mailto:kontakt@vyraathl.pl";
}

/** Plain-language reason why web-push refused the keys. */
export function vapidProblem(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/public key/i.test(m)) return "klucz publiczny (NEXT_PUBLIC_VAPID_PUBLIC_KEY) ma złą długość albo format";
  if (/private key/i.test(m)) return "klucz prywatny (VAPID_PRIVATE_KEY) ma złą długość albo format";
  if (/subject/i.test(m)) return "adres VAPID_SUBJECT jest nieprawidłowy";
  return m.slice(0, 120);
}
