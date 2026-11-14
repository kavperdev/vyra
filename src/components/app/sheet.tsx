"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Renders into <body>: fixed layers must not sit inside animated (transformed) page content. */
export function Portal({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.body), []);
  return el ? createPortal(children, el) : null;
}

/** Bottom sheet: dims the page, slides up, scrolls inside when tall, locks the page behind. */
export function Sheet({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <Portal>
      <div className="app-native fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="app-sheet max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-[#121214] px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
          <div className="mb-1 flex items-center justify-between gap-3">
            <p className="text-[18px] font-semibold">{title}</p>
            <button type="button" aria-label="Zamknij" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.07] active:scale-90">
              <X className="size-4" />
            </button>
          </div>
          {sub ? <p className="mb-4 text-[13px] text-white/50">{sub}</p> : <div className="mb-3" />}
          {children}
        </div>
      </div>
    </Portal>
  );
}
