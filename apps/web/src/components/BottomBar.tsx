import type { ReactNode } from "react";

/** Pinned bottom bar with safe-area padding (handoff §2). */
export function BottomBar({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-col gap-2.5 border-t border-rule bg-[#1a1813] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">{children}</div>;
}

export function PrimaryButton({ children, disabled, onClick, muted }: { children: ReactNode; disabled?: boolean; onClick?: () => void; muted?: boolean }) {
  const off = disabled || muted;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-center rounded-md border px-4 py-[15px] text-base font-semibold"
      style={off ? { background: "#26221a", borderColor: "var(--rule-btn)", color: "var(--faint)" } : { background: "var(--accent-fill)", borderColor: "var(--accent-fill)", color: "var(--accent-text)" }}
    >
      {children}
    </button>
  );
}
