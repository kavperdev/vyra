import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The platform is private; only the brand site is meant for search engines.
        disallow: ["/coach", "/athlete", "/panel", "/api/", "/login", "/signup", "/invite", "/forgot-password", "/reset-password", "/auth/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
