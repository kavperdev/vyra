import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep visited screens in the client cache for a moment, so switching tabs back and forth is instant.
  // Every save still refreshes the data (revalidatePath / router.refresh).
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  // PDF reports read the brand font and logo from disk at runtime.
  outputFileTracingIncludes: {
    "/api/reports/**": ["./src/assets/fonts/**", "./public/branding/vyra-logo-black.png"],
    // Link preview images (opengraph-image) draw with the brand font over the hero photo.
    "/api/share/**": ["./src/assets/fonts/DejaVuSans-Bold.ttf", "./public/site/night-city.jpg"],
    "/opengraph-image": ["./src/assets/fonts/DejaVuSans-Bold.ttf", "./public/site/hero.jpg"],
    "/**/opengraph-image": ["./src/assets/fonts/DejaVuSans-Bold.ttf", "./public/site/hero.jpg"],
    "/**/opengraph-image*": ["./src/assets/fonts/DejaVuSans-Bold.ttf", "./public/site/hero.jpg"],
  },
  async headers() {
    return [
      {
        // The Android app: always the newest file, saved as an app, not opened as text.
        source: "/download/vyra.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: 'attachment; filename="VYRA.apk"' },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
