/**
 * Brand-site settings in one place. Fill in `email` and `instagram` when they exist:
 * the footer, the contact page and the privacy policy pick them up automatically.
 */
export interface SiteSettings {
  name: string;
  tagline: string;
  controller: string;
  /** Seller's address for the terms of sale (street, postcode, city). Empty string hides the line. */
  address: string;
  /** Public contact e-mail. Empty string hides it everywhere. */
  email: string;
  /** Instagram handle, e.g. "@vyra.athl". Empty string hides it everywhere. */
  instagram: string;
}

export const SITE: SiteSettings = {
  name: "VYRA",
  tagline: "Elite is standard",
  controller: "Kacper Adamczyk",
  address: "ul. Leśna 11, 21-470 Krzywda",
  email: "kontakt@vyraathl.pl",
  instagram: "@vyra.athl",
};

/** Main navigation: Run Club first while the community is the main way in, coaching right after. */
export const SITE_NAV = [
  { href: "/run-club", label: "Run Club", en: "Run Club" },
  { href: "/wyzwania", label: "Wyzwania", en: "Challenges" },
  { href: "/prowadzenie", label: "Prowadzenie", en: "Coaching" },
  { href: "/zacznij-biegac", label: "Darmowy plan", en: "Free plan" },
  { href: "/wiedza", label: "Wiedza", en: "Journal" },
  { href: "/klub", label: "VYRA Club", en: "VYRA Club" },
] as const;

/** Secondary links: in the mobile menu and the footer, not in the desktop bar. */
export const SITE_NAV_MORE = [
  { href: "/obozy", label: "Obozy", en: "Camps" },
  { href: "/kalkulator", label: "Kalkulator", en: "Calculator" },
  { href: "/voucher", label: "Voucher na prezent", en: "Gift voucher" },
  { href: "/zespol", label: "Zespół", en: "Team" },
  { href: "/dla-firm", label: "Dla firm", en: "For companies" },
  { href: "/prasa", label: "Dla mediów", en: "Press" },
  { href: "/kontakt", label: "Kontakt", en: "Contact" },
] as const;
