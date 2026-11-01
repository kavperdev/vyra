/**
 * Brand-site settings in one place. Fill in `email` and `instagram` when they exist:
 * the footer, the contact page and the privacy policy pick them up automatically.
 */
export interface SiteSettings {
  name: string;
  tagline: string;
  controller: string;
  /** Public contact e-mail. Empty string hides it everywhere. */
  email: string;
  /** Instagram handle, e.g. "@vyra.athl". Empty string hides it everywhere. */
  instagram: string;
}

export const SITE: SiteSettings = {
  name: "VYRA",
  tagline: "Elite is standard",
  controller: "Kacper Adamczyk",
  email: "",
  instagram: "@vyra.athl",
};

export const SITE_NAV = [
  { href: "/obozy", label: "Obozy", en: "Camps" },
  { href: "/prowadzenie", label: "Prowadzenie", en: "Coaching" },
  { href: "/run-club", label: "Run Club", en: "Run Club" },
  { href: "/zespol", label: "Zespół", en: "Team" },
  { href: "/wiedza", label: "Wiedza", en: "Journal" },
  { href: "/kalkulator", label: "Kalkulator", en: "Calculator" },
  { href: "/dla-firm", label: "Dla firm", en: "For companies" },
  { href: "/kontakt", label: "Kontakt", en: "Contact" },
] as const;
