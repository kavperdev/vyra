import type { MetadataRoute } from "next";

/** Lets athletes and staff add VYRA to the home screen and open it full screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/panel",
    name: "VYRA",
    short_name: "VYRA",
    description: "Platforma treningowa VYRA: plan, wyniki, postępy i kontakt z trenerem.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["sports", "health", "fitness"],
    background_color: "#000000",
    theme_color: "#000000",
    lang: "pl",
    icons: [
      { src: "/branding/vyra-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/branding/vyra-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/branding/vyra-icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/branding/vyra-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Shown in the richer install dialog on Android and desktop Chrome.
    screenshots: [
      { src: "/branding/screens/dzis.jpg", sizes: "585x1266", type: "image/jpeg", form_factor: "narrow", label: "Trening na dziś" },
      { src: "/branding/screens/trening.jpg", sizes: "585x1266", type: "image/jpeg", form_factor: "narrow", label: "Plan treningu" },
      { src: "/branding/screens/zawodnicy.jpg", sizes: "585x1266", type: "image/jpeg", form_factor: "narrow", label: "Zawodnicy i postępy" },
      { src: "/branding/screens/klub-raport.jpg", sizes: "1600x783", type: "image/jpeg", form_factor: "wide", label: "Panel klubu" },
    ],
    shortcuts: [
      { name: "Panel", url: "/panel", icons: [{ src: "/branding/vyra-icon-96.png", sizes: "96x96" }] },
    ],
  };
}
