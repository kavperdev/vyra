import { useEffect, useState } from "react";

/**
 * One store for everything the app keeps: the run log, plans, results, goals and course progress.
 * Every write goes through save(), which tells all open screens (they update at once) and marks the key
 * for the account sync, so a signed-in runner sees the same data on every phone.
 */

export const SYNCED = ["vyra-log", "vyra-log-del", "vyra-result", "vyra-start-plan", "vyra-start-on", "vyra-goal-plan", "vyra-me", "vyra-onboarded", "vyra-course-done", "vyra-swaps", "vyra-badges-seen", "vyra-week-goal", "vyra-nocna-level", "vyra-routines", "vyra-health", "vyra-season", "vyra-puls-memory", "vyra-strength-days"] as const;
export type SyncedKey = (typeof SYNCED)[number];
const TS = "vyra-ts"; // when each key last changed on this phone
export const STORE_EVENT = "vyra:store";

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function stamps(): Record<string, number> {
  return load<Record<string, number>>(TS, {});
}

/** Write a value (null removes it). `ts` is set by the sync when it takes a newer copy from the account. */
export function save(key: string, value: unknown, opts: { ts?: number; silent?: boolean } = {}) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    if ((SYNCED as readonly string[]).includes(key)) {
      const s = stamps();
      s[key] = opts.ts ?? Date.now();
      localStorage.setItem(TS, JSON.stringify(s));
    }
  } catch {
    /* private mode: the value lives until the tab closes */
  }
  if (!opts.silent) window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: { key, local: opts.ts == null } }));
}

/** React state bound to a key: re-renders when any screen (or the sync) changes it. */
export function useStore<T>(key: string, fallback: T): [T, (v: T) => void, boolean] {
  const [v, setV] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setV(load(key, fallback));
    setReady(true);
    const on = (e: Event) => {
      const k = (e as CustomEvent<{ key: string }>).detail?.key;
      if (k === key || k === "*") setV(load(key, fallback));
    };
    window.addEventListener(STORE_EVENT, on);
    return () => window.removeEventListener(STORE_EVENT, on);
    // fallback is a constant per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [v, (nv: T) => save(key, nv), ready];
}

/** Re-render on any store change (for views that combine several keys). */
export function useStoreTick(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = () => setN((x) => x + 1);
    window.addEventListener(STORE_EVENT, on);
    return () => window.removeEventListener(STORE_EVENT, on);
  }, []);
  return n;
}

/** Device settings that are not anyone's data: they stay when the account on this phone changes. */
const DEVICE_KEYS = new Set(["vyra-src", "vyra-kanal", "vyra-player-voice", "vyra-consent", "vyra-lang", "vyra-ios-nudge", "vyra-cookie-settings", "vyra-nudge-snooze", "vyra-place"]);
export const OWNER_KEY = "vyra-owner";

/**
 * Everything one person keeps on this phone (log, readiness, plans, chat with Puls...) is removed, so the
 * next person who signs in on the same phone starts clean and gets only their own account's copy.
 */
export function wipeAccountData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("vyra-") && !DEVICE_KEYS.has(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage blocked: nothing kept anyway */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: { key: "*", local: false } }));
}

/**
 * Makes sure the data on this phone belongs to this account (null = signed out). A different owner, or
 * signing out, clears it first. Data made before signing in (no owner yet) moves into the account.
 */
export function claimDevice(userId: string | null): boolean {
  let owner: string | null = null;
  try {
    owner = localStorage.getItem(OWNER_KEY);
  } catch {
    return false;
  }
  if (owner === userId) return false;
  const wipe = owner != null;
  if (wipe) wipeAccountData();
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* none */
  }
  return wipe;
}

export const todayWaw = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
