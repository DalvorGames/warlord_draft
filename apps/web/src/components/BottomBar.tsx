import type { ReactNode } from "react";

/** Pinned bottom bar on the sunk ground with safe-area padding. */
export function BottomBar({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 z-30 mt-auto flex shrink-0 flex-col gap-2 border-t border-raised bg-sunk px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">{children}</div>;
}

/** Bone with ink text; disabled is raised with faint text and says why (v2 §2.1). */
export function PrimaryButton({ children, disabled, onClick, muted }: { children: ReactNode; disabled?: boolean; onClick?: () => void; muted?: boolean }) {
  const off = disabled || muted;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="box-border flex min-h-11 w-full items-center justify-center rounded-[3px] border px-4 py-[15px] text-base font-semibold"
      style={off ? { background: "var(--raised)", borderColor: "var(--rule-btn)", color: "var(--faint)" } : { background: "var(--bone)", borderColor: "var(--bone)", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}

export function OutlineButton({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const cls = "box-border flex min-h-11 w-full items-center justify-center rounded-[3px] border border-rule-btn bg-transparent px-4 py-[14px] text-[15px] font-medium text-bone no-underline";
  if (href) return <a href={href} className={cls}>{children}</a>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
