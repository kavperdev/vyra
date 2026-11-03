import "server-only";

/** VAPID "subject" must be a mailto: or https: address; a bare e-mail breaks every send. */
export function vapidSubject(): string {
  const raw = (process.env.VAPID_SUBJECT ?? "").trim();
  if (/^(mailto:|https:\/\/)/.test(raw)) return raw;
  if (/^[^\s@]+@[^\s@]+$/.test(raw)) return `mailto:${raw}`;
  return "mailto:adamczykkacper18@gmail.com";
}
