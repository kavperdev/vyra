/** Labels for the Run Club short links (/rc/<kanal>) and for sources from the site's tracker. */
const LABELS: Record<string, string> = {
  ig: "Instagram",
  instagram: "Instagram",
  bio: "Instagram (bio)",
  fb: "Facebook",
  facebook: "Facebook",
  grupy: "Grupy na Facebooku",
  wydarzenie: "Wydarzenie na Facebooku",
  media: "Media",
  prasa: "Media",
  plakat: "Plakat",
  ulotka: "Ulotka",
  qr: "Kod QR",
  wa: "WhatsApp",
  sms: "SMS",
  znajomi: "Od znajomych",
  strava: "Strava",
  mail: "Mail",
  google: "Google",
  bezposrednio: "Wejście bezpośrednie",
};

export function channelLabel(src: string | null | undefined): string {
  if (!src) return "Nieznane";
  const key = src.replace(/^rc:/, "");
  return LABELS[key] ?? key;
}
