import type { CSSProperties, ReactNode } from "react";

/** Phone-first page frame: a 390px column on phones, a little wider on desktop, full height. */
export function Screen({ children, className = "", style }: { children?: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-ground text-bone md:max-w-[560px] ${className}`} style={style}>{children}</div>;
}
