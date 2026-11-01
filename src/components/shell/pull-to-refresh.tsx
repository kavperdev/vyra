"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72;
const MAX = 110;

/**
 * Pull down at the top of the screen to reload the data, like in a native app.
 * The page itself does not rubber-band (overscroll-behavior: none), so this replaces the browser gesture.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, start] = useTransition();
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || e.touches.length !== 1) return;
      const el = e.target as Element | null;
      if (el?.closest('[role="dialog"], [data-no-ptr], input, textarea, select')) return;
      startY.current = e.touches[0].clientY;
      setDragging(true);
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // Resistance: the further you pull, the slower it moves.
      const v = Math.min(MAX, dy * 0.5);
      pullRef.current = v;
      setPull(v);
    };
    const onEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      setDragging(false);
      const reached = pullRef.current >= THRESHOLD;
      pullRef.current = 0;
      setPull(0);
      if (reached) {
        if (navigator.vibrate) navigator.vibrate(10);
        start(() => router.refresh());
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const visible = pull > 4 || refreshing;
  const y = refreshing ? 56 : pull;
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      aria-hidden={!refreshing}
      role={refreshing ? "status" : undefined}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center lg:hidden"
      style={{
        transform: `translateY(calc(env(safe-area-inset-top) + ${y - 40}px))`,
        opacity: visible ? 1 : 0,
        transition: dragging ? "none" : "transform 0.25s ease, opacity 0.2s ease",
      }}
    >
      <span className="grid size-9 place-items-center rounded-full border border-border bg-background shadow-lg">
        <RefreshCw
          className={cn("size-4 text-accent", refreshing && "animate-spin")}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
        />
        {refreshing ? <span className="sr-only">Odświeżanie</span> : null}
      </span>
    </div>
  );
}
