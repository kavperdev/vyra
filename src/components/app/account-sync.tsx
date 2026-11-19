"use client";

import { useEffect } from "react";
import { pullAppState, pushAppState, type StateRow } from "@/lib/actions/app-state";
import { mergeLogs } from "@/lib/app/log";
import { STORE_EVENT, SYNCED, claimDevice, load, save, stamps } from "@/lib/app/store";

const UNION = ["vyra-start-plan", "vyra-course-done", "vyra-log-del", "vyra-badges-seen"];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const has = (k: string) => {
  try {
    return localStorage.getItem(k) != null;
  } catch {
    return false;
  }
};

/**
 * Signed-in runners: the phone and the account hold the same data. On start the account copy is merged in
 * (run log and tick lists are combined, everything else takes the newer side); after that every change
 * is sent up a moment later.
 */
export function AccountSync({ userId }: { userId: string | null }) {
  const signedIn = !!userId;
  useEffect(() => {
    // Another account (or nobody) used this phone before: their data goes before anything is merged.
    claimDevice(userId);
    if (!signedIn) return;
    let alive = true;
    let ready = false;
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (!ready || !pending.size) return;
      const s = stamps();
      const rows: StateRow[] = [...pending].map((key) => ({ key, value: load<unknown>(key, null), ts: s[key] ?? Date.now() }));
      pending.clear();
      pushAppState(rows).catch(() => rows.forEach((r) => pending.add(r.key)));
    };
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; local: boolean }>).detail;
      if (!d?.local || !(SYNCED as readonly string[]).includes(d.key)) return;
      pending.add(d.key);
      clearTimeout(timer);
      timer = setTimeout(flush, 1200);
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener(STORE_EVENT, onChange);
    document.addEventListener("visibilitychange", onHide);

    (async () => {
      const rows = await pullAppState().catch(() => null);
      if (!alive || !rows) return;
      const server = new Map(rows.map((r) => [r.key, r]));
      const s = stamps();
      const now = Date.now();
      let changed = false;
      const take = (key: string, value: unknown, ts: number) => {
        save(key, value, { ts, silent: true });
        changed = true;
      };

      for (const key of UNION) {
        const a = load<unknown>(key, []);
        const b = server.get(key)?.value;
        const merged = [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])];
        if (!same(merged, a)) take(key, merged, now);
        if (!same(merged, b) && merged.length) pending.add(key);
      }
      const del = load<string[]>("vyra-log-del", []);
      const log = mergeLogs(load<unknown>("vyra-log", []), server.get("vyra-log")?.value, del);
      if (!same(log, load<unknown>("vyra-log", []))) take("vyra-log", log, now);
      if (!same(log, server.get("vyra-log")?.value) && (log.length || server.has("vyra-log"))) pending.add("vyra-log");

      for (const key of SYNCED) {
        if (UNION.includes(key) || key === "vyra-log") continue;
        const srv = server.get(key);
        const mine = s[key] ?? 0;
        if (srv && srv.ts > mine) {
          if (!same(srv.value, load<unknown>(key, null))) take(key, srv.value, srv.ts);
        } else if (has(key) || mine) {
          if (!srv || !same(srv.value, load<unknown>(key, null))) pending.add(key);
        }
      }
      ready = true;
      if (changed) window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: { key: "*", local: false } }));
      flush();
    })();

    return () => {
      alive = false;
      clearTimeout(timer);
      flush();
      window.removeEventListener(STORE_EVENT, onChange);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [signedIn, userId]);
  return null;
}
