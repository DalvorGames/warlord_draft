import type { ReactNode } from "react";

/** Phone-first page frame: 390px column on phones, wider on desktop, full height. */
export function Screen({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <div className={`mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-ground text-bone md:max-w-[560px] ${className}`}>{children}</div>;
}
