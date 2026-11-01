"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription } from "@/lib/actions/push";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const DISMISS_KEY = "vyra.pushPrompt.dismissed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function usePush() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!publicKey;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator)) {
        if (!cancelled) setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (cancelled) return;
      if (!supported || !reg) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setState(sub ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (res.ok) {
        setState("on");
        toast.success(res.message ?? "Powiadomienia włączone");
      } else toast.error(res.error);
    } catch {
      toast.error("Nie udało się włączyć powiadomień na tym urządzeniu.");
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Powiadomienia wyłączone na tym urządzeniu.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}

/** Full control, for the settings page. */
export function PushSettings() {
  const { state, busy, enable, disable } = usePush();
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Bell className="size-4" />
        <p className="font-semibold">Powiadomienia na tym urządzeniu</p>
      </div>
      <p className="text-sm text-muted">
        Nowe i zmienione treningi, wykonane treningi, komentarze i informacje o obozie przyjdą jako powiadomienie, także gdy
        aplikacja jest zamknięta.
      </p>
      {state === "loading" ? null : state === "on" ? (
        <Button variant="outline" size="sm" className="w-fit" disabled={busy} onClick={disable}>
          <BellOff className="size-4" /> Wyłącz powiadomienia
        </Button>
      ) : state === "off" ? (
        <Button size="sm" className="w-fit" disabled={busy} onClick={enable}>
          <Bell className="size-4" /> Włącz powiadomienia
        </Button>
      ) : state === "ios-install" ? (
        <p className="text-sm">
          Na iPhonie powiadomienia działają w aplikacji z ekranu głównego: w Safari kliknij <b>Udostępnij</b> → <b>Do ekranu
          początkowego</b>, otwórz VYRA z ikony i wróć tutaj.
        </p>
      ) : state === "denied" ? (
        <p className="text-sm">Powiadomienia są zablokowane w ustawieniach przeglądarki lub telefonu. Odblokuj je tam dla tej strony.</p>
      ) : (
        <p className="text-sm text-muted">Ta przeglądarka nie obsługuje powiadomień.</p>
      )}
    </div>
  );
}

/** A one-time prompt at the top of the panel, until enabled or dismissed. */
export function PushPrompt() {
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden || state !== "off") return null;
  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable: hide for this visit only
    }
    setHidden(true);
  };
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
      <Bell className="mt-0.5 size-4 shrink-0" />
      <div className="grid flex-1 gap-2">
        <p className="text-sm font-semibold">Włącz powiadomienia</p>
        <p className="text-[13px] text-muted">Dowiesz się od razu o nowym treningu, komentarzu albo wykonanym treningu.</p>
        <Button size="sm" className="w-fit" disabled={busy} onClick={enable}>
          Włącz
        </Button>
      </div>
      <button type="button" aria-label="Zamknij" className="rounded-md p-1 text-muted hover:text-foreground" onClick={close}>
        <X className="size-4" />
      </button>
    </div>
  );
}
