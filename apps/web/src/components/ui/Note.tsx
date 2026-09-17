"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** An inline note (v3 §2): opens under the tapped chip, label or line and pushes the rest down. */
export function InlineNote({ title, children, onDeep, more = true }: { title: string; children: ReactNode; onDeep?: boolean; more?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-[3px] px-2.5 py-2" style={{ background: onDeep ? "rgba(16,15,12,0.35)" : "var(--sunk)", borderLeft: "2px solid var(--rule-btn)", animation: "wdrise 200ms ease-out 1" }}>
      <span className="text-xs font-semibold text-bone">{title}</span>
      <span className="text-xs leading-snug text-dim">{children}</span>
      {more && (
        <Link href="/rules" className="text-[11px] no-underline" style={{ color: "var(--link)" }}>
          More in Rules ›
        </Link>
      )}
    </div>
  );
}

/** An info bubble (v3 §2): for a fixed board like the pitch, a floating card with a caret. */
export function InfoBubble({ title, children, onClose, more = true, style }: { title: string; children: ReactNode; onClose: () => void; more?: boolean; style?: React.CSSProperties }) {
  return (
    <div role="dialog" className="absolute z-20 flex w-[250px] flex-col gap-1 rounded-lg border border-rule-btn bg-raised px-3 py-2.5" style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.5)", ...style }}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-bone">{title}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 flex h-7 w-7 items-center justify-center border-0 bg-transparent text-dim">
          ×
        </button>
      </div>
      <span className="text-xs leading-snug text-dim">{children}</span>
      {more && (
        <Link href="/rules" className="text-[11px] no-underline" style={{ color: "var(--link)" }}>
          More in Rules ›
        </Link>
      )}
    </div>
  );
}

/** First-time hint (v3 §2): one line, rust left edge, an × to dismiss. */
export function Hint({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-[3px] bg-raised px-3 py-2 text-xs leading-snug text-dim" style={{ borderLeft: "2px solid var(--rust)" }}>
      <span className="grow">{children}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center border-0 bg-transparent text-dim">
        ×
      </button>
    </div>
  );
}

/** A mono label with the ⓘ ring that opens a note; the pair is a 44px button (v3 §2 "Stat label"). */
export function InfoLabel({ children, onClick, active, color = "var(--bone)" }: { children: ReactNode; onClick: () => void; active?: boolean; color?: string }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={active} className="-ml-1 flex min-h-8 items-center gap-1 border-0 bg-transparent px-1 font-mono text-[11px] tracking-[0.14em] uppercase" style={{ color, textDecoration: active ? "underline dotted" : "none", textUnderlineOffset: 3 }}>
      {children}
      <span aria-hidden="true" className="flex h-3 w-3 items-center justify-center rounded-full border font-mono text-[8px] normal-case tracking-normal" style={{ borderColor: "var(--faint)", color: "var(--faint)" }}>
        i
      </span>
    </button>
  );
}
