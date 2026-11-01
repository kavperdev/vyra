import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { AppToaster, ThemeProvider } from "@/components/theme-provider";
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
  title: { default: "VYRA", template: "%s · VYRA" },
  description: "VYRA — platforma treningowa dla trenera i zawodników. Elite is standard.",
  applicationName: "VYRA",
  icons: {
    icon: [{ url: "/branding/vyra-icon.svg", type: "image/svg+xml" }, { url: "/icon.png", sizes: "32x32" }],
    apple: "/apple-icon.png",
  },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "VYRA", statusBarStyle: "black-translucent" },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning className={`${archivo.variable} ${jetbrains.variable}`}>
      <body>
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
