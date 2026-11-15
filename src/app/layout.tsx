import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppToaster, ThemeProvider } from "@/components/theme-provider";
import { publicOrigin } from "@/lib/env";
import { LangProvider } from "@/lib/i18n/client";
import { getLang } from "@/lib/i18n/server";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin()),
  title: { default: "VYRA", template: "%s · VYRA" },
  description: "VYRA · społeczność biegaczy, którzy trenują z wiedzą. Elite is standard.",
  applicationName: "VYRA",
  icons: {
    // Google shows the favicon next to search results: it wants a square of 48 px or a multiple of 48.
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/branding/vyra-icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/branding/vyra-icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/branding/vyra-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/branding/vyra-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "VYRA",
    statusBarStyle: "black-translucent",
    // Launch screen of the installed iPhone app: black with the logo instead of a white flash.
    startupImage: [
      { url: "/branding/splash/splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1260x2736.png", media: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/branding/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/branding/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
  },
  openGraph: { siteName: "VYRA", locale: "pl_PL", type: "website" },
  // Google Search Console: paste the code from the "HTML tag" method into GOOGLE_SITE_VERIFICATION.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
  ],
  width: "device-width",
  initialScale: 1,
  // App-like: no pinch zoom (form fields are 16 px on phones, so nothing needs zooming).
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning className={`${archivo.variable} ${jetbrains.variable}`}>
      <body>
        <LangProvider lang={lang}>
          <ThemeProvider>
            {children}
            <AppToaster />
          </ThemeProvider>
        </LangProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
