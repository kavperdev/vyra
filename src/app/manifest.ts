import type { MetadataRoute } from "next";

/** Lets athletes and staff add VYRA to the home screen and open it full screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VYRA",
    short_name: "VYRA",
    description: "Platforma treningowa VYRA: plan, wyniki, postępy i kontakt z trenerem.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "pl",
    icons: [
      { src: "/branding/vyra-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/branding/vyra-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
