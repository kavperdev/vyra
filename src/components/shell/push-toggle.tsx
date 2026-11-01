"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription } from "@/lib/actions/push";
import { useT } from "@/lib/i18n/client";

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
  const t = useT();
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
        toast.success(res.message ?? t("Powiadomienia włączone", "Notifications on"));
      } else toast.error(res.error);
    } catch {
      toast.error(t("Nie udało się włączyć powiadomień na tym urządzeniu.", "Couldn’t turn on notifications on this device."));
    } finally {
      setBusy(false);
    }
  }, [publicKey, t]);

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
      toast.success(t("Powiadomienia wyłączone na tym urządzeniu.", "Notifications turned off for this device."));
    } finally {
      setBusy(false);
    }
  }, [t]);

  return { state, busy, enable, disable };
}

/** Full control, for the settings page. */
export function PushSettings() {
  const t = useT();
  const { state, busy, enable, disable } = usePush();
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Bell className="size-4" />
        <p className="font-semibold">{t("Powiadomienia na tym urządzeniu", "Notifications on this device")}</p>
      </div>
      <p className="text-sm text-muted">
        {t("Nowe i zmienione treningi, wykonane treningi, komentarze i informacje o obozie przyjdą jako powiadomienie, także gdy aplikacja jest zamknięta.", "New and changed sessions, completed sessions, comments and camp updates arrive as notifications, even when the app is closed.")}
      </p>
      {state === "loading" ? null : state === "on" ? (
        <Button variant="outline" size="sm" className="w-fit" disabled={busy} onClick={disable}>
          <BellOff className="size-4" /> {t("Wyłącz powiadomienia", "Turn off notifications")}
        </Button>
      ) : state === "off" ? (
        <Button size="sm" className="w-fit" disabled={busy} onClick={enable}>
          <Bell className="size-4" /> {t("Włącz powiadomienia", "Turn on notifications")}
        </Button>
      ) : state === "ios-install" ? (
        <p className="text-sm">
          {t(
            "Na iPhonie powiadomienia działają w aplikacji z ekranu głównego: w Safari kliknij Udostępnij → Do ekranu początkowego, otwórz VYRA z ikony i wróć tutaj.",
            "On iPhone, notifications work in the app on your home screen: in Safari tap Share → Add to Home Screen, open VYRA from the icon and come back here.",
          )}
        </p>
      ) : state === "denied" ? (
        <p className="text-sm">{t("Powiadomienia są zablokowane w ustawieniach przeglądarki lub telefonu. Odblokuj je tam dla tej strony.", "Notifications are blocked in your browser or phone settings. Allow them there for this site.")}</p>
      ) : (
        <p className="text-sm text-muted">{t("Ta przeglądarka nie obsługuje powiadomień.", "This browser doesn’t support notifications.")}</p>
      )}
    </div>
  );
}

/** A one-time prompt at the top of the panel, until enabled or dismissed. */
export function PushPrompt() {
  const t = useT();
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
        <p className="text-sm font-semibold">{t("Włącz powiadomienia", "Turn on notifications")}</p>
        <p className="text-[13px] text-muted">{t("Dowiesz się od razu o nowym treningu, komentarzu albo wykonanym treningu.", "Hear right away about a new session, a comment or a completed session.")}</p>
        <Button size="sm" className="w-fit" disabled={busy} onClick={enable}>
          {t("Włącz", "Turn on")}
        </Button>
      </div>
      <button type="button" aria-label={t("Zamknij", "Close")} className="rounded-md p-1 text-muted hover:text-foreground" onClick={close}>
        <X className="size-4" />
      </button>
    </div>
  );
}
