/**
 * Brand-site settings in one place. Fill in `email` and `instagram` when they exist:
 * the footer, the contact page and the privacy policy pick them up automatically.
 */
export const SITE = {
  name: "VYRA",
  tagline: "Elite is standard",
  controller: "Kacper Adamczyk",
  email: "",
  instagram: "",
} as const;

export const SITE_NAV = [
  { href: "/obozy", label: "Obozy" },
  { href: "/prowadzenie", label: "Prowadzenie" },
  { href: "/zespol", label: "Zespół" },
  { href: "/wiedza", label: "Wiedza" },
  { href: "/kontakt", label: "Kontakt" },
] as const;
