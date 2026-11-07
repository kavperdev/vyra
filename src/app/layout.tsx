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
  appleWebApp: { capable: true, title: "VYRA", statusBarStyle: "black-translucent" },
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
