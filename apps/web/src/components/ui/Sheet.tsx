"use client";

import { useEffect, type ReactNode } from "react";

/** A bottom sheet (v3 §2): slides up 260ms from 60px down; the screen behind dims to 30%. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 border-0 p-0" style={{ background: "rgba(16,15,12,0.7)" }} />
      <div className="relative mx-auto flex max-h-[calc(100dvh-60px)] w-full max-w-[480px] flex-col rounded-t-[14px] border-t border-rule-btn bg-panel md:max-w-[560px]" style={{ boxShadow: "0 -12px 40px rgba(0,0,0,0.55)", animation: "wdsheet 260ms ease-out 1" }}>
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-[38px] rounded-sm bg-rule-btn" />
        </div>
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-2">
            <div className="min-w-0">{title}</div>
            <button type="button" onClick={onClose} className="shrink-0 border-0 bg-transparent py-2 text-[15px] text-bone">
              Close
            </button>
          </div>
        )}
        <div className="min-h-0 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom,16px))]">{children}</div>
      </div>
    </div>
  );
}
