"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster
      position="top-center"
      theme={resolvedTheme === "light" ? "light" : "dark"}
      richColors
      closeButton
      // Below the phone's status bar and notch in the installed app (otherwise the toast covers the clock).
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 10px)", left: "12px", right: "12px" }}
      offset={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
    />;
}
